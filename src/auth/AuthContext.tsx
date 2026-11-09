import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setAuthTokenProvider } from '../api/client';
import type { StringKey } from '../i18n/strings';
import { useSettings } from '../settings/SettingsContext';
import { clearHistoryFor, setHistoryUser } from '../storage/history';
import { auth, isFirebaseConfigured } from './firebase';

/** Copia de los datos del usuario: el objeto User de Firebase cambia sin avisar a React */
export type AuthUser = { uid: string; email: string; name: string; emailVerified: boolean };

type AuthValue = {
  /** false mientras se lee la sesión guardada en el dispositivo */
  ready: boolean;
  configured: boolean;
  user: AuthUser | null;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /** Vuelve a consultar a Firebase si el correo ya está verificado */
  refreshVerification: () => Promise<boolean>;
  resendVerification: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

const snapshot = (u: User | null): AuthUser | null =>
  u ? { uid: u.uid, email: u.email ?? '', name: u.displayName?.trim() ?? '', emailVerified: u.emailVerified } : null;

/** Error con una clave de texto traducible */
export class AuthError extends Error {
  constructor(readonly key: StringKey) {
    super(key);
  }
}

/** Traduce los códigos de error de Firebase a mensajes de la app */
function toAuthError(err: unknown): AuthError {
  if (err instanceof AuthError) return err;
  const code = (err as { code?: string })?.code ?? '';
  const map: Record<string, StringKey> = {
    'auth/invalid-email': 'auth.error.emailInvalid',
    'auth/missing-email': 'auth.error.emailInvalid',
    'auth/email-already-in-use': 'auth.error.emailInUse',
    'auth/invalid-credential': 'auth.error.invalidCredential',
    'auth/invalid-login-credentials': 'auth.error.invalidCredential',
    'auth/user-not-found': 'auth.error.invalidCredential',
    'auth/wrong-password': 'auth.error.invalidCredential',
    'auth/missing-password': 'auth.error.passwordRequired',
    'auth/weak-password': 'auth.error.weakPassword',
    'auth/password-does-not-meet-requirements': 'auth.error.weakPassword',
    'auth/too-many-requests': 'auth.error.tooMany',
    'auth/network-request-failed': 'auth.error.network',
    'auth/user-disabled': 'auth.error.disabled',
    'auth/operation-not-allowed': 'auth.error.notEnabled',
    'auth/requires-recent-login': 'auth.error.recentLogin',
  };
  // Aparece en la terminal de Expo: útil para diagnosticar (correo no enviado, clave mal configurada…)
  console.warn('[Clarify] error de Firebase Auth:', code || err);
  return new AuthError(map[code] ?? 'auth.error.generic');
}

/** Ejecuta una operación de Firebase y convierte sus errores */
async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toAuthError(err);
  }
}

function requireUser(): User {
  const u = auth?.currentUser;
  if (!u) throw new AuthError('auth.error.generic');
  return u;
}

/** Confirma la contraseña actual (Firebase lo exige para cambiarla o borrar la cuenta) */
async function reauthenticate(u: User, password: string) {
  try {
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email ?? '', password));
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') throw new AuthError('auth.error.wrongPassword');
    throw toAuthError(err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(!auth);

  // Los correos de verificación y de recuperación llegan en el idioma de la app
  useEffect(() => {
    if (auth) auth.languageCode = settings.language;
  }, [settings.language]);

  useEffect(() => {
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    setAuthTokenProvider(async (forceRefresh) => firebaseAuth.currentUser?.getIdToken(forceRefresh) ?? null);
    return onAuthStateChanged(firebaseAuth, async (u) => {
      // El historial de cada cuenta se prepara antes de mostrar la app
      await setHistoryUser(u?.uid ?? null);
      setUser(snapshot(u));
      setReady(true);
    });
  }, []);

  const value = useMemo<AuthValue>(() => {
    // Solo actualizamos si algo cambió (la verificación automática llama a esto cada pocos segundos)
    const sync = () =>
      setUser((prev) => {
        const next = snapshot(auth?.currentUser ?? null);
        const same =
          prev && next && prev.uid === next.uid && prev.email === next.email && prev.name === next.name && prev.emailVerified === next.emailVerified;
        return same ? prev : next;
      });

    return {
      ready,
      configured: isFirebaseConfigured,
      user,

      signUp: (name, email, password) =>
        run(async () => {
          const { user: u } = await createUserWithEmailAndPassword(auth!, email.trim(), password);
          await updateProfile(u, { displayName: name.trim() });
          sync();
          await sendEmailVerification(u);
          console.log(`[Clarify] correo de verificación enviado a ${u.email}`);
        }),

      signIn: (email, password) => run(() => signInWithEmailAndPassword(auth!, email.trim(), password).then(() => {})),

      signOut: () => run(() => firebaseSignOut(auth!)),

      resetPassword: (email) => run(() => sendPasswordResetEmail(auth!, email.trim())),

      refreshVerification: () =>
        run(async () => {
          const u = requireUser();
          await u.reload();
          // Pedimos un token nuevo para que el servidor vea el correo como verificado
          if (u.emailVerified) await u.getIdToken(true);
          sync();
          return u.emailVerified;
        }),

      resendVerification: () =>
        run(async () => {
          const u = requireUser();
          await sendEmailVerification(u);
          console.log(`[Clarify] correo de verificación enviado a ${u.email}`);
        }),

      updateName: (name) =>
        run(async () => {
          await updateProfile(requireUser(), { displayName: name.trim() });
          sync();
        }),

      changePassword: async (current, next) => {
        const u = requireUser();
        await reauthenticate(u, current);
        await run(() => updatePassword(u, next));
      },

      deleteAccount: async (password) => {
        const u = requireUser();
        await reauthenticate(u, password);
        const uid = u.uid;
        await run(() => deleteUser(u));
        await clearHistoryFor(uid);
      },
    };
  }, [ready, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD = 8;
