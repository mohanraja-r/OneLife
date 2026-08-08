import type { LucideIcon } from 'lucide-react-native';
import { Check } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';

import { Accent, Accents, Colors } from '../../constants/theme';

import { onboardingStyles as s } from './onboardingStyles';

interface OptionCardProps {
  /** Lucide icon for the leading tile — preferred over `emoji`. */
  icon?: LucideIcon;
  /** Glyph fallback when no lucide icon fits (e.g. ♂ / ♀ on the gender step). */
  emoji?: string;
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
  icon: Icon,
  emoji,
  title,
  subtitle,
  selected,
  onPress,
  multiSelect,
  accent = Accents.violet,
  iconAccent,
}: OptionCardProps) {
  const iconTone = iconAccent ?? accent;

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
      <View style={[s.optionIconCircle, { backgroundColor: iconTone.tint }]}>
        {Icon ? (
          <Icon size={20} color={iconTone.main} strokeWidth={2.2} />
        ) : (
          <Text style={[s.optionEmoji, { color: iconTone.main }]}>{emoji}</Text>
        )}
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
        {selected && (
          <Check size={14} color={Colors.textInverse} strokeWidth={3} />
        )}
      </View>
    </TouchableOpacity>
  );
}
