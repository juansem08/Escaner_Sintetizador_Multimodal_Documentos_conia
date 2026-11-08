import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles, radius, spacing, type } from '../theme';

/** Tarjeta blanca con esquinas muy redondeadas, como en el diseño */
export function Card({
  title,
  right,
  children,
  style,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.card, style]}>
      {title || right ? (
        <View style={styles.titleRow}>
          {title ? <Text style={styles.title}>{title}</Text> : <View />}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.md,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { ...type.heading, color: c.text },
  }),
);

/** Estilos de texto con color del tema, para reutilizar en las pantallas */
export const useTextStyles = makeStyles((c) =>
  StyleSheet.create({
    brand: { ...type.brand, color: c.text },
    display: { ...type.display, color: c.text },
    title: { ...type.title, color: c.text },
    heading: { ...type.heading, color: c.text },
    bodyStrong: { ...type.bodyStrong, color: c.text },
    body: { ...type.body, color: c.text },
    label: { ...type.label, color: c.text },
    small: { ...type.small, color: c.textMuted },
    caption: { ...type.caption, color: c.textMuted },
  }),
);
