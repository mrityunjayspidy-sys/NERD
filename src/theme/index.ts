// Partner Design System Tokens

export const Radii = {
  xs: 10,
  sm: 16,
  md: 22,
  lg: 28,
  xl: 36,
  full: 9999, // Pill shape
};

export const LightTheme = {
  dark: false,
  colors: {
    // Dominant Grey
    background: 'rgb(227, 227, 227)',
    backgroundSubtle: 'rgb(234, 234, 234)',
    surface: 'rgb(240, 240, 240)',
    surfaceElevated: 'rgb(248, 248, 248)',
    surfaceInput: 'rgb(235, 235, 235)',

    // Secondary / Accent Mid-Grey
    accent: 'rgb(128, 128, 128)',
    accentLight: 'rgba(128, 128, 128, 0.15)',
    accentMedium: 'rgba(128, 128, 128, 0.35)',
    border: 'rgba(128, 128, 128, 0.25)',
    borderActive: 'rgb(128, 128, 128)',

    // High-contrast typography & icons
    textPrimary: '#141416',
    textSecondary: 'rgb(100, 100, 105)',
    textMuted: 'rgb(140, 140, 145)',
    textInverse: '#FFFFFF',

    // Soft semantic highlights (kept muted/subtle)
    todayGlow: 'rgba(128, 128, 128, 0.20)',
    priorityHigh: '#D9534F',
    priorityMedium: '#808080',
    priorityLow: '#A0A0A5',
    donePill: '#4E9F76',
    overduePill: '#C05650',

    // Canvas Grid & HUD
    canvasGrid: 'rgba(128, 128, 128, 0.12)',
    canvasAura: 'rgba(255, 255, 255, 0.6)',
    cardShadow: 'rgba(0, 0, 0, 0.06)',
    modalOverlay: 'rgba(0, 0, 0, 0.45)',
  },
  radii: Radii,
};

export const DarkTheme = {
  dark: true,
  colors: {
    // Inverted Dominant Palette (Charcoal/Dark Greys)
    background: 'rgb(20, 20, 22)',
    backgroundSubtle: 'rgb(28, 28, 32)',
    surface: 'rgb(34, 34, 38)',
    surfaceElevated: 'rgb(44, 44, 50)',
    surfaceInput: 'rgb(30, 30, 34)',

    // Secondary / Accent Mid-Grey
    accent: 'rgb(160, 160, 165)',
    accentLight: 'rgba(160, 160, 165, 0.18)',
    accentMedium: 'rgba(160, 160, 165, 0.40)',
    border: 'rgba(160, 160, 165, 0.25)',
    borderActive: 'rgb(180, 180, 185)',

    // High-contrast typography & icons
    textPrimary: '#F2F2F5',
    textSecondary: 'rgb(180, 180, 186)',
    textMuted: 'rgb(120, 120, 126)',
    textInverse: '#141416',

    // Soft semantic highlights
    todayGlow: 'rgba(160, 160, 165, 0.25)',
    priorityHigh: '#E57373',
    priorityMedium: '#A0A0A5',
    priorityLow: '#707075',
    donePill: '#5FB888',
    overduePill: '#D9736E',

    // Canvas Grid & HUD
    canvasGrid: 'rgba(255, 255, 255, 0.05)',
    canvasAura: 'rgba(0, 0, 0, 0.5)',
    cardShadow: 'rgba(0, 0, 0, 0.4)',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
  },
  radii: Radii,
};

export type AppTheme = typeof LightTheme;
