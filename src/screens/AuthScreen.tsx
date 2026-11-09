import { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthError, EMAIL_RE, MIN_PASSWORD, useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { FormMessage, TextField, type TextFieldRef } from '../components/TextField';
import type { StringKey } from '../i18n/strings';
import { useT } from '../settings/SettingsContext';
import { makeStyles, PAGE_X, radius, softShadow, spacing, type } from '../theme';

type Mode = 'login' | 'register' | 'forgot';

export function AuthScreen() {
  const t = useT();
  const styles = useStyles();
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const emailRef = useRef<TextFieldRef>(null);
  const passwordRef = useRef<TextFieldRef>(null);
  const confirmRef = useRef<TextFieldRef>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
    setConfirm('');
  };

  /** Validación en la app antes de llamar a Firebase */
  const validate = (): StringKey | null => {
    if (mode === 'register' && !name.trim()) return 'auth.error.nameRequired';
    if (!EMAIL_RE.test(email.trim())) return 'auth.error.emailInvalid';
    if (mode === 'forgot') return null;
    if (!password) return 'auth.error.passwordRequired';
    if (mode === 'register' && password.length < MIN_PASSWORD) return 'auth.error.passwordShort';
    if (mode === 'register' && password !== confirm) return 'auth.error.passwordMismatch';
    return null;
  };

  const submit = async () => {
    if (busy) return;
    setError(null);
    setNotice(null);
    const invalid = validate();
    if (invalid) {
      setError(t(invalid));
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await signIn(email, password);
      else if (mode === 'register') await signUp(name, email, password);
      else {
        await resetPassword(email);
        setNotice(t('auth.resetSent', { email: email.trim() }));
      }
      // Al iniciar sesión o registrarse, App cambia de pantalla sola
    } catch (err) {
      setError(t(err instanceof AuthError ? err.key : 'auth.error.generic'));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'login' ? 'auth.loginTitle' : mode === 'register' ? 'auth.registerTitle' : 'auth.forgotTitle';
  const subtitle =
    mode === 'login' ? 'auth.loginSubtitle' : mode === 'register' ? 'auth.registerSubtitle' : 'auth.forgotSubtitle';
  const action = mode === 'login' ? 'auth.login' : mode === 'register' ? 'auth.register' : 'auth.sendReset';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.brand}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
            <Text style={styles.brandName}>Clarify</Text>
            <Text style={styles.tagline}>{t('auth.tagline')}</Text>
          </View>

          <View style={styles.card}>
            <View style={{ gap: spacing.xs }}>
              <Text style={styles.title}>{t(title)}</Text>
              <Text style={styles.subtitle}>{t(subtitle)}</Text>
            </View>

            {mode === 'register' && (
              <TextField
                label={t('auth.name')}
                icon="user"
                value={name}
                onChangeText={setName}
                placeholder={t('auth.namePlaceholder')}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                maxLength={60}
              />
            )}

            <TextField
              ref={emailRef}
              label={t('auth.email')}
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType={mode === 'forgot' ? 'send' : 'next'}
              onSubmitEditing={() => (mode === 'forgot' ? submit() : passwordRef.current?.focus())}
            />

            {mode !== 'forgot' && (
              <TextField
                ref={passwordRef}
                label={t('auth.password')}
                icon="lock"
                password
                value={password}
                onChangeText={setPassword}
                placeholder={t(mode === 'register' ? 'auth.newPasswordPlaceholder' : 'auth.passwordPlaceholder')}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                textContentType={mode === 'register' ? 'newPassword' : 'password'}
                returnKeyType={mode === 'register' ? 'next' : 'go'}
                onSubmitEditing={() => (mode === 'register' ? confirmRef.current?.focus() : submit())}
              />
            )}

            {mode === 'register' && (
              <TextField
                ref={confirmRef}
                label={t('auth.confirmPassword')}
                icon="lock"
                password
                value={confirm}
                onChangeText={setConfirm}
                placeholder={t('auth.confirmPlaceholder')}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            )}

            {mode === 'login' && (
              <Pressable onPress={() => switchMode('forgot')} hitSlop={8} style={styles.forgot}>
                <Text style={styles.link}>{t('auth.forgotLink')}</Text>
              </Pressable>
            )}

            <FormMessage message={error} />
            <FormMessage message={notice} tone="success" />

            <Button title={t(action)} onPress={submit} loading={busy} />
          </View>

          <View style={styles.footer}>
            {mode === 'forgot' ? (
              <Pressable onPress={() => switchMode('login')} hitSlop={8}>
                <Text style={styles.link}>{t('auth.backToLogin')}</Text>
              </Pressable>
            ) : (
              <>
                <Text style={styles.footerText}>{t(mode === 'login' ? 'auth.noAccount' : 'auth.haveAccount')}</Text>
                <Pressable onPress={() => switchMode(mode === 'login' ? 'register' : 'login')} hitSlop={8}>
                  <Text style={styles.link}>{t(mode === 'login' ? 'auth.goRegister' : 'auth.goLogin')}</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: PAGE_X, paddingVertical: spacing.xxl, gap: spacing.xl },
    brand: { alignItems: 'center', gap: spacing.sm },
    logo: { width: 76, height: 76, borderRadius: 22, marginBottom: spacing.xs },
    brandName: { ...type.brand, color: c.text },
    tagline: { ...type.body, color: c.textMuted, textAlign: 'center' },
    card: { backgroundColor: c.surface, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg, ...softShadow(c) },
    title: { ...type.title, color: c.text },
    subtitle: { ...type.small, color: c.textMuted },
    forgot: { alignSelf: 'flex-end', marginTop: -spacing.sm },
    link: { ...type.label, color: c.accentText },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
    footerText: { ...type.label, color: c.textMuted },
  }),
);
