import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../services/supabase';
import AppHeader from '../components/AppHeader';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

interface ProfileData {
  name: string;
  goal: string;
  dietary_preference: string;
  language: string;
}

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Lose weight',
  gain_muscle: 'Gain muscle',
  maintain: 'Maintain',
  manage_condition: 'Manage a condition',
};

const DIET_LABELS: Record<string, string> = {
  veg: 'Vegetarian',
  non_veg: 'Non-vegetarian',
  eggetarian: 'Eggetarian',
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [medicineReminders, setMedicineReminders] = useState(true);
  const [plannerReminders, setPlannerReminders] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;

    const { data } = await supabase
      .from('profiles')
      .select('name, goal, dietary_preference, language')
      .eq('id', userId)
      .single();

    if (data) setProfile(data as ProfileData);
  };

  const handleLogout = () => {
    Alert.alert('Log out?', 'You can log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/signup');
        },
      },
    ]);
  };

  const initials = profile?.name ? profile.name.slice(0, 2).toUpperCase() : '..';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader showBack />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile?.name ?? '...'}</Text>
            <Text style={styles.profileSubtext}>
              Goal: {profile ? GOAL_LABELS[profile.goal] ?? profile.goal : '...'}
            </Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.group}>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowIcon}>🎯</Text>
            <Text style={styles.rowLabel}>Goals &amp; targets</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowIcon}>🥗</Text>
            <Text style={styles.rowLabel}>Dietary preference</Text>
            <Text style={styles.rowValue}>
              {profile ? DIET_LABELS[profile.dietary_preference] ?? profile.dietary_preference : '...'}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowIcon}>🌐</Text>
            <Text style={styles.rowLabel}>Language</Text>
            <Text style={styles.rowValue}>{profile?.language === 'en' ? 'English' : profile?.language ?? '...'}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowIcon}>💊</Text>
            <Text style={styles.rowLabel}>Medicine reminders</Text>
            <Switch
              value={medicineReminders}
              onValueChange={setMedicineReminders}
              trackColor={{ false: Colors.border, true: Colors.accent }}
            />
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowIcon}>📅</Text>
            <Text style={styles.rowLabel}>Planner reminders</Text>
            <Switch
              value={plannerReminders}
              onValueChange={setPlannerReminders}
              trackColor={{ false: Colors.border, true: Colors.accent }}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>FAMILY &amp; DATA</Text>
        <View style={styles.group}>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/family')}>
            <Text style={styles.rowIcon}>👨‍👩‍👧</Text>
            <Text style={styles.rowLabel}>Manage family</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowIcon}>📄</Text>
            <Text style={styles.rowLabel}>Export health report</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowIcon}>🔒</Text>
            <Text style={styles.rowLabel}>Privacy &amp; data</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  pageTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#2F7A1E', fontSize: 18, fontWeight: '700' },
  profileName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  profileSubtext: { fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  editLink: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    letterSpacing: 0.4,
  },
  group: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm + 5, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  rowIcon: { fontSize: 16, width: 22 },
  rowLabel: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  rowValue: { fontSize: 13, color: Colors.textMuted },
  chevron: { fontSize: 18, color: '#C7C7CC' },
  rowDivider: { height: 0.5, backgroundColor: Colors.border, marginLeft: Spacing.md + 22 + Spacing.sm },
  logoutButton: { paddingVertical: Spacing.md, alignItems: 'center' },
  logoutText: { color: Colors.danger, fontSize: 15, fontWeight: '600' },
});
