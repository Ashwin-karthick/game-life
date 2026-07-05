import { BlurView } from 'expo-blur';
import { ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, glow, spacing } from '@/constants/theme';
import { selectionTick } from '@/lib/haptics';

const BAR_PADDING = 6;

// Structural subset of @react-navigation/bottom-tabs' BottomTabBarProps —
// the package is a transitive dependency of expo-router, so we can't import its types.
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
      };
    }
  >;
  navigation: {
    emit: (event: { type: string; target?: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

/** Floating glass tab bar with a sliding active indicator. */
export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const [innerWidth, setInnerWidth] = useState(0);
  const tabWidth = innerWidth / state.routes.length;
  const x = useSharedValue(0);

  useEffect(() => {
    if (tabWidth > 0) {
      x.value = withSpring(state.index * tabWidth, { damping: 16, stiffness: 180 });
    }
  }, [state.index, tabWidth, x]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={[styles.bar, { bottom: insets.bottom + 10 }, glow('#000000', 0.5, 20)]}
      onLayout={(e) => setInnerWidth(e.nativeEvent.layout.width - BAR_PADDING * 2)}
    >
      <BlurView intensity={30} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 32 }]} />
      {tabWidth > 0 && (
        <Animated.View style={[styles.indicator, { width: tabWidth }, indicatorStyle]} />
      )}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label = typeof options.title === 'string' ? options.title : route.name;

        return (
          <TabItem
            key={route.key}
            focused={focused}
            label={label}
            icon={options.tabBarIcon?.({
              focused,
              color: focused ? colors.accentCyan : colors.textMuted,
              size: 22,
            })}
            onPress={() => {
              selectionTick();
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          />
        );
      })}
    </View>
  );
}

function TabItem({
  focused,
  label,
  icon,
  onPress,
}: {
  focused: boolean;
  label: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.12 : 1, { damping: 12, stiffness: 260 });
  }, [focused, scale]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityRole="button" accessibilityLabel={label}>
      <Animated.View style={iconStyle}>{icon}</Animated.View>
      <Text style={[styles.label, { color: focused ? colors.accentCyan : colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing(4),
    right: spacing(4),
    flexDirection: 'row',
    backgroundColor: 'rgba(16,22,37,0.78)',
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: 32,
    padding: BAR_PADDING,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: BAR_PADDING,
    bottom: BAR_PADDING,
    left: BAR_PADDING,
    borderRadius: 26,
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.25)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2),
    gap: 3,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
