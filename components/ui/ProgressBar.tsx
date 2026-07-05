import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius } from '@/constants/theme';

interface Props {
  progress: number;
  color?: string;
  height?: number;
  trackColor?: string;
}

export function ProgressBar({ progress, color = colors.accentCyan, height = 10, trackColor }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const width = useSharedValue(0);
  const flash = useSharedValue(0);

  useEffect(() => {
    // Flash white briefly when the bar gains ground, then settle with a spring.
    if (clamped > width.value + 0.002) {
      flash.value = withSequence(withTiming(0.9, { duration: 120 }), withTiming(0, { duration: 650 }));
    }
    width.value = withSpring(clamped, { damping: 18, stiffness: 140 });
  }, [clamped, width, flash]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor ?? colors.bgSurfaceRaised }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color, height }, fillStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  flash: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
  },
});
