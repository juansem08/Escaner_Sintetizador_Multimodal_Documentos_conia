import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '../settings/SettingsContext';
import { makeStyles, radius, spacing, type, useColors } from '../theme';

/** Botón redondo que copia un texto y muestra un check durante un momento */
export function CopyButton({
  value,
  size = 44,
  variant = 'muted',
  withLabel,
}: {
  value: string;
  size?: number;
  variant?: 'muted' | 'light' | 'glass';
  withLabel?: boolean;
}) {
  const t = useT();
  const c = useColors();
  const styles = useStyles();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  const bg = variant === 'light' ? c.surface : variant === 'glass' ? 'rgba(255,255,255,0.14)' : c.surfaceMuted;
  const fg = variant === 'glass' ? '#FFFFFF' : copied ? c.success : c.text;

  return (
    <Pressable
      onPress={copy}
      accessibilityRole="button"
      accessibilityLabel={copied ? t('data.copied') : 'copy'}
      hitSlop={6}
      style={({ pressed }) => [
        withLabel ? styles.withLabel : { width: size, height: size, borderRadius: size / 2 },
        { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        pressed && { opacity: 0.75 },
      ]}
    >
      <View style={styles.row}>
        <Feather name={copied ? 'check' : 'copy'} size={withLabel ? 13 : size * 0.38} color={fg} />
        {withLabel && copied ? <Text style={[styles.label, { color: fg }]}>{t('data.copied')}</Text> : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    withLabel: { height: 30, minWidth: 44, paddingHorizontal: spacing.md, borderRadius: radius.pill },
    row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    label: { ...type.label, fontSize: 12 },
  }),
);
