import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ContinueButton from './ContinueButton';
import { Colors, Spacing } from '../../constants/theme';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to OneLife 👋</Text>
        <Text style={styles.subtitle}>
          Let's create your personalized health and wellness plan.
        </Text>
      </View>
      <ContinueButton label="Get Started" onPress={() => router.push('/onboarding/gender')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 40, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm },
  subtitle: { fontSize: 18, color: Colors.textSecondary, lineHeight: 22 },
});
