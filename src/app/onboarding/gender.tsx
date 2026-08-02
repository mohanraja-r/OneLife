import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { onboardingState, Gender } from './state';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

export default function GenderSelectionScreen() {
  const selectGender = (gender: Gender) => {
    onboardingState.gender = gender;
    router.push('/onboarding/body-stats');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.progressBar, i <= 1 && styles.progressBarActive]} />
        ))}
      </View>

      <Text style={styles.title}>A bit about you</Text>
      <Text style={styles.subtitle}>Helps us personalize your daily targets and tabs.</Text>

      <View style={styles.options}>
        {GENDERS.map((g) => (
          <TouchableOpacity key={g.value} style={styles.option} onPress={() => selectGender(g.value)}>
            <Text style={styles.optionText}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Selecting Woman unlocks a Women's Health tab for cycle and pregnancy tracking. You can
          turn this off anytime in Settings.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.xl },
  progressBar: { height: 4, flex: 1, backgroundColor: '#EFEEE8', borderRadius: 2 },
  progressBarActive: { backgroundColor: Colors.accent },
  title: { ...Typography.title, color: Colors.textPrimary, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.xl },
  options: { gap: Spacing.md, marginBottom: Spacing.lg },
  option: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  optionText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  note: { backgroundColor: '#F0F7FF', borderRadius: Radius.sm, padding: Spacing.md },
  noteText: { fontSize: 12, color: '#3D6FA8', lineHeight: 18 },
});
