export type Colors = {
  /** Fondo general de la app (gris cálido) */
  background: string;
  /** Tarjetas y botones claros */
  surface: string;
  /** Fondos suaves: celdas alternas, inputs */
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  /** Píldoras oscuras (pestaña activa, botones principales) */
  ink: string;
  onInk: string;
  /** Naranja de marca */
  accent: string;
  accentSoft: string;
  accentText: string;
  /** Tonos de las etiquetas por tipo de documento */
  mintSoft: string;
  mintText: string;
  lavenderSoft: string;
  lavenderText: string;
  sunSoft: string;
  sunText: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  shadow: string;
};

export const lightColors: Colors = {
  background: '#F2F0EE',
  surface: '#FFFFFF',
  surfaceMuted: '#F6F4F2',
  border: '#ECE8E4',
  text: '#151413',
  textMuted: '#77716C',
  ink: '#1B1A19',
  onInk: '#FFFFFF',
  accent: '#E8603A',
  accentSoft: '#FDE4D7',
  accentText: '#C2481F',
  mintSoft: '#DDF3E8',
  mintText: '#2C7A55',
  lavenderSoft: '#E7E5FB',
  lavenderText: '#5148B8',
  sunSoft: '#FCF0CF',
  sunText: '#8F6A06',
  success: '#22A35A',
  successSoft: '#DDF3E8',
  warning: '#A86400',
  warningSoft: '#FFF0D6',
  danger: '#D23B2B',
  dangerSoft: '#FDE3DF',
  overlay: 'rgba(20,18,16,0.45)',
  shadow: '#5A3A2A',
};

export const darkColors: Colors = {
  background: '#121110',
  surface: '#1E1C1B',
  surfaceMuted: '#282524',
  border: '#2F2B29',
  text: '#F5F2EF',
  textMuted: '#A59E98',
  // En oscuro las píldoras principales se invierten para que contrasten
  ink: '#F5F2EF',
  onInk: '#151413',
  accent: '#FF7A4F',
  accentSoft: '#3B2219',
  accentText: '#FF9B74',
  mintSoft: '#173026',
  mintText: '#6AD69F',
  lavenderSoft: '#26233F',
  lavenderText: '#ADA6FF',
  sunSoft: '#352B12',
  sunText: '#F2C75C',
  success: '#4CD587',
  successSoft: '#173026',
  warning: '#F5B451',
  warningSoft: '#352B12',
  danger: '#FF7B6B',
  dangerSoft: '#3D1D1A',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
};

/** Degradados de marca (iguales en claro y oscuro) */
export const gradients = {
  /** Tarjetas destacadas: hero, resumen ejecutivo, importe */
  brand: ['#FFA374', '#F26D45', '#D44E2A'] as const,
  /** Fondo de la pantalla de chat */
  chat: ['#6A3424', '#2A1913', '#121010'] as const,
  /** Iconos de las tarjetas de documento según el tipo */
  peach: ['#FFE3D3', '#FFC6A8'] as const,
  mint: ['#E3F6EC', '#BFE8D2'] as const,
  lavender: ['#ECEBFD', '#D3CFFA'] as const,
  sun: ['#FFF4D6', '#F8DE96'] as const,
  stone: ['#F1EEEB', '#E0DBD6'] as const,
};
