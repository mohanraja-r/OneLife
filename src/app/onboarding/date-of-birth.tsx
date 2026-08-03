import { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import OnboardingProgress from './OnboardingProgress';
import ContinueButton from './ContinueButton';
import { onboardingState } from './state';
import { Colors, Spacing, Radius } from '../../constants/theme';

function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default function DateOfBirthScreen() {
  const [date, setDate] = useState<Date>(
    onboardingState.dateOfBirth ? new Date(onboardingState.dateOfBirth) : new Date(2000, 0, 1)
  );

  const age = calculateAge(date);

  const handleContinue = () => {
    onboardingState.dateOfBirth = date.toISOString().slice(0, 10);
    // Height and Weight are now a single combined screen — see height-weight.tsx
    router.push('/onboarding/height-weight');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress step={2} />
      <Text style={styles.title}>When were you born?</Text>

      <View style={styles.pickerWrapper}>
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_, selectedDate) => selectedDate && setDate(selectedDate)}
        />
      </View>

      <View style={styles.agePreview}>
        <Text style={styles.agePreviewText}>Age: {age} Years</Text>
      </View>

      <View style={{ flex: 1 }} />
      <ContinueButton onPress={handleContinue} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  pickerWrapper: { alignItems: 'center', marginBottom: Spacing.md },
  agePreview: {
    alignSelf: 'center',
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  agePreviewText: { color: '#0F6E56', fontSize: 15, fontWeight: '700' },
});
