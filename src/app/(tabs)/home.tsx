import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { supabase } from '../../services/supabase';

export default function HomeScreen() {
  const [connectionStatus, setConnectionStatus] = useState<
    'checking' | 'ok' | 'error'
  >('checking');

  useEffect(() => {
    // Simple connectivity check — confirms Supabase is reachable.
    // Not a real auth check yet; that comes once onboarding/login exists.
    supabase.auth.getSession().then(({ error }) => {
      setConnectionStatus(error ? 'error' : 'ok');
    });
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="OneLife" />

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.chatBar}>
          <Text style={styles.chatBarText}>Ask OneLife anything...</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today's intake</Text>
          <Text style={styles.calorieText}>-- / -- kcal</Text>
          <Text style={styles.placeholderNote}>
            Nutrition data will appear here once meal logging is wired up.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Next up</Text>
        <Text style={styles.placeholderNote}>No medicines or tasks yet.</Text>

        <Text style={styles.sectionTitle}>Supabase connection</Text>
        <Text style={styles.placeholderNote}>
          {connectionStatus === 'checking' && 'Checking...'}
          {connectionStatus === 'ok' && '✅ Connected'}
          {connectionStatus === 'error' &&
            '❌ Not connected — check .env values'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  logo: { ...Typography.heading, color: Colors.textPrimary },
  statusDot: (status: 'checking' | 'ok' | 'error') => ({
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor:
      status === 'ok'
        ? Colors.accent
        : status === 'error'
          ? Colors.danger
          : Colors.textMuted,
  }),
  content: { padding: Spacing.md },
  chatBar: {
    backgroundColor: '#F2F2F7',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  chatBarText: { color: Colors.textMuted, ...Typography.body },
  card: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardLabel: { color: Colors.textSecondary, ...Typography.caption },
  calorieText: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.heading,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  placeholderNote: { color: Colors.textMuted, fontSize: 13 },
});
