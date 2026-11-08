import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { useTextStyles } from '../components/Card';
import { PageEditor } from '../components/PageEditor';
import { RoundButton } from '../components/ui';
import type { StringKey } from '../i18n/strings';
import { useT } from '../settings/SettingsContext';
import { fonts, makeStyles, PAGE_X, radius, spacing } from '../theme';
import type { PageInput } from '../types';
import { MAX_PAGES } from '../utils/pickers';
import { splitBookSpread } from '../utils/splitBook';

type Mode = 'auto' | 'manual' | 'book';
const MODES: Mode[] = ['auto', 'manual', 'book'];

const ORANGE = '#F26D45';
const ORANGE_DARK = '#D4512B';

type Props = {
  initialPages: PageInput[];
  onCancel: () => void;
  onDone: (pages: PageInput[]) => void;
};

export function ScanScreen({ initialPages, onCancel, onDone }: Props) {
  const t = useT();
  const text = useTextStyles();
  const permissionStyles = usePermissionStyles();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [pages, setPages] = useState<PageInput[]>(initialPages);
  const [mode, setMode] = useState<Mode>('auto');
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  if (!permission) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={permissionStyles.screen}>
        <View style={permissionStyles.icon}>
          <Feather name="camera" size={30} color={ORANGE} />
        </View>
        <Text style={[text.display, styles.centerText]}>{t('scan.permissionTitle')}</Text>
        <Text style={[text.body, styles.centerText]}>{t('scan.permissionText')}</Text>
        {permission.canAskAgain ? (
          <Button title={t('scan.allow')} icon="camera" onPress={requestPermission} />
        ) : (
          <Text style={[text.small, styles.centerText]}>{t('scan.permissionSettings')}</Text>
        )}
        <Button title={t('scan.goBack')} variant="ghost" onPress={onCancel} />
      </SafeAreaView>
    );
  }

  const full = pages.length >= MAX_PAGES;

  const capture = async () => {
    if (!cameraRef.current || busy || full) return;
    if (mode === 'book' && pages.length > MAX_PAGES - 2) {
      Alert.alert(t('scan.bookNoRoom'));
      return;
    }
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (!photo?.uri) return;

      if (mode === 'book') {
        const halves = await splitBookSpread(photo.uri, photo.width, photo.height, pages.length);
        setPages((prev) => [...prev, ...halves]);
        return;
      }

      const page: PageInput = { uri: photo.uri, mimeType: 'image/jpeg', name: `pagina-${pages.length + 1}.jpg` };
      setPages((prev) => [...prev, page]);
      // Modo manual: abrimos el editor para recortar la página recién capturada
      if (mode === 'manual') setEditing(pages.length);
    } catch (err) {
      console.warn('[Clarify] error al capturar:', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const counter = Math.min(pages.length + 1, MAX_PAGES);
  const lastTwo = pages.slice(-2);

  return (
    <View style={styles.screen}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        onCameraReady={() => setReady(true)}
      />
      {/* Oscurecemos arriba y abajo para que el marco destaque */}
      <LinearGradient
        colors={['rgba(20,16,14,0.85)', 'rgba(20,16,14,0.15)', 'rgba(20,16,14,0.15)', 'rgba(20,16,14,0.9)']}
        locations={[0, 0.22, 0.6, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <RoundButton icon="x" label={t('common.close')} variant="glass" onPress={onCancel} />
        <View style={styles.counter}>
          <View style={styles.counterDot} />
          <Text style={styles.counterText}>{t('scan.pageOf', { n: counter, max: MAX_PAGES })}</Text>
        </View>
        <RoundButton icon="zap" label="torch" variant={torch ? 'light' : 'glass'} onPress={() => setTorch((v) => !v)}>
          <Feather name={torch ? 'zap' : 'zap-off'} size={20} color={torch ? '#1B1A19' : '#FFFFFF'} />
        </RoundButton>
      </View>

      {/* Marco guía: en modo libro es horizontal y marca el lomo */}
      <View style={styles.frameArea} pointerEvents="none">
        <View style={[styles.frame, mode === 'book' ? styles.frameBook : styles.framePage]}>
          {mode === 'book' && <View style={styles.spine} />}
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <View key={corner} style={[styles.handle, styles[corner]]} />
          ))}
        </View>
        <View style={styles.hintPill}>
          <Feather name={mode === 'book' ? 'book-open' : mode === 'manual' ? 'crop' : 'maximize'} size={15} color={ORANGE} />
          <Text style={styles.hintText}>{t(`scan.modeHint.${mode}` as StringKey)}</Text>
        </View>
      </View>

      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 12) + spacing.sm }]}>
        <View style={styles.modes}>
          {MODES.map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.mode, mode === m && styles.modeActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: mode === m }}
            >
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{t(`scan.mode.${m}` as StringKey)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.controls}>
          {/* Miniaturas apiladas con contador: llevan a revisar las páginas */}
          <Pressable
            style={styles.side}
            onPress={() => pages.length > 0 && onDone(pages)}
            disabled={pages.length === 0}
            accessibilityLabel={t('review.title')}
          >
            {pages.length > 0 ? (
              <View style={styles.stack}>
                {lastTwo.length > 1 && <Image source={{ uri: lastTwo[0].uri }} style={[styles.stackCard, styles.stackBack]} />}
                <Image source={{ uri: lastTwo[lastTwo.length - 1].uri }} style={[styles.stackCard, styles.stackFront]} />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pages.length}</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.stackCard, styles.stackEmpty]}>
                <Feather name="layers" size={20} color="rgba(255,255,255,0.4)" />
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={capture}
            disabled={!ready || busy || full}
        </View>
      </View>
    </View>
  );
}

