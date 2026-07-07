import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, glow, radius, spacing } from '@/constants/theme';

interface Props extends PropsWithChildren {
  title?: string;
  color?: string;
}

/** Solo Leveling-style "System" notification box for empty states and callouts. */
export function SystemMessage({ title = 'SYSTEM', color = colors.accentCyan, children }: Props) {
  return (
    <View style={[styles.box, { borderColor: `${color}55` }, glow(color, 0.18, 14)]}>
      <View style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.header, { color }]}>{title}</Text>
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: 'rgba(34,211,238,0.05)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(2),
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  header: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 3,
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
