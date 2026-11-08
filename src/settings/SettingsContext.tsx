import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { setApiLanguage } from '../api/client';
import { makeT, type AppLanguage, type TFunction } from '../i18n/strings';
import { darkColors, lightColors, type Colors } from '../palette';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Settings = { language: AppLanguage; theme: ThemePreference };

type SettingsValue = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  colors: Colors;
  isDark: boolean;
  t: TFunction;
};

// Clave heredada del nombre anterior de la app: no cambiarla o se pierden los ajustes guardados
const KEY = 'docusynth:settings:v1';
const SettingsContext = createContext<SettingsValue | null>(null);

function deviceLanguage(): AppLanguage {
  try {
    return getLocales()[0]?.languageCode === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<Settings>({ language: deviceLanguage(), theme: 'system' });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<Settings>;
        setSettings((prev) => ({
          language: saved.language === 'en' || saved.language === 'es' ? saved.language : prev.language,
          theme: saved.theme === 'light' || saved.theme === 'dark' || saved.theme === 'system' ? saved.theme : prev.theme,
        }));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // El backend devuelve los mensajes de error en el idioma de la app
  setApiLanguage(settings.language);

  const value = useMemo<SettingsValue>(() => {
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && systemScheme === 'dark');
    return {
      settings,
      isDark,
      colors: isDark ? darkColors : lightColors,
      t: makeT(settings.language),
      update: (patch) =>
        setSettings((prev) => {
          const next = { ...prev, ...patch };
          AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
          return next;
        }),
    };
  }, [settings, systemScheme]);

  // Esperamos a leer los ajustes para no mostrar un parpadeo de idioma o de tema
  if (!loaded) return null;
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings debe usarse dentro de <SettingsProvider>');
  return ctx;
}

export function useT(): TFunction {
  return useSettings().t;
}
