import * as Haptics from 'expo-haptics';
import { MotiPressable } from 'moti/interactions';
import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

interface AnimatedPressableProps {
  children: ReactNode;
  onPress?: () => void;
  // StyleProp, not ViewStyle[] — callers pass conditional arrays such as
  // [styles.box, done && styles.boxDone], whose falsy members a bare
  // ViewStyle[] rejects.
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
}

// Wraps any element with a subtle press-scale animation (0.96 on press-in,
// spring back on release) plus optional light haptic tick. Use this instead
// of a plain TouchableOpacity anywhere a tap should feel responsive —
// cards, buttons, day pills, list rows.
export default function AnimatedPressable({
  children,
  onPress,
  style,
  haptic = true,
}: AnimatedPressableProps) {
  return (
    <MotiPressable
      onPress={() => {
        if (haptic) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => {}
          );
        }
        onPress?.();
      }}
      animate={({ pressed }) => {
        'worklet';
        return {
          scale: pressed ? 0.96 : 1,
          opacity: pressed ? 0.85 : 1,
        };
      }}
      transition={{ type: 'timing', duration: 120 }}
      style={style}>
      {children}
    </MotiPressable>
  );
}
