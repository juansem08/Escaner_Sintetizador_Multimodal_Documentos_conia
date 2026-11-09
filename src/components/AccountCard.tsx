import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthError, MIN_PASSWORD, useAuth } from '../auth/AuthContext';
import type { StringKey } from '../i18n/strings';
import { useT } from '../settings/SettingsContext';
import { gradients, makeStyles, radius, spacing, type, useColors } from '../theme';
import { BottomSheet } from './BottomSheet';
import { Button, type FeatherName } from './Button';
import { FormMessage, TextField } from './TextField';

type Sheet = 'name' | 'password' | 'delete' | null;

/** Iniciales para el avatar: "Juan Mayorga" → "JM" */
function initials(name: string, email: string) {
  const parts = (name || email).trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

export function AccountCard() {
  const t = useT();
  const styles = useStyles();
  const c = useColors();
  const { user, signOut } = useAuth();
  const [sheet, setSheet] = useState<Sheet>(null);

  if (!user) return null;

  const confirmSignOut = () =>
    Alert.alert(t('account.signOut'), t('account.signOutText'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('account.signOut'), style: 'destructive', onPress: () => signOut().catch(() => {}) },
    ]);

  return (
    <View style={styles.card}>
      <View style={styles.profile}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user.name, user.email)}</Text>
        </LinearGradient>
        <View style={styles.profileText}>
          <Text style={styles.name} numberOfLines={1}>
            {user.name || user.email}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {user.email}
          </Text>
          <View style={styles.verified}>
            <Feather name="check-circle" size={12} color={c.success} />
            <Text style={styles.verifiedText}>{t('account.verified')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rows}>
        <Row icon="edit-3" label={t('account.editName')} onPress={() => setSheet('name')} />
        <Row icon="key" label={t('account.changePassword')} onPress={() => setSheet('password')} />
        <Row icon="log-out" label={t('account.signOut')} onPress={confirmSignOut} />
        <Row icon="trash-2" label={t('account.delete')} onPress={() => setSheet('delete')} danger />
      </View>

      {/* key: cada vez que se abre una hoja, su formulario empieza vacío */}
      <NameSheet key={`name-${sheet === 'name'}`} visible={sheet === 'name'} onClose={() => setSheet(null)} />
      <PasswordSheet key={`password-${sheet === 'password'}`} visible={sheet === 'password'} onClose={() => setSheet(null)} />
      <DeleteSheet key={`delete-${sheet === 'delete'}`} visible={sheet === 'delete'} onClose={() => setSheet(null)} />
    </View>
  );
}

function Row({ icon, label, onPress, danger }: { icon: FeatherName; label: string; onPress: () => void; danger?: boolean }) {
  const styles = useStyles();
  const c = useColors();
  const fg = danger ? c.danger : c.text;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <View style={[styles.rowIcon, danger && { backgroundColor: c.dangerSoft }]}>
        <Feather name={icon} size={17} color={fg} />
      </View>
      <Text style={[styles.rowLabel, { color: fg }]}>{label}</Text>
      <Feather name="chevron-right" size={18} color={c.textMuted} />
    </Pressable>
  );
}

/** Estado común de los formularios de las hojas */
function useForm() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (validate: () => StringKey | null, action: () => Promise<void>, success?: StringKey) => {
    if (busy) return;
    setError(null);
    setDone(null);
    const invalid = validate();
    if (invalid) return setError(t(invalid));
    setBusy(true);
    try {
      await action();
      if (success) setDone(t(success));
    } catch (err) {
      setError(t(err instanceof AuthError ? err.key : 'auth.error.generic'));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, done, submit };
}

function NameSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  const { user, updateName } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const form = useForm();

  const save = () =>
    form.submit(
      () => (name.trim() ? null : 'auth.error.nameRequired'),
      async () => {
        await updateName(name);
        onClose();
      },
    );

  return (
    <BottomSheet visible={visible} title={t('account.editName')} onClose={onClose}>
      <View style={{ gap: spacing.md }}>
        <TextField
          label={t('auth.name')}
          icon="user"
          value={name}
          onChangeText={setName}
          placeholder={t('auth.namePlaceholder')}
          autoCapitalize="words"
          autoFocus
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={save}
        />
        <FormMessage message={form.error} />
        <Button title={t('account.save')} onPress={save} loading={form.busy} />
      </View>
    </BottomSheet>
  );
}

function PasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const form = useForm();

  const save = () =>
    form.submit(
      () => {
        if (!current) return 'auth.error.passwordRequired';
        if (next.length < MIN_PASSWORD) return 'auth.error.passwordShort';
        if (next !== confirm) return 'auth.error.passwordMismatch';
        return null;
      },
      async () => {
        await changePassword(current, next);
        setCurrent('');
        setNext('');
        setConfirm('');
      },
      'account.passwordSaved',
    );

  return (
    <BottomSheet visible={visible} title={t('account.changePassword')} onClose={onClose}>
      <View style={{ gap: spacing.md }}>
        <TextField
          label={t('account.currentPassword')}
          icon="lock"
          password
          value={current}
          onChangeText={setCurrent}
          autoComplete="current-password"
          textContentType="password"
        />
        <TextField
          label={t('account.newPassword')}
          icon="key"
          password
          value={next}
          onChangeText={setNext}
          placeholder={t('auth.newPasswordPlaceholder')}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label={t('auth.confirmPassword')}
          icon="key"
          password
          value={confirm}
          onChangeText={setConfirm}
          placeholder={t('auth.confirmPlaceholder')}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={save}
        />
        <FormMessage message={form.error} />
        <FormMessage message={form.done} tone="success" />
        <Button title={form.done ? t('common.close') : t('account.save')} onPress={form.done ? onClose : save} loading={form.busy} />
      </View>
    </BottomSheet>
  );
}

function DeleteSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  const styles = useStyles();
  const { deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const form = useForm();

  // Al borrar la cuenta, App vuelve sola a la pantalla de inicio de sesión
  const remove = () => form.submit(() => (password ? null : 'auth.error.passwordRequired'), () => deleteAccount(password));

  return (
    <BottomSheet visible={visible} title={t('account.delete')} onClose={onClose}>
      <View style={{ gap: spacing.md }}>
        <Text style={styles.warning}>{t('account.deleteText')}</Text>
        <TextField
          label={t('auth.password')}
          icon="lock"
          password
          value={password}
          onChangeText={setPassword}
          autoComplete="current-password"
          textContentType="password"
        />
        <FormMessage message={form.error} />
        <Pressable
          onPress={remove}
          disabled={form.busy}
          style={({ pressed }) => [styles.danger, (pressed || form.busy) && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          {form.busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="trash-2" size={18} color="#FFFFFF" />
              <Text style={styles.dangerText}>{t('account.deleteConfirm')}</Text>
            </>
          )}
        </Pressable>
        <Button title={t('common.cancel')} variant="ghost" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg },
    profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    avatarText: { ...type.title, color: '#FFFFFF' },
    profileText: { flex: 1, gap: 2 },
    name: { ...type.heading, color: c.text },
    email: { ...type.small, color: c.textMuted },
    verified: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: c.successSoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      marginTop: spacing.xs,
    },
    verifiedText: { ...type.label, fontSize: 12, color: c.success },
    rows: { gap: spacing.xs },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { ...type.bodyStrong, flex: 1 },
    warning: { ...type.body, color: c.textMuted },
    danger: {
      minHeight: 56,
      borderRadius: radius.pill,
      backgroundColor: c.danger,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    dangerText: { ...type.bodyStrong, fontSize: 16, color: '#FFFFFF' },
  }),
);
