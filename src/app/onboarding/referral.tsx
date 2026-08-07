import { router } from 'expo-router';
import { Gift, TicketPercent } from 'lucide-react-native';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Accents, Colors } from '../../constants/theme';
import QuestionScreen from './QuestionScreen';
import { onboardingStyles as s } from './onboardingStyles';
import { onboardingState } from './state';

const accent = Accents.violet;

export default function ReferralScreen() {
  const [code, setCode] = useState(onboardingState.referralCode ?? '');

  /** Stores the code (when entered) and moves on — also used by the skip link. */
  const proceed = (withCode: boolean) => {
    onboardingState.referralCode = withCode && code ? code : undefined;
    router.push('/onboarding/referral-source');
  };

  return (
    <QuestionScreen
      step={11}
      icon={TicketPercent}
      accent={accent}
      title="Do you have a referral code?"
      subtitle="Enter the code if you have one to unlock benefits."
      onContinue={() => proceed(true)}>
      <View style={s.inputRow}>
        <TextInput
          style={s.inputField}
          placeholder="Enter referral code"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          value={code}
          onChangeText={setCode}
          accessibilityLabel="Referral code"
        />
        <Gift size={20} color={Colors.textMuted} strokeWidth={2} />
      </View>

      <View style={[s.noteCard, { backgroundColor: accent.tint }]}>
        <View style={s.noteIcon}>
          <Gift size={20} color={accent.main} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.noteTitle}>
            You&apos;ll unlock exclusive benefits and rewards!
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => proceed(false)} hitSlop={8}>
        <Text style={[s.textLink, { color: accent.main }]}>
          I don&apos;t have a code
        </Text>
      </TouchableOpacity>
    </QuestionScreen>
  );
}
