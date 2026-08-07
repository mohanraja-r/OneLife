import { router } from 'expo-router';
import { HeartPulse } from 'lucide-react-native';
import { MotiView } from 'moti';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Accents,
  Colors,
  Motion,
  Radius,
  Spacing,
  Typography,
} from '../../constants/theme';
import PrimaryButton from '../../components/PrimaryButton';

const accent = Accents.violet;

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: Motion.slow }}
          style={styles.brand}>
          <View style={styles.logoMark}>
            <HeartPulse size={34} color={accent.main} strokeWidth={2.2} />
          </View>
          <Text style={styles.wordmark}>OneLife</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'timing',
            duration: Motion.base,
            delay: Motion.enterDelay,
          }}>
          <Text style={styles.headline}>Your health.</Text>
          <Text style={[styles.headline, styles.headlineAccent]}>
            Your way.
          </Text>
          <Text style={styles.subtitle}>
            OneLife helps you build healthy habits, stay consistent, and live
            your best life.
          </Text>
        </MotiView>
      </View>

      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'timing',
          duration: Motion.base,
          delay: Motion.enterDelay * 2,
        }}
        style={styles.footer}>
        <PrimaryButton
          label="Get Started"
          accent={accent}
          onPress={() => router.push('/onboarding/gender')}
        />
        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/signup')} hitSlop={8}>
            <Text style={styles.loginLink}>Log in</Text>
          </TouchableOpacity>
        </View>
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.screen,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: Radius.round,
    backgroundColor: accent.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  wordmark: {
    ...Typography.screenTitle,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headline: {
    ...Typography.largeHero,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headlineAccent: {
    color: accent.main,
  },
  subtitle: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  footer: {
    paddingBottom: Spacing.xxl,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  loginPrompt: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  loginLink: {
    ...Typography.caption,
    fontWeight: '700',
    color: accent.main,
  },
});
