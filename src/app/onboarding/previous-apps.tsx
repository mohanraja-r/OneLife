import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState } from './state';
import { onboardingStyles as s } from './onboardingStyles';

const APP_OPTIONS = [
  'MyFitnessPal', 'HealthifyMe', 'Fitbit', 'Medisafe', 'Google Fit', 'Apple Health', 'Samsung Health', 'Other',
];

export default function PreviousAppsScreen() {
  const [usedBefore, setUsedBefore] = useState<boolean | null>(onboardingState.usedPreviousApp ?? null);
  const [selectedApp, setSelectedApp] = useState<string | null>(onboardingState.previousAppName ?? null);

  const handleContinue = () => {
    onboardingState.usedPreviousApp = usedBefore ?? false;
    onboardingState.previousAppName = usedBefore ? selectedApp ?? undefined : undefined;
    router.push('/onboarding/referral');
  };

  const canContinue = usedBefore === false || (usedBefore === true && !!selectedApp);

  return (
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={10} />
      <Text style={s.title}>Have you used another health app before?</Text>

      <View style={s.options}>
        <OptionCard emoji="✅" title="Yes" selected={usedBefore === true} onPress={() => setUsedBefore(true)} />
        <OptionCard
          emoji="❌"
          title="No"
          selected={usedBefore === false}
          onPress={() => {
            setUsedBefore(false);
            setSelectedApp(null);
          }}
        />
      </View>

      {usedBefore && (
        <>
          <Text style={s.label}>Which one?</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {APP_OPTIONS.map((app) => (
              <OptionCard
                key={app}
                emoji="📱"
                title={app}
                selected={selectedApp === app}
                onPress={() => setSelectedApp(app)}
              />
            ))}
          </ScrollView>
        </>
      )}

      <View style={{ flex: 1 }} />
      <ContinueButton onPress={handleContinue} disabled={!canContinue} />
    </SafeAreaView>
  );
}
