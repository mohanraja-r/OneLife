import { router } from 'expo-router';
import type { JSX } from 'react';
import { StyleProp, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { Accent, Accents } from '../../constants/theme';

import { onboardingStyles as s } from './onboardingStyles';

interface Props {
  /** Tints the "Log in" link. Defaults to brand violet. */
  accent?: Accent;
  /** Spacing to the block above — the two callers sit differently. */
  style?: StyleProp<ViewStyle>;
}

/** The "Already have an account? Log in" line closing the welcome and
 *  create-account screens. */
export default function LoginPrompt({
  accent = Accents.violet,
  style,
}: Props): JSX.Element {
  return (
    <View style={[s.loginRow, style]}>
      <Text style={s.loginPrompt}>Already have an account? </Text>
      <TouchableOpacity
        onPress={() =>
          router.push({ pathname: '/signup', params: { mode: 'login' } })
        }
        hitSlop={8}>
        <Text style={[s.loginLink, { color: accent.main }]}>Log in</Text>
      </TouchableOpacity>
    </View>
  );
}
