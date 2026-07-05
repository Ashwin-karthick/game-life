import { ViewStyle } from 'react-native';

export const colors = {
  bgBase: '#070B13',
  bgSurface: '#101625',
  bgSurfaceRaised: '#1A2233',
  glass: 'rgba(255,255,255,0.06)',
  borderGlass: 'rgba(255,255,255,0.12)',
  borderGlassBright: 'rgba(255,255,255,0.22)',
  textPrimary: '#EDF2FA',
  textMuted: '#8A94A6',
  accentCyan: '#22D3EE',
  accentViolet: '#8B5CF6',
  accentGold: '#F5C451',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
};

export const fonts = {
  display: 'Orbitron_700Bold',
  displayBlack: 'Orbitron_900Black',
  heading: 'Rajdhani_700Bold',
  headingSemi: 'Rajdhani_600SemiBold',
  mono: 'SpaceMono',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

export const gradients = {
  hero: ['#132038', '#180F30'] as const,
  cyan: ['#38E1F8', '#0891B2'] as const,
  violet: ['#A78BFA', '#6D28D9'] as const,
  gold: ['#FCD34D', '#D97706'] as const,
  cardSheen: ['rgba(255,255,255,0.055)', 'rgba(255,255,255,0.012)'] as const,
};

export function glow(color: string, opacity = 0.45, shadowRadius = 14): ViewStyle {
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  };
}

export const rarityColor = {
  common: '#94A3B8',
  rare: colors.accentCyan,
  epic: colors.accentViolet,
  legendary: colors.accentGold,
};
