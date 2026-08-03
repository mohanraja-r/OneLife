import { View, Text, TouchableOpacity } from 'react-native';
import { onboardingStyles as s } from './onboardingStyles';

interface OptionCardProps {
  emoji: string;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  multiSelect?: boolean;
}

// Now driven entirely by the shared onboardingStyles sheet — no local
// StyleSheet.create here. Update font sizes once in onboardingStyles.ts
// and every screen using OptionCard (Gender, Goal, Eating Style, etc.)
// picks it up automatically.
export default function OptionCard({
  emoji,
  title,
  subtitle,
  selected,
  onPress,
  multiSelect,
}: OptionCardProps) {
  return (
    <TouchableOpacity
      style={[s.optionCard, selected && s.optionCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={s.optionIconCircle}>
        <Text style={s.optionEmoji}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.optionTitle}>{title}</Text>
        {subtitle && <Text style={s.optionSubtitle}>{subtitle}</Text>}
      </View>
      {multiSelect ? (
        <View style={[s.optionCheckbox, selected && s.optionCheckboxSelected]}>
          {selected && <Text style={s.optionCheckmark}>✓</Text>}
        </View>
      ) : (
        <View style={[s.optionRadio, selected && s.optionRadioSelected]}>
          {selected && <View style={s.optionRadioDot} />}
        </View>
      )}
    </TouchableOpacity>
  );
}
