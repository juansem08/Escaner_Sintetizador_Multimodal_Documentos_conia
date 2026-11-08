import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomNav, type NavTab } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { ProcessingScreen } from './screens/ProcessingScreen';
import { ResultScreen } from './screens/ResultScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { ScanScreen } from './screens/ScanScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SettingsProvider, useSettings } from './settings/SettingsContext';
import type { PageInput, ScannedDocument } from './types';

// Mantenemos la pantalla de carga (icono de Clarify) hasta que la fuente esté lista
SplashScreen.preventAutoHideAsync().catch(() => {});

type Route =
  | { name: 'home' }
  | { name: 'library' }
  | { name: 'settings' }
  | { name: 'scan'; pages: PageInput[] }
  | { name: 'review'; pages: PageInput[] }
  | { name: 'processing'; pages: PageInput[] }
  | { name: 'result'; doc: ScannedDocument };

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Si la fuente no carga seguimos con la del sistema en lugar de bloquear la app
  const ready = fontsLoaded || Boolean(fontError);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <Navigator />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
    return null;
  }
