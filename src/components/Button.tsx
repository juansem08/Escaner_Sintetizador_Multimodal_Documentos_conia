import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles, radius, spacing, type, useColors } from '../theme';

export type FeatherName = ComponentProps<typeof Feather>['name'];

type Variant = 'ink' | 'light' | 'soft' | 'ghost' | 'primary' | 'secondary';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: FeatherName;
  /** Círculo blanco con flecha a la derecha, como "Hacer una pregunta" */
  trailingArrow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Botón píldora del diseño */
export function Button({ title, onPress, variant = 'ink', icon, trailingArrow, loading, disabled, style }: Props) {
  const styles = useStyles();
  const c = useColors();
  // Compatibilidad con los nombres anteriores
  const v = variant === 'primary' ? 'ink' : variant === 'secondary' ? 'light' : variant;
  const fg = v === 'ink' ? c.onInk : v === 'soft' ? c.accentText : c.text;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[v],
        trailingArrow && styles.withArrow,
        pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <View style={[styles.content, trailingArrow && styles.contentLeft]}>
            {icon ? <Feather name={icon} size={18} color={fg} /> : null}
            <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
          {trailingArrow ? (
            <View style={[styles.arrow, { backgroundColor: v === 'ink' ? c.onInk : c.ink }]}>
              <Feather name="arrow-right" size={20} color={v === 'ink' ? c.ink : c.onInk} />
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    base: {
      minHeight: 56,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    withArrow: { paddingRight: 6, paddingLeft: spacing.xl, minHeight: 64 },
    ink: { backgroundColor: c.ink },
    light: { backgroundColor: c.surface },
    soft: { backgroundColor: c.accentSoft },
    ghost: { backgroundColor: 'transparent' },
    content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
    contentLeft: { flex: 1, justifyContent: 'flex-start' },
    text: { ...type.bodyStrong, fontSize: 16 },
    arrow: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  }),
);
