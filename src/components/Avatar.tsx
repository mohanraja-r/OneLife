import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text } from 'react-native';

import { Colors, Gradients, Radius, Typography } from '../constants/theme';

interface Props {
  /**
   * The photo to show. Comes from `useProfileSummary().avatarUrl`, which signs
   * the private bucket path — a raw `profiles.avatar_url` will not load.
   */
  uri: string | null;
  /** Supplies the fallback initials when there is no photo. */
  name?: string;
  size?: number;
}

/**
 * The user's profile photo, falling back to their initials on the brand
 * gradient when they have not set one.
 */
export default function Avatar({ uri, name, size = 40 }: Props) {
  const shape = { width: size, height: size, borderRadius: Radius.round };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={shape}
        accessibilityIgnoresInvertColors
        accessibilityLabel="Profile photo"
      />
    );
  }

  return (
    <LinearGradient
      colors={Gradients.avatar}
      start={Gradients.diagonal.start}
      end={Gradients.diagonal.end}
      style={[styles.fallback, shape]}>
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>
        {name?.trim().slice(0, 2).toUpperCase() ?? ''}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fallback: { justifyContent: 'center', alignItems: 'center' },
  initials: {
    ...Typography.cardTitle,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
});
