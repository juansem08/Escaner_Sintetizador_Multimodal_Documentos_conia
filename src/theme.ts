import type { TextStyle } from 'react-native';
import type { Colors } from './palette';
import { useSettings } from './settings/SettingsContext';

export type { Colors } from './palette';
export { gradients } from './palette';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

/** Margen lateral de todas las pantallas */
export const PAGE_X = 20;

export const radius = { sm: 10, md: 16, lg: 24, xl: 28, pill: 999 };

/** Plus Jakarta Sans: con fuentes personalizadas cada peso es una familia distinta */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

/** Escala tipográfica (sin color: se aplica según el tema) */
export const type = {
  brand: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  display: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  title: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  bodyStrong: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export function useColors(): Colors {
  return useSettings().colors;
}

/**
 * Crea un hook de estilos que se recalcula al cambiar entre tema claro y oscuro.
 *   const useStyles = makeStyles((c) => StyleSheet.create({ box: { backgroundColor: c.surface } }));
 */
export function makeStyles<T>(factory: (c: Colors) => T) {
  const cache = new Map<Colors, T>();
  return function useStyles(): T {
    const colors = useColors();
    let styles = cache.get(colors);
    if (!styles) {
      styles = factory(colors);
      cache.set(colors, styles);
    }
    return styles;
  };
}

/** Sombra suave para tarjetas flotantes */
export function softShadow(c: Colors, strength = 1) {
  return {
    shadowColor: c.shadow,
    shadowOpacity: 0.08 * strength,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3 * strength,
  };
}

/** Sombra cálida para las tarjetas con degradado naranja */
export const glowShadow = {
  shadowColor: '#E8572F',
  shadowOpacity: 0.35,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 12 },
  elevation: 10,
};
