import { router } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
interface AppHeaderProps {
  title?: string; // if omitted, shows the OneLife logo instead
  showBack?: boolean;
}

// Shared header used across tabs. Matches the approved UX: logo (or screen
// title) on the left, AI assistant icon + hamburger menu on the right.
// The hamburger opens Family, Reports & exports, Settings, and Profile —
// deliberately kept out of the bottom tab bar to stay at 5 tabs max.
export default function AppHeader({ title, showBack }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <AppHeader title="OneLife" />

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push('/family');
              }}
            >
              <Text style={styles.menuItemIcon}>👨‍👩‍👧</Text>
              <Text style={styles.menuItemText}>Family</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push('/reports');
              }}
            >
              <Text style={styles.menuItemIcon}>📄</Text>
              <Text style={styles.menuItemText}>Reports &amp; exports</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push('/settings');
              }}
            >
              <Text style={styles.menuItemIcon}>⚙️</Text>
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push('/profile');
              }}
            >
              <Text style={styles.menuItemIcon}>👤</Text>
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  logo: { ...Typography.heading, color: Colors.textPrimary },
  title: { ...Typography.heading, color: Colors.textPrimary },
  backArrow: { fontSize: 28, color: Colors.textPrimary, lineHeight: 28 },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiIconText: { color: 'white', fontSize: 15 },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconText: { fontSize: 18, color: Colors.textPrimary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  menu: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 220,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xs + 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.sm + 2,
  },
  menuItemIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  menuItemText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
});
