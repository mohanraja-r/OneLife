import { LinearGradient } from 'expo-linear-gradient';
import { Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { LucideIcon } from 'lucide-react-native';
// lucide v1 renamed HelpCircle → CircleQuestionMark.
import {
  Bell,
  BellRing,
  ChevronLeft,
  ChevronRight,
  CircleQuestionMark,
  LayoutGrid,
  LogOut,
  Menu,
  ShieldCheck,
  Stethoscope,
  Target,
  User,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Colors,
  Gradients,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { supabase } from '../services/supabase';

interface ProfileHeaderData {
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface MenuRow {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Destination for the row; rows without one are not built yet. */
  route?: Href;
  destructive?: boolean;
}

/** The account menu, in the order shown in the approved profile design. */
const MENU_ROWS: MenuRow[] = [
  { key: 'personal', label: 'Personal Information', icon: User },
  { key: 'goals', label: 'My Goals', icon: Target },
  { key: 'medical', label: 'Medical Information', icon: Stethoscope },
  { key: 'reminders', label: 'Reminders', icon: Bell },
  { key: 'connected', label: 'Connected Apps', icon: LayoutGrid },
  {
    key: 'notifications',
    label: 'Notification Settings',
    icon: BellRing,
    route: '/settings',
  },
  { key: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
  { key: 'help', label: 'Help & Support', icon: CircleQuestionMark },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<ProfileHeaderData | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  /** Loads the signed-in user's name, email and avatar for the gradient header. */
  const loadProfile = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    setProfile({
      name: data?.name ?? user.email?.split('@')[0] ?? 'Your profile',
      email: user.email ?? '',
      avatarUrl: data?.avatar_url ?? null,
    });
  };

  /** Opens a menu row's screen, or says so when that screen does not exist yet. */
  const openRow = (row: MenuRow) => {
    if (!row.route) {
      Alert.alert(row.label, 'This section is coming soon.');
      return;
    }
    router.push(row.route);
  };

  /** Signs out of Supabase and sends the user back to the auth screen. */
  const performLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      // A missing or already-expired session still means the user is signed
      // out locally, so only surface a failure if a session survived.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setLoggingOut(false);
        Alert.alert('Could not log out', error.message);
        return;
      }
    }

    setLoggingOut(false);
    router.replace('/signup');
  };

  /** Asks for confirmation before logging out. */
  const handleLogout = () => {
    Alert.alert('Log out?', 'You can log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void performLogout() },
    ]);
  };

  const initials = profile?.name
    ? profile.name.trim().slice(0, 2).toUpperCase()
    : '';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={Gradients.primary}
        start={Gradients.diagonal.start}
        end={Gradients.diagonal.end}
        style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.heroBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <ChevronLeft size={26} color={Colors.onPrimaryMuted} />
          </TouchableOpacity>

          {/* Same affordance that opened this panel — tapping it closes it. */}
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close menu">
            <Menu size={26} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: Motion.base }}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}

          <Text style={styles.name} numberOfLines={1}>
            {profile?.name ?? ' '}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {profile?.email ?? ' '}
          </Text>
        </MotiView>
      </LinearGradient>

      <View style={styles.sheet}>
        <ScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}>
          {MENU_ROWS.map((row, index) => {
            const Icon = row.icon;
            return (
              <MotiView
                key={row.key}
                from={{ opacity: 0, translateX: -10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{
                  type: 'timing',
                  duration: Motion.fast,
                  delay: Motion.enterDelay + index * Motion.stagger,
                }}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => openRow(row)}
                  accessibilityRole="button"
                  activeOpacity={0.6}>
                  <Icon
                    size={21}
                    color={Colors.textPrimary}
                    strokeWidth={1.7}
                  />
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <ChevronRight size={19} color={Colors.textMuted} />
                </TouchableOpacity>
                {index < MENU_ROWS.length - 1 && <View style={styles.divider} />}
              </MotiView>
            );
          })}

          <View style={styles.logoutSeparator} />

          <TouchableOpacity
            style={styles.row}
            onPress={handleLogout}
            disabled={loggingOut}
            accessibilityRole="button"
            activeOpacity={0.6}>
            {loggingOut ? (
              <ActivityIndicator size="small" color={Colors.danger} />
            ) : (
              <LogOut size={21} color={Colors.danger} strokeWidth={1.7} />
            )}
            <Text style={[styles.rowLabel, styles.logoutLabel]}>Logout</Text>
            <ChevronRight size={19} color={Colors.danger} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  hero: {
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.xxxl + Spacing.lg,
  },
  heroBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: Radius.round,
    borderWidth: 3,
    borderColor: Colors.onPrimaryFaint,
    marginBottom: Spacing.lg,
  },
  avatarFallback: {
    backgroundColor: Colors.onPrimaryFaint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    ...Typography.cardTitle,
    fontSize: 28,
    color: Colors.onPrimary,
  },
  name: {
    ...Typography.screenTitle,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.onPrimary,
  },
  email: {
    ...Typography.secondary,
    color: Colors.onPrimaryMuted,
    marginTop: Spacing.xs,
  },
  sheet: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    marginTop: -Spacing.xxl,
    ...Shadow.floating,
  },
  sheetContent: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.lg + Spacing.xs,
  },
  rowLabel: {
    ...Typography.body,
    fontSize: 15,
    flex: 1,
    color: Colors.textPrimary,
  },
  logoutLabel: { color: Colors.danger, fontWeight: '600' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 21 + Spacing.lg,
  },
  logoutSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
});
