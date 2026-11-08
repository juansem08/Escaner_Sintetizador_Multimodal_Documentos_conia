import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { glowShadow, gradients, makeStyles, radius, spacing, type, useColors, type Colors } from '../theme';
import type { FeatherName } from './Button';

// ---------------------------------------------------------------------------
// Botón redondo (atrás, compartir, ajustes…)
// ---------------------------------------------------------------------------

type RoundProps = {
  icon: FeatherName;
  onPress: () => void;
  label: string;
  variant?: 'light' | 'ink' | 'glass';
  size?: number;
  disabled?: boolean;
  children?: ReactNode;
};

export function RoundButton({ icon, onPress, label, variant = 'light', size = 52, disabled, children }: RoundProps) {
  const c = useColors();
  const bg = variant === 'ink' ? c.ink : variant === 'glass' ? 'rgba(255,255,255,0.12)' : c.surface;
  const fg = variant === 'ink' ? c.onInk : variant === 'glass' ? '#FFFFFF' : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: variant === 'glass' ? StyleSheet.hairlineWidth : 0,
          borderColor: 'rgba(255,255,255,0.18)',
        },
        pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
        disabled && { opacity: 0.4 },
      ]}
    >
      {children ?? <Feather name={icon} size={size * 0.4} color={fg} />}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Etiquetas (Recibo, Factura, 1 pág., Original…)
// ---------------------------------------------------------------------------

export type Tone = 'peach' | 'mint' | 'lavender' | 'sun' | 'stone' | 'ink' | 'light' | 'glass';

export function toneColors(c: Colors, tone: Tone): { bg: string; fg: string } {
  switch (tone) {
    case 'peach':
      return { bg: c.accentSoft, fg: c.accentText };
    case 'mint':
      return { bg: c.mintSoft, fg: c.mintText };
    case 'lavender':
      return { bg: c.lavenderSoft, fg: c.lavenderText };
    case 'sun':
      return { bg: c.sunSoft, fg: c.sunText };
    case 'ink':
      return { bg: c.ink, fg: c.onInk };
    case 'light':
      return { bg: c.surface, fg: c.text };
    case 'glass':
      return { bg: 'rgba(255,255,255,0.22)', fg: '#FFFFFF' };
    default:
      return { bg: c.surfaceMuted, fg: c.textMuted };
  }
}

type PillProps = {
  label: string;
  tone?: Tone;
  icon?: FeatherName;
  trailingIcon?: FeatherName;
  onPress?: () => void;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

export function Pill({ label, tone = 'stone', icon, trailingIcon, onPress, size = 'md', style }: PillProps) {
  const c = useColors();
  const { bg, fg } = toneColors(c, tone);
  const small = size === 'sm';
  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingHorizontal: small ? 10 : 14,
          paddingVertical: small ? 4 : 8,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={small ? 11 : 14} color={fg} /> : null}
      <Text style={[small ? styles.pillSm : styles.pillMd, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      {trailingIcon ? <Feather name={trailingIcon} size={small ? 11 : 14} color={fg} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.8 }}>
      {content}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta con degradado naranja de marca
// ---------------------------------------------------------------------------

export function GradientCard({
  children,
  style,
  colors = gradients.brand,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  colors?: readonly [string, string, ...string[]];
}) {
  return (
    <View style={[glowShadow, { borderRadius: radius.xl }, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.xl, padding: spacing.xl, overflow: 'hidden' }}
      >
        {/* Brillo suave en la esquina superior derecha */}
        <View pointerEvents="none" style={styles.glow} />
        {children}
      </LinearGradient>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Cabecera de pantalla: botón izquierdo, título centrado, botón derecho
// ---------------------------------------------------------------------------

export function ScreenHeader({
  left,
  right,
  title,
  subtitle,
  light,
}: {
  left?: ReactNode;
  right?: ReactNode;
  title?: string;
  subtitle?: string;
  /** Texto blanco (para fondos oscuros) */
  light?: boolean;
}) {
  const c = useColors();
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>{left}</View>
      <View style={styles.headerCenter}>
        {title ? (
          <Text
            style={[subtitle ? type.bodyStrong : type.label, { color: light ? '#FFFFFF' : subtitle ? c.text : c.textMuted }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[type.small, { color: light ? 'rgba(255,255,255,0.65)' : c.textMuted, fontSize: 12 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Título de sección con acción opcional ("Recientes · Ver todo")
// ---------------------------------------------------------------------------


const styles = StyleSheet.create({
  pillSm: { ...type.label, fontSize: 12, lineHeight: 16 },
  pillMd: { ...type.label, fontSize: 13, lineHeight: 17 },
  glow: {
    position: 'absolute',
    right: -60,
    top: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  headerSide: { width: 60 },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.sm },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

/** Estilos de la tarjeta blanca estándar */
export const useCardStyle = makeStyles((c) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.md,
    },
  }),
);

