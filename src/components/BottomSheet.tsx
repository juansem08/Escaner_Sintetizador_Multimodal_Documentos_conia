import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, radius, spacing, type, useColors } from '../theme';
import type { FeatherName } from './Button';

type Props = { visible: boolean; title: string; onClose: () => void; children: ReactNode };

export function BottomSheet({ visible, title, onClose, children }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>
        {children}
      </View>
    </Modal>
  );
}

type OptionProps = {
  icon?: FeatherName;
  label: string;
  description?: string;
  onPress: () => void;
  selected?: boolean;
  loading?: boolean;
  trailing?: string;
  disabled?: boolean;
};

export function SheetOption({ icon, label, description, onPress, selected, loading, trailing, disabled }: OptionProps) {
  const styles = useStyles();
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.45 },
      ]}
    >
      {icon ? (
        <View style={[styles.icon, selected && { backgroundColor: c.onInk }]}>
          <Feather name={icon} size={19} color={selected ? c.ink : c.text} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, selected && { color: c.onInk }]}>{label}</Text>
        {description ? (
          <Text style={[styles.description, selected && { color: c.onInk, opacity: 0.7 }]}>{description}</Text>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator color={selected ? c.onInk : c.accent} />
      ) : trailing ? (
        <View style={styles.trailing}>
          <Feather name="check" size={12} color={c.success} />
          <Text style={styles.trailingText}>{trailing}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: c.overlay },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: radius.xl + 4,
      borderTopRightRadius: radius.xl + 4,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
    handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: spacing.sm },
    title: { ...type.title, color: c.text, marginBottom: spacing.sm },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
    },
    optionSelected: { backgroundColor: c.ink },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { ...type.bodyStrong, fontSize: 16, color: c.text },
    description: { ...type.small, color: c.textMuted },
    trailing: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    trailingText: { ...type.label, fontSize: 12, color: c.success },
  }),
);
