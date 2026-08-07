import { Text, TouchableOpacity, View } from 'react-native';
import { Accent, Accents } from '../../constants/theme';
import { onboardingStyles as s } from './onboardingStyles';

interface OptionCardProps {
  emoji: string;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  multiSelect?: boolean;
  /** Selection color — border, fill, and check. Defaults to brand violet. */
  accent?: Accent;
  /** Tint behind this option's icon, when options carry their own colors
   *  (e.g. blue/pink/violet on the gender step). Defaults to `accent`. */
  iconAccent?: Accent;
}

// Driven entirely by the shared onboardingStyles sheet — no local
// StyleSheet.create here. Update sizes once in onboardingStyles.ts and every
// screen using OptionCard (Gender, Goal, Eating Style, …) picks it up.
export default function OptionCard({
  emoji,
  title,
  subtitle,
  selected,
  onPress,
  multiSelect,
  accent = Accents.violet,
  iconAccent,
}: OptionCardProps) {
  const icon = iconAccent ?? accent;

  return (
    <TouchableOpacity
      style={[
        s.optionCard,
        selected && s.optionCardSelected,
        selected && { borderColor: accent.main, backgroundColor: accent.tint },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole={multiSelect ? 'checkbox' : 'radio'}
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}>
      <View style={[s.optionIconCircle, { backgroundColor: icon.tint }]}>
        <Text style={[s.optionEmoji, { color: icon.main }]}>{emoji}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[s.optionTitle, selected && s.optionTitleSelected]}>
          {title}
        </Text>
        {subtitle && <Text style={s.optionSubtitle}>{subtitle}</Text>}
      </View>

      <View
        style={[
          multiSelect ? s.optionCheckbox : s.optionRadio,
          selected &&
            (multiSelect ? s.optionCheckboxSelected : s.optionRadioSelected),
          selected && { backgroundColor: accent.main },
        ]}>
        {selected && <Text style={s.optionCheckmark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}
