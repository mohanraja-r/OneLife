import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../../constants/theme';

interface Props {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function ContinueButton({ label = 'Continue', onPress, disabled }: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      // disabled={disabled}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  // buttonDisabled: { opacity: 0.35 },
  text: { color: 'white', fontSize: 20, fontWeight: '700' },
});
