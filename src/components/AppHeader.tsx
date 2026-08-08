import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { supabase } from '../services/supabase';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
}

// Shared header used across every screen. Logo + app name (or a screen
// title) on the left, AI assistant icon + profile avatar on the right.
//
// The hamburger menu that used to sit here is gone: Profile is a bottom-bar
// destination now, and the secondary screens it held (family, reports,
// settings) are rows on the Profile screen itself.
export default function AppHeader({ title, showBack }: AppHeaderProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState('..');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;

    // Rows are untyped until DB types are generated (`supabase gen types`), so
    // declare the columns this query actually selects.
    const { data } = await supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', userId)
      .maybeSingle()
      .overrideTypes<{ name: string | null; avatar_url: string | null }>();

    if (data?.name) setInitials(data.name.slice(0, 2).toUpperCase());
    if (data?.avatar_url) setAvatarUrl(data.avatar_url);
  };

  return (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
      ) : title ? (
        <Text style={styles.title}>{title}</Text>
      ) : (
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>◐</Text>
          </View>
          <Text style={styles.logo}>OneLife</Text>
        </View>
      )}

      <View style={styles.rightIcons}>
        <TouchableOpacity style={styles.aiIcon} onPress={() => router.push('/ai-assistant')} hitSlop={4}>
          <Text style={styles.aiIconText}>✦</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/profile')} hitSlop={4}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initials}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs + 2 },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoMarkText: { color: 'white', fontSize: 14 },
  logo: { ...Typography.heading, color: Colors.textPrimary, letterSpacing: -0.3 },
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
  avatarImage: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: { color: Colors.accent, fontSize: 12, fontWeight: '700' },
});