const usePermissionStyles = makeStyles((c) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background, padding: PAGE_X, gap: spacing.lg, justifyContent: 'center' },
    icon: {
      alignSelf: 'center',
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }),
);

const HANDLE = 22;
// El visor de la cámara siempre es oscuro
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#141210' },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PAGE_X },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(20,16,14,0.7)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 40,
  },
  counterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE },
  counterText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 14 },
  frameArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  frame: { borderWidth: 2, borderColor: ORANGE, borderRadius: 6 },
  framePage: { width: '72%', aspectRatio: 0.72 },
  frameBook: { width: '86%', aspectRatio: 1.35 },
  spine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 0,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(242,109,69,0.8)',
  },
  handle: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: ORANGE,
  },
  tl: { left: -HANDLE / 2, top: -HANDLE / 2 },
  tr: { right: -HANDLE / 2, top: -HANDLE / 2 },
  bl: { left: -HANDLE / 2, bottom: -HANDLE / 2 },
  br: { right: -HANDLE / 2, bottom: -HANDLE / 2 },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(20,16,14,0.75)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 42,
  },
  hintText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 14 },
  panel: {
    backgroundColor: '#141210',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: spacing.lg,
    paddingHorizontal: PAGE_X,
    gap: spacing.lg,
  },
  modes: {
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.pill,
    padding: 4,
  },
  mode: { paddingHorizontal: spacing.xl, height: 40, borderRadius: radius.pill, justifyContent: 'center' },
  modeActive: { backgroundColor: '#FFFFFF' },
  modeText: { color: 'rgba(255,255,255,0.75)', fontFamily: fonts.semibold, fontSize: 14 },
  modeTextActive: { color: '#1B1A19', fontFamily: fonts.bold },
  controls: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1 },
  stack: { width: 70, height: 76, justifyContent: 'center' },
  stackCard: { width: 52, height: 66, borderRadius: 8, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#2A2522' },
  stackBack: { position: 'absolute', left: 0, top: 6, transform: [{ rotate: '-9deg' }], opacity: 0.85 },
  stackFront: { position: 'absolute', left: 10, top: 4, transform: [{ rotate: '3deg' }] },
  stackEmpty: { alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.25)', borderStyle: 'dashed' },
  badge: {
    position: 'absolute',
    right: 0,
    top: -2,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: ORANGE_DARK,
    borderWidth: 2,
    borderColor: '#141210',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 12 },
  shutter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ORANGE_DARK,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    height: 54,
  },
  doneText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 16 },
  footer: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontFamily: fonts.medium, fontSize: 13 },
});

