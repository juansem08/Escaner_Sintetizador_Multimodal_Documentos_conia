import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../settings/SettingsContext';
import { fonts, radius, spacing } from '../theme';
import type { PageInput } from '../types';

type Rect = { x: number; y: number; w: number; h: number };
type Size = { w: number; h: number };
type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'move';

const MIN_SIZE = 60;
const HANDLE = 30;
const ACCENT = '#F26D45';

type Props = {
  page: PageInput;
  onCancel: () => void;
  onSave: (page: PageInput) => void;
};

/** Editor a pantalla completa para recortar y girar una página antes de analizarla */
export function PageEditor({ page, onCancel, onSave }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [uri, setUri] = useState(page.uri);
  const [imageSize, setImageSize] = useState<Size | null>(null);
  const [box, setBox] = useState<Size | null>(null);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);

  // Tamaño real de la imagen (en píxeles)
  useEffect(() => {
    Image.getSize(
      uri,
      (w, h) => setImageSize({ w, h }),
      () => setImageSize(null),
    );
  }, [uri]);

  // Rectángulo donde se dibuja la imagen dentro del contenedor (modo "contain")
  const display = useMemo(() => {
    if (!imageSize || !box) return null;
    const scale = Math.min(box.w / imageSize.w, box.h / imageSize.h);
    const w = imageSize.w * scale;
    const h = imageSize.h * scale;
    return { w, h, x: (box.w - w) / 2, y: (box.h - h) / 2, scale };
  }, [imageSize, box]);

  const fullRect = (d: { w: number; h: number }): Rect => ({ x: 0, y: 0, w: d.w, h: d.h });

  useEffect(() => {
    if (display) setCrop(fullRect(display));
  }, [display]);

  // Refs para que los PanResponder lean siempre los valores actuales
  const cropRef = useRef<Rect | null>(null);
  const boundsRef = useRef<Size>({ w: 0, h: 0 });
  cropRef.current = crop;
  boundsRef.current = display ? { w: display.w, h: display.h } : { w: 0, h: 0 };

  const responders = useMemo(() => {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const make = (handle: Handle) => {
      let start: Rect = { x: 0, y: 0, w: 0, h: 0 };
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          if (cropRef.current) start = cropRef.current;
        },
        onPanResponderMove: (_e, g) => {
          const b = boundsRef.current;
          const right = start.x + start.w;
          const bottom = start.y + start.h;
          let { x, y, w, h } = start;

          if (handle === 'move') {
            x = clamp(start.x + g.dx, 0, b.w - start.w);
            y = clamp(start.y + g.dy, 0, b.h - start.h);
          } else {
            if (handle === 'tl' || handle === 'bl') {
              x = clamp(start.x + g.dx, 0, right - MIN_SIZE);
              w = right - x;
            } else {
              w = clamp(start.w + g.dx, MIN_SIZE, b.w - start.x);
            }
            if (handle === 'tl' || handle === 'tr') {
              y = clamp(start.y + g.dy, 0, bottom - MIN_SIZE);
              h = bottom - y;
            } else {
              h = clamp(start.h + g.dy, MIN_SIZE, b.h - start.y);
            }
          }
          setCrop({ x, y, w, h });
        },
      });
    };
    return { tl: make('tl'), tr: make('tr'), bl: make('bl'), br: make('br'), move: make('move') };
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ w: width, h: height });
  };

  const fail = (err: unknown) => {
    console.warn('[editor]', err);

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.screen, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={12} disabled={busy}>
            <Text style={styles.headerText}>{t('common.cancel')}</Text>
          </Pressable>
          <Text style={styles.title}>{t('editor.title')}</Text>
          <Pressable onPress={apply} hitSlop={12} disabled={busy || !crop}>
            <Text style={[styles.headerText, styles.apply]}>{t('editor.apply')}</Text>
          </Pressable>
        </View>

        <View style={styles.canvas} onLayout={onLayout}>
          {display && crop ? (
            <View style={{ position: 'absolute', left: display.x, top: display.y, width: display.w, height: display.h }}>
              <Image source={{ uri }} style={{ width: display.w, height: display.h }} />

              {/* Zonas oscurecidas fuera del recorte */}
              <View style={[styles.shade, { left: 0, top: 0, right: 0, height: crop.y }]} />
              <View style={[styles.shade, { left: 0, top: crop.y + crop.h, right: 0, bottom: 0 }]} />
              <View style={[styles.shade, { left: 0, top: crop.y, width: crop.x, height: crop.h }]} />
              <View style={[styles.shade, { left: crop.x + crop.w, top: crop.y, right: 0, height: crop.h }]} />

              <View
                {...responders.move.panHandlers}
                style={[styles.cropBox, { left: crop.x, top: crop.y, width: crop.w, height: crop.h }]}
              >
                <View style={[styles.grid, { left: '33.3%' }]} />
                <View style={[styles.grid, { left: '66.6%' }]} />
                <View style={[styles.gridH, { top: '33.3%' }]} />
                <View style={[styles.gridH, { top: '66.6%' }]} />
              </View>

              {(['tl', 'tr', 'bl', 'br'] as const).map((h) => (
                <View
                  key={h}
                  {...responders[h].panHandlers}
                  hitSlop={14}
                  style={[
                    styles.handle,
                    {
                      left: (h === 'tl' || h === 'bl' ? crop.x : crop.x + crop.w) - HANDLE / 2,
                      top: (h === 'tl' || h === 'tr' ? crop.y : crop.y + crop.h) - HANDLE / 2,
                    },
                  ]}
                />
              ))}
            </View>
          ) : (
            <ActivityIndicator color="#fff" />
          )}
          {busy && (
            <View style={styles.busy}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
        </View>

        <Text style={styles.hint}>{t('editor.hint')}</Text>
        <View style={styles.toolbar}>
          <ToolButton label={t('editor.rotateLeft')} onPress={() => rotate(-90)} disabled={busy} />
          <ToolButton label={t('editor.reset')} onPress={() => display && setCrop(fullRect(display))} disabled={busy} />
          <ToolButton label={t('editor.rotateRight')} onPress={() => rotate(90)} disabled={busy} />
        </View>
      </View>
    </Modal>
  );
}

function ToolButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.tool, (pressed || disabled) && { opacity: 0.6 }]}
    >
      <Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
}

// El editor siempre es oscuro, como el visor de la cámara
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { color: '#fff', fontSize: 17, fontFamily: fonts.bold },
  headerText: { color: '#fff', fontSize: 16, fontFamily: fonts.medium },
  apply: { color: ACCENT, fontFamily: fonts.bold },
  canvas: { flex: 1, margin: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  shade: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  cropBox: { position: 'absolute', borderWidth: 2, borderColor: ACCENT },
  grid: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.5)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.5)' },
  handle: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: ACCENT,
  },
  busy: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  hint: { color: 'rgba(255,255,255,0.75)', textAlign: 'center', fontSize: 13, marginBottom: spacing.md, fontFamily: fonts.medium },
  toolbar: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  tool: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  toolText: { color: '#fff', fontFamily: fonts.semibold },
});
