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

function Navigator() {
  const { isDark, colors } = useSettings();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [chatOpen, setChatOpen] = useState(false);
  const goHome = () => setRoute({ name: 'home' });

  // Botón "atrás" de Android
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route.name === 'home') return false;
      if (route.name === 'result' && chatOpen) {
        setChatOpen(false);
        return true;
      }
      if (route.name === 'scan' && route.pages.length > 0) setRoute({ name: 'review', pages: route.pages });
      else goHome();
      return true;
    });
    return () => sub.remove();
  }, [route, chatOpen]);

  const onNav = (tab: NavTab) => {
    if (tab === 'scan') setRoute({ name: 'scan', pages: [] });
    else if (tab === 'library') setRoute({ name: 'library' });
    else if (tab === 'settings') setRoute({ name: 'settings' });
    else setRoute({ name: 'home' });
  };

  const navTab: NavTab | null =
    route.name === 'home' || route.name === 'library' || route.name === 'settings' ? route.name : null;
  const darkScreen = route.name === 'scan' || (route.name === 'result' && chatOpen);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={darkScreen || isDark ? 'light' : 'dark'} />

      {(route.name === 'home' || route.name === 'library') && (
        <HomeScreen
          key={route.name}
          mode={route.name}
          onScan={() => setRoute({ name: 'scan', pages: [] })}
          onImportImages={(pages) => setRoute({ name: 'review', pages })}
          onImportPdf={(page) => setRoute({ name: 'processing', pages: [page] })}
          onOpen={(doc) => {
            setChatOpen(false);
            setRoute({ name: 'result', doc });
          }}
          onSettings={() => setRoute({ name: 'settings' })}
          onSeeAll={() => setRoute({ name: 'library' })}
        />
      )}
      {route.name === 'settings' && <SettingsScreen />}
      {route.name === 'scan' && (
        <ScanScreen
          initialPages={route.pages}
          onCancel={() => (route.pages.length > 0 ? setRoute({ name: 'review', pages: route.pages }) : goHome())}
          onDone={(pages) => setRoute({ name: 'review', pages })}
        />
      )}
      {route.name === 'review' && (
        <ReviewScreen
          pages={route.pages}
          onChange={(pages) => setRoute({ name: 'review', pages })}
          onAddWithCamera={() => setRoute({ name: 'scan', pages: route.pages })}
          onAnalyze={() => setRoute({ name: 'processing', pages: route.pages })}
          onDiscard={goHome}
        />
      )}
      {route.name === 'processing' && (
        <ProcessingScreen
          pages={route.pages}
          onCancel={goHome}
          onDone={(doc) => {
            setChatOpen(false);
            setRoute({ name: 'result', doc });
          }}
        />
      )}
      {route.name === 'result' && (
        <ResultScreen initialDoc={route.doc} onBack={goHome} chatOpen={chatOpen} onChatOpenChange={setChatOpen} />
      )}

      {navTab && <BottomNav active={navTab} onSelect={onNav} />}
    </View>
  );
}
