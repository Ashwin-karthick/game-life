import { useEffect } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextStyle, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface Props {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * A number that rolls up to its value instead of snapping.
 * An invisible Text with the final string sizes the layout exactly;
 * the animated input is overlaid on top.
 */
export function CountUp({ value, prefix = '', suffix = '', duration = 800, style }: Props) {
  const v = useSharedValue(0);
  const finalText = `${prefix}${Math.round(value)}${suffix}`;

  useEffect(() => {
    v.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, duration, v]);

  const animatedProps = useAnimatedProps(() => {
    return { text: `${prefix}${Math.round(v.value)}${suffix}` } as any;
  });

  return (
    <View>
      <Text style={[style, styles.ghost]} numberOfLines={1}>
        {finalText}
      </Text>
      <AnimatedTextInput
        editable={false}
        underlineColorAndroid="transparent"
        defaultValue={`${prefix}0${suffix}`}
        animatedProps={animatedProps}
        style={[style, styles.overlay]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    opacity: 0,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    padding: 0,
    margin: 0,
  },
});
