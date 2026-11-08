import { Feather, Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../settings/SettingsContext';
import { useColors } from '../theme';

export type NavTab = 'home' | 'library' | 'scan' | 'settings';

/** Altura total que ocupa la barra (para dejar espacio al final de las listas) */
export const BOTTOM_NAV_SPACE = 110;

/** Barra de navegación flotante (píldora oscura con 4 iconos) */
export function BottomNav({ active, onSelect }: { active: NavTab; onSelect: (tab: NavTab) => void }) {
  const t = useT();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const items: { tab: NavTab; label: string; render: (color: string) => React.ReactNode }[] = [
    { tab: 'home', label: t('nav.home'), render: (color) => <Feather name="home" size={22} color={color} /> },
    { tab: 'library', label: t('nav.library'), render: (color) => <Feather name="file-text" size={22} color={color} /> },
    { tab: 'scan', label: t('nav.scan'), render: (color) => <Ionicons name="scan-outline" size={24} color={color} /> },
    { tab: 'settings', label: t('nav.settings'), render: (color) => <Feather name="grid" size={21} color={color} /> },
  ];

  // En modo oscuro "ink" es claro: la barra sigue siendo oscura para parecerse al diseño
  const barColor = '#1B1A19';

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: Math.max(insets.bottom, 10) + 6 }]}>
      <View style={[styles.bar, { backgroundColor: barColor, shadowColor: c.shadow }]}>
        {items.map(({ tab, label, render }) => {
          const selected = tab === active;
          return (
            <Pressable
              key={tab}
              onPress={() => onSelect(tab)}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              style={({ pressed }) => [styles.item, selected && styles.itemActive, pressed && { opacity: 0.75 }]}
            >
              {render(selected ? '#1B1A19' : 'rgba(255,255,255,0.78)')}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 20, right: 20, alignItems: 'stretch' },
  bar: {
    height: 72,
    borderRadius: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  item: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  itemActive: { backgroundColor: '#FFFFFF' },
});
