import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Cake, CalendarDays } from 'lucide-react-native';
import { MotiView } from 'moti';
import { type JSX, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Accents, Colors, Motion, Radius } from '../../constants/theme';

import { onboardingStyles as s } from './onboardingStyles';
import QuestionScreen from './QuestionScreen';
import { onboardingState } from './state';

const accent = Accents.violet;

/** Returns whole years elapsed between a birth date and today. */
function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default function DateOfBirthScreen(): JSX.Element {
  const [date, setDate] = useState<Date>(
    onboardingState.dateOfBirth
      ? new Date(onboardingState.dateOfBirth)
      : new Date(2000, 0, 1)
  );

  const age = calculateAge(date);

  const handleContinue = () => {
    onboardingState.dateOfBirth = date.toISOString().slice(0, 10);
    // Height and Weight are a single combined screen — see height-weight.tsx
    router.push('/onboarding/height-weight');
  };

  return (
    <QuestionScreen
      step={2}
      icon={CalendarDays}
      accent={accent}
      title="What's your date of birth?"
      subtitle="Your age helps us tailor your plan better."
      onContinue={handleContinue}>
      <View style={s.pickerWrapper}>
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          accentColor={accent.main}
          textColor={Colors.textPrimary}
          onChange={(_, selectedDate) => selectedDate && setDate(selectedDate)}
        />
      </View>

      <MotiView
        key={age}
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: Motion.fast }}
        style={[s.agePreview, { backgroundColor: accent.tint }]}>
        <View style={styles.ageIcon}>
          <Cake size={20} color={accent.main} strokeWidth={2} />
        </View>
        <View>
          <Text style={s.agePreviewLabel}>You are</Text>
          <Text style={s.agePreviewValue}>{age} years old</Text>
        </View>
      </MotiView>
    </QuestionScreen>
  );
}

const styles = StyleSheet.create({
  ageIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
