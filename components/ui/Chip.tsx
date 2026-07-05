import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';

interface Props {
  label: string;
  color?: string;
  active?: boolean;
}

export function Chip({ label, color = colors.accentCyan, active = true }: Props) {
  return (
    <View
      style={[
        styles.chip,
        {
          borderColor: active ? color : colors.borderGlass,
          backgroundColor: active ? `${color}22` : 'transparent',
        },
      ]}
    >
      <Text style={[styles.text, { color: active ? color : colors.textMuted }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontFamily: fonts.heading,
    letterSpacing: 1,
  },
});
