import { LinearGradient } from 'expo-linear-gradient';
import { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, Text, ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { colors, glow, gradients, radius, spacing } from '@/constants/theme';

interface Props extends PropsWithChildren {
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({ children, onPress, variant = 'primary', disabled, loading, style }: Props) {
  const textColor = variant === 'primary' || variant === 'danger' ? colors.bgBase : colors.textPrimary;

  const content = loading ? (
    <ActivityIndicator color={textColor} />
  ) : typeof children === 'string' ? (
    <Text style={[styles.text, { color: textColor }]}>{children}</Text>
  ) : (
    children
  );

  if (variant === 'primary') {
    return (
      <PressableScale
        onPress={onPress}
        disabled={disabled || loading}
        style={[{ opacity: disabled ? 0.5 : 1, borderRadius: radius.md }, glow(colors.accentCyan, 0.35, 10), style]}
      >
        <LinearGradient colors={gradients.cyan} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.base}>
          {content}
        </LinearGradient>
      </PressableScale>
    );
  }

  const bg =
    variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.bgSurfaceRaised : 'transparent';

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
        variant === 'ghost' ? styles.ghostBorder : null,
        variant === 'danger' ? glow(colors.danger, 0.3, 8) : null,
        style,
      ]}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(5),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing(2),
  },
  ghostBorder: {
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  text: {
    fontWeight: '700',
    fontSize: 15,
  },
});
