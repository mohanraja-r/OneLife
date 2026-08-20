import { LinearGradient } from 'expo-linear-gradient';
import { Href, router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
// lucide v1 renamed HelpCircle → CircleQuestionMark.
import {
  Bell,
  BellRing,
  ChevronRight,
  CircleQuestionMark,
  FileText,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  Stethoscope,
  Target,
  User,
  Users,
  Venus,
  X,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { type JSX, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
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
import { useProfileSummary } from '../services/profile';
import { supabase } from '../services/supabase';

interface MenuRow {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Destination for the row; rows without one are not built yet. */
  route?: Href;
  /** Only shown to users whose profile gender is `woman`. */
  womenOnly?: boolean;
}

/**
 * The account menu, in the order shown in the approved profile design.
 *
 * This drawer is the only way into several destinations now: Family and Reports
 * moved here when the header's old hamburger menu went, Women's Health when the
 * bottom bar was fixed to the same tabs for everyone, and the rest when the
 * Profile tab was dropped from the bottom bar in favour of this drawer.
 */
const MENU_ROWS: MenuRow[] = [
  {
    key: 'personal',
    label: 'Personal Information',
    icon: User,
    route: '/personal-information',
  },
  {
    key: 'women',
    label: "Women's Health",
    icon: Venus,
    route: '/(tabs)/women',
    womenOnly: true,
  },
  { key: 'goals', label: 'My Goals', icon: Target },
  {
    key: 'medical',
    label: 'Medical Information',
    icon: Stethoscope,
    route: '/medical-information',
  },
  { key: 'family', label: 'Family', icon: Users, route: '/family' },
  { key: 'reminders', label: 'Reminders', icon: Bell },
  { key: 'connected', label: 'Connected Apps', icon: LayoutGrid },
  {
    key: 'reports',
    label: 'Reports & Exports',
    icon: FileText,
    route: '/reports',
  },
  {
    key: 'notifications',
    label: 'Notification Settings',
    icon: BellRing,
    route: '/settings',
  },
  { key: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
  { key: 'help', label: 'Help & Support', icon: CircleQuestionMark },
];

/** Share of the screen width the panel covers. */
const WIDTH_FRACTION = 0.75;

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * The account hub as a side drawer: the profile header and the full account
 * menu on a panel covering 75% of the screen, sliding in from the left edge
 * over a dimmed backdrop that closes it on tap.
 */
export default function ProfileDrawer({ visible, onClose }: Props): JSX.Element {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // The same cached read the header uses, so an edit made on the Personal
  // Information screen lands here the moment it is saved.
  const profile = useProfileSummary();
  const [loggingOut, setLoggingOut] = useState(false);
  // Holds the modal open through the closing slide — dropping it the moment
  // `visible` flips would make the panel vanish instead of animating out.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  const panelWidth = Math.round(width * WIDTH_FRACTION);

  const womensHealth = profile?.gender === 'woman';
  const rows = useMemo(
    () => MENU_ROWS.filter((row) => !row.womenOnly || womensHealth),
    [womensHealth]
  );

  /** Opens a menu row's screen, or says so when that screen does not exist yet. */
  const openRow = (row: MenuRow) => {
    if (!row.route) {
      // Left open on purpose: an Alert fired while this modal is dismissing is
      // silently dropped on iOS.
      Alert.alert(row.label, 'This section is coming soon.');
      return;
    }
    onClose();
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
    onClose();
    router.replace({ pathname: '/signup', params: { mode: 'login' } });
  };

  /** Asks for confirmation before logging out. */
  const handleLogout = () => {
    Alert.alert('Log out?', 'You can log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => void performLogout(),
      },
    ]);
  };

  const initials = profile?.name
    ? profile.name.trim().slice(0, 2).toUpperCase()
    : '';

  return (
    <Modal
      visible={mounted}
      transparent
      // The panel and backdrop run their own timings, so the modal itself must
      // not add a second one on top.
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.fill}>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ type: 'timing', duration: Motion.base }}
          style={[StyleSheet.absoluteFill, styles.backdrop]}>
          <Pressable
            style={styles.fill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close profile menu"
          />
        </MotiView>

        <MotiView
          from={{ translateX: -panelWidth }}
          animate={{ translateX: visible ? 0 : -panelWidth }}
          transition={{ type: 'timing', duration: Motion.base }}
          onDidAnimate={(key, finished) => {
            if (key === 'translateX' && finished && !visible) setMounted(false);
          }}
          style={[styles.panel, { width: panelWidth }]}>
          <LinearGradient
            colors={Gradients.primary}
            start={Gradients.diagonal.start}
            end={Gradients.diagonal.end}
            style={[styles.hero, { paddingTop: insets.top + Spacing.md }]}>
            <View style={styles.heroBar}>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close profile menu">
                <X size={22} color={Colors.onPrimaryMuted} />
              </TouchableOpacity>
            </View>

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
          </LinearGradient>

          <ScrollView
            contentContainerStyle={[
              styles.menu,
              { paddingBottom: insets.bottom + Spacing.xl },
            ]}
            showsVerticalScrollIndicator={false}>
            {rows.map((row, index) => {
              const Icon = row.icon;
              return (
                <View key={row.key}>
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => openRow(row)}
                    accessibilityRole="button"
                    activeOpacity={0.6}>
                    <Icon size={20} color={Colors.textPrimary} strokeWidth={1.7} />
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {row.label}
                    </Text>
                    <ChevronRight size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                  {index < rows.length - 1 && <View style={styles.divider} />}
                </View>
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
                <LogOut size={20} color={Colors.danger} strokeWidth={1.7} />
              )}
              <Text style={[styles.rowLabel, styles.logoutLabel]}>Logout</Text>
              <ChevronRight size={18} color={Colors.danger} />
            </TouchableOpacity>
          </ScrollView>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { backgroundColor: Colors.overlay },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Colors.surface,
    borderTopRightRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.floating,
  },
  hero: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  heroBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.round,
    borderWidth: 3,
    borderColor: Colors.onPrimaryFaint,
    marginBottom: Spacing.md,
  },
  avatarFallback: {
    backgroundColor: Colors.onPrimaryFaint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    ...Typography.cardTitle,
    fontSize: 22,
    color: Colors.onPrimary,
  },
  name: {
    ...Typography.cardTitle,
    color: Colors.onPrimary,
  },
  email: {
    ...Typography.label,
    color: Colors.onPrimaryMuted,
    marginTop: Spacing.xs,
  },
  menu: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md + Spacing.xs,
  },
  rowLabel: {
    ...Typography.body,
    fontSize: 14,
    flex: 1,
    color: Colors.textPrimary,
  },
  logoutLabel: { color: Colors.danger, fontWeight: '600' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 20 + Spacing.md,
  },
  logoutSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
});
