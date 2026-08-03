import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState } from './_state';
import { Colors, Spacing } from '../../constants/theme';

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
    <SafeAreaView style={styles.container}>
      <OnboardingProgress step={11} />
      <Text style={styles.title}>Have you used another health app before?</Text>

      <View style={styles.yesNoRow}>
        <OptionCard
          emoji="✅"
          title="Yes"
          selected={usedBefore === true}
          onPress={() => setUsedBefore(true)}
        />
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
          <Text style={styles.subQuestion}>Which one?</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  yesNoRow: { marginBottom: Spacing.md },
  subQuestion: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.md },
});
