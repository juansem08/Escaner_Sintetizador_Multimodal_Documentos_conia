import { Feather } from '@expo/vector-icons';
import { forwardRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

/** Referencia al campo, para pasar el foco al siguiente con el teclado */
export type TextFieldRef = ComponentRef<typeof TextInput>;
import { useT } from '../settings/SettingsContext';
import { fonts, makeStyles, radius, spacing, type, useColors } from '../theme';
import type { FeatherName } from './Button';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  icon: FeatherName;
  /** Campo de contraseña con botón para mostrarla */
  password?: boolean;
};

/** Campo de formulario: etiqueta arriba y caja redondeada con icono */
export const TextField = forwardRef<TextFieldRef, Props>(function TextField({ label, icon, password, ...input }, ref) {
  const styles = useStyles();
  const c = useColors();
  const t = useT();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.boxFocused]}>
        <Feather name={icon} size={18} color={focused ? c.accent : c.textMuted} />
        <TextInput
          ref={ref}
          {...input}
          style={styles.input}
          placeholderTextColor={c.textMuted}
          secureTextEntry={password && !visible}
          autoCapitalize={password ? 'none' : input.autoCapitalize}
          autoCorrect={password ? false : input.autoCorrect}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
        />
        {password ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={visible ? t('auth.hidePassword') : t('auth.showPassword')}
          >
            <Feather name={visible ? 'eye-off' : 'eye'} size={18} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

/** Mensaje de error o de éxito bajo un formulario */
export function FormMessage({ message, tone = 'danger' }: { message: string | null; tone?: 'danger' | 'success' }) {
  const styles = useStyles();
  const c = useColors();
  if (!message) return null;
  const fg = tone === 'danger' ? c.danger : c.success;
  return (
    <View style={[styles.message, { backgroundColor: tone === 'danger' ? c.dangerSoft : c.successSoft }]}>
      <Feather name={tone === 'danger' ? 'alert-circle' : 'check-circle'} size={16} color={fg} />
      <Text style={[styles.messageText, { color: fg }]}>{message}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    wrap: { gap: spacing.sm },
    label: { ...type.label, color: c.text },
    box: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 56,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceMuted,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    boxFocused: { borderColor: c.accent, backgroundColor: c.surface },
    input: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: c.text, paddingVertical: spacing.md },
    message: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
    messageText: { ...type.small, flex: 1 },
  }),
);
