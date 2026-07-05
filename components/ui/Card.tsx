import { LinearGradient } from 'expo-linear-gradient';
import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { colors, glow as glowStyle, gradients, radius, spacing } from '@/constants/theme';

interface Props extends PropsWithChildren {
  style?: ViewStyle;
  glow?: string;
}

export function Card({ children, style, glow }: Props) {
  return (
    <View style={[styles.card, glow ? glowStyle(glow, 0.4, 16) : null, style]}>
      <LinearGradient
        colors={gradients.cardSheen}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    padding: spacing(4),
  },
});
