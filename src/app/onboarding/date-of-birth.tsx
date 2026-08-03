import { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import OnboardingProgress from './OnboardingProgress';
import ContinueButton from './ContinueButton';
import { onboardingState } from './state';
import { onboardingStyles as s } from './onboardingStyles';

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
    // Height and Weight are a single combined screen — see height-weight.tsx
    router.push('/onboarding/height-weight');
  };

  return (
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={2} />
      <Text style={s.title}>When were you born?</Text>

      <View style={s.pickerWrapper}>
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_, selectedDate) => selectedDate && setDate(selectedDate)}
        />
      </View>

      <View style={s.agePreview}>
        <Text style={s.agePreviewText}>Age: {age} Years</Text>
      </View>

      <View style={{ flex: 1 }} />
      <ContinueButton onPress={handleContinue} />
    </SafeAreaView>
  );
}
