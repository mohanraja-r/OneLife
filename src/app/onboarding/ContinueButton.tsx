import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Accent,
  Accents,
  Colors,
  Gradients,
  Opacity,
  Radius,
  Spacing,
  Typography,
  accentShadow,
} from '../../constants/theme';

interface Props {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  /** Screen accent — fills the button. Defaults to brand violet. */
  accent?: Accent;
  /** Hide the trailing arrow (e.g. terminal steps). */
  hideArrow?: boolean;
}

export default function ContinueButton({
  label = 'Continue',
  onPress,
  disabled = false,
  accent = Accents.violet,
  hideArrow = false,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[
        styles.wrapper,
        !disabled && accentShadow(accent.main),
        disabled && styles.disabled,
      ]}>
      <LinearGradient
        colors={accent.gradient}
        start={Gradients.horizontal.start}
        end={Gradients.horizontal.end}
        style={styles.button}>
        <Text style={styles.label}>{label}</Text>
        {!hideArrow && (
          <View style={styles.arrow}>
            <ArrowRight
              size={18}
              color={Colors.textInverse}
              strokeWidth={2.5}
            />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  disabled: {
    opacity: Opacity.disabled,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg + 2,
    paddingHorizontal: Spacing.xxl,
  },
  label: {
    ...Typography.button,
    color: Colors.textInverse,
  },
  arrow: {
    justifyContent: 'center',
  },
});
