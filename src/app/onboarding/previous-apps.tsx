import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  Activity,
  Apple,
  CircleSlash,
  Footprints,
  Heart,
  Ellipsis,
  Smartphone,
  Watch,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { type JSX, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { Accent, Accents, Motion } from '../../constants/theme';

import { onboardingStyles as s } from './onboardingStyles';
import OptionCard from './OptionCard';
import QuestionScreen, { StaggeredOption } from './QuestionScreen';
import { onboardingState } from './state';

const accent = Accents.violet;

const APP_OPTIONS: { name: string; icon: LucideIcon; iconAccent: Accent }[] = [
  { name: 'MyFitnessPal', icon: Activity, iconAccent: Accents.blue },
  { name: 'Strava', icon: Footprints, iconAccent: Accents.orange },
  { name: 'Fitbit', icon: Watch, iconAccent: Accents.green },
  { name: 'Apple Health', icon: Heart, iconAccent: Accents.rose },
  { name: 'Google Fit', icon: Apple, iconAccent: Accents.amber },
  { name: 'Other', icon: Ellipsis, iconAccent: Accents.neutral },
];

export default function PreviousAppsScreen(): JSX.Element {
  const [usedBefore, setUsedBefore] = useState<boolean | null>(
    onboardingState.usedPreviousApp ?? null
  );
  const [selectedApp, setSelectedApp] = useState<string | null>(
    onboardingState.previousAppName ?? null
  );

  const handleContinue = () => {
    onboardingState.usedPreviousApp = usedBefore ?? false;
    onboardingState.previousAppName = usedBefore
      ? (selectedApp ?? undefined)
      : undefined;
    router.push('/onboarding/referral');
  };

  const canContinue =
    usedBefore === false || (usedBefore === true && !!selectedApp);

  return (
    <QuestionScreen
      step={10}
      icon={Smartphone}
      accent={accent}
      title="Have you used any health or fitness apps before?"
      subtitle="This helps us personalize your experience."
      onContinue={handleContinue}
      continueDisabled={!canContinue}>
      <StaggeredOption index={0}>
        <OptionCard
          icon={Smartphone}
          title="Yes, I have used apps"
          selected={usedBefore === true}
          onPress={() => setUsedBefore(true)}
          accent={Accents.green}
          iconAccent={Accents.green}
        />
      </StaggeredOption>

      <StaggeredOption index={1}>
        <OptionCard
          icon={CircleSlash}
          title="No, this is my first time"
          selected={usedBefore === false}
          onPress={() => {
            setUsedBefore(false);
            setSelectedApp(null);
          }}
          accent={accent}
          iconAccent={Accents.neutral}
        />
      </StaggeredOption>

      {usedBefore === true && (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: Motion.base }}>
          <Text style={s.sectionLabel}>Popular apps you may have used</Text>

          <View style={s.grid}>
            {APP_OPTIONS.map((app) => {
              const isSelected = selectedApp === app.name;
              return (
                <TouchableOpacity
                  key={app.name}
                  style={[
                    s.gridTile,
                    isSelected && {
                      borderColor: accent.main,
                      backgroundColor: accent.tint,
                    },
                  ]}
                  onPress={() => setSelectedApp(app.name)}
                  activeOpacity={0.85}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={app.name}>
                  <View
                    style={[
                      s.gridTileIcon,
                      { backgroundColor: app.iconAccent.tint },
                    ]}>
                    <app.icon
                      size={18}
                      color={app.iconAccent.main}
                      strokeWidth={2.2}
                    />
                  </View>
                  <Text style={s.gridTileLabel} numberOfLines={1}>
                    {app.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </MotiView>
      )}
    </QuestionScreen>
  );
}
