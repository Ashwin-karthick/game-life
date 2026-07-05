import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, glow } from '@/constants/theme';
import { HunterRankTier } from '@/types/game';

export const RANK_COLORS: Record<HunterRankTier, string> = {
  E: '#94A3B8',
  D: colors.success,
  C: colors.accentCyan,
  B: colors.accentViolet,
  A: '#F97316',
  S: colors.accentGold,
};

export const RANK_GRADIENTS: Record<HunterRankTier, readonly [string, string]> = {
  E: ['#B4C0D0', '#64748B'],
  D: ['#6EE7B7', '#0D9668'],
  C: ['#67E8F9', '#0891B2'],
  B: ['#C4B5FD', '#6D28D9'],
  A: ['#FDBA74', '#EA580C'],
  S: ['#FDE68A', '#D97706'],
};

export function RankBadge({ tier, size = 'md' }: { tier: HunterRankTier; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const color = RANK_COLORS[tier];
  const dims = size === 'xl' ? 110 : size === 'lg' ? 72 : size === 'md' ? 48 : 32;
  const fontSize = size === 'xl' ? 48 : size === 'lg' ? 30 : size === 'md' ? 20 : 13;
  const ring = size === 'sm' ? 2 : 3;

  return (
    <LinearGradient
      colors={RANK_GRADIENTS[tier]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width: dims, height: dims, borderRadius: dims / 2, padding: ring }, glow(color, 0.55, 12)]}
    >
      <View style={[styles.inner, { borderRadius: (dims - ring * 2) / 2 }]}>
        <Text style={[styles.text, { color, fontSize }]}>{tier}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.displayBlack,
  },
});
