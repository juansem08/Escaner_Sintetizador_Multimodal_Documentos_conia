import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
// La versión de React Native de firebase/auth incluye la persistencia con AsyncStorage.
// Metro elige ese archivo por la condición "react-native" de su package.json.
import * as firebaseAuth from 'firebase/auth';
import { Platform } from 'react-native';

// Expo solo sustituye las variables EXPO_PUBLIC_* cuando se leen así, una a una
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

function createAuth(): Auth | null {
  if (!isFirebaseConfigured) {
    console.warn('[Clarify] Faltan las variables EXPO_PUBLIC_FIREBASE_* (ver .env.example)');
    return null;
  }
  const alreadyStarted = getApps().length > 0;
  const app = alreadyStarted ? getApp() : initializeApp(config);
  // Con la recarga rápida de Expo el módulo se ejecuta otra vez: reutilizamos la instancia
  if (alreadyStarted || Platform.OS === 'web') return getAuth(app);

  const getReactNativePersistence = (
    firebaseAuth as unknown as { getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence }
  ).getReactNativePersistence;
  // La sesión se guarda en el dispositivo: no hay que iniciar sesión cada vez que se abre la app
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

export const auth = createAuth();
