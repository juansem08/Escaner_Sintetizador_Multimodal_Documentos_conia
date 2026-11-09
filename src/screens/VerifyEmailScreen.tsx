import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthError, useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { FormMessage } from '../components/TextField';
import { useT } from '../settings/SettingsContext';
import { glowShadow, gradients, makeStyles, PAGE_X, radius, softShadow, spacing, type, useColors } from '../theme';

const RESEND_COOLDOWN_S = 60;
const AUTO_CHECK_MS = 4000;

/** Se muestra tras registrarse hasta que el usuario abre el enlace del correo */
export function VerifyEmailScreen() {
  const t = useT();
  const styles = useStyles();
  const c = useColors();
  const { user, refreshVerification, resendVerification, signOut } = useAuth();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  // El correo acaba de enviarse al registrarse: esperamos antes de permitir reenviarlo
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false);

  // Cuenta atrás para reenviar
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Comprobación automática: cada pocos segundos y al volver a la app desde el correo
  useEffect(() => {
    const silentCheck = () => {
      if (busy.current || AppState.currentState !== 'active') return;
      busy.current = true;
      refreshVerification()
        .catch(() => {})
        .finally(() => {
          busy.current = false;
        });
    };
    const interval = setInterval(silentCheck, AUTO_CHECK_MS);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && silentCheck());
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refreshVerification]);

  const check = async () => {
    setChecking(true);
    setError(null);
    setNotice(null);
    try {
      const verified = await refreshVerification();
      // Si ya está verificado, App muestra la pantalla de inicio
      if (!verified) setError(t('verify.notYet'));
    } catch (err) {
      setError(t(err instanceof AuthError ? err.key : 'auth.error.generic'));
    } finally {
      setChecking(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      await resendVerification();
      setNotice(t('verify.resent'));
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(t(err instanceof AuthError ? err.key : 'auth.error.generic'));
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
          <Feather name="mail" size={34} color="#FFFFFF" />
        </LinearGradient>

        <View style={styles.texts}>
          <Text style={styles.title}>{t('verify.title')}</Text>
          <Text style={styles.body}>{t('verify.sentTo')}</Text>
          <Text style={styles.email} selectable>
            {user?.email}
          </Text>
          <Text style={styles.hint}>{t('verify.hint')}</Text>
        </View>

        <View style={styles.auto}>
          <ActivityIndicator size="small" color={c.accent} />
          <Text style={styles.autoText}>{t('verify.auto')}</Text>
        </View>

        <View style={styles.actions}>
          <FormMessage message={error} />
          <FormMessage message={notice} tone="success" />
          <Button title={t('verify.check')} icon="check-circle" onPress={check} loading={checking} />
          <Button
            title={cooldown > 0 ? t('verify.resendIn', { s: cooldown }) : t('verify.resend')}
            icon="send"
            variant="soft"
            onPress={resend}
            loading={resending}
            disabled={cooldown > 0}
          />
          <Button title={t('verify.otherAccount')} icon="log-out" variant="ghost" onPress={() => signOut().catch(() => {})} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: PAGE_X, paddingVertical: spacing.xxl, gap: spacing.xl },
    icon: {
      alignSelf: 'center',
      width: 96,
      height: 96,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      ...glowShadow,
    },
    texts: { alignItems: 'center', gap: spacing.sm },
    title: { ...type.display, color: c.text, textAlign: 'center' },
    body: { ...type.body, color: c.textMuted, textAlign: 'center' },
    email: { ...type.bodyStrong, fontSize: 16, color: c.text, textAlign: 'center' },
    hint: { ...type.small, color: c.textMuted, textAlign: 'center', marginTop: spacing.xs },
    auto: {
      flexDirection: 'row',
      alignSelf: 'center',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      ...softShadow(c, 0.6),
    },
    autoText: { ...type.label, color: c.text },
    actions: { gap: spacing.md },
  }),
);
