import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { CalendarDays, Cake } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Accents, Colors, Motion, Radius } from '../../constants/theme';
import ContinueButton from './ContinueButton';
import OnboardingProgress from './OnboardingProgress';
import { onboardingStyles as s } from './onboardingStyles';
import { onboardingState } from './state';

const accent = Accents.violet;

function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default function DateOfBirthScreen() {
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
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={2} accent={accent} />

      <View style={s.content}>
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: Motion.slow }}
          style={[s.iconTile, { backgroundColor: accent.tint }]}>
          <CalendarDays size={32} color={accent.main} strokeWidth={2} />
        </MotiView>

        <Text style={s.title}>What&apos;s your date of birth?</Text>
        <Text style={s.subtitle}>
          Your age helps us tailor your plan better.
        </Text>

        <View style={s.pickerWrapper}>
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            accentColor={accent.main}
            textColor={Colors.textPrimary}
            onChange={(_, selectedDate) =>
              selectedDate && setDate(selectedDate)
            }
          />
        </View>

        <MotiView
          key={age}
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: Motion.fast }}
          style={[s.agePreview, { backgroundColor: accent.tint }]}>
          <View style={[styles.ageIcon, { backgroundColor: Colors.surface }]}>
            <Cake size={20} color={accent.main} strokeWidth={2} />
          </View>
          <View>
            <Text style={s.agePreviewLabel}>You are</Text>
            <Text style={s.agePreviewValue}>{age} years old</Text>
          </View>
        </MotiView>
      </View>

      <View style={s.footer}>
        <ContinueButton onPress={handleContinue} accent={accent} />
      </View>
    </SafeAreaView>
  );
}

const styles = {
  ageIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
};
