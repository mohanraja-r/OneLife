import type { LucideIcon } from 'lucide-react-native';
import type { JSX } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Accent,
  Accents,
  Colors,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';

interface Props {
  /** Glyph for the round tinted tile above the message. */
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Tints the icon tile. Defaults to brand violet. */
  accent?: Accent;
  /** Rendered under the message — usually the primary "add" action. */
  children?: React.ReactNode;
}

/**
 * The "nothing here yet" card: a tinted glyph, a headline and a line of
 * guidance, with room for a call to action underneath.
 */
export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  accent = Accents.violet,
  children,
}: Props): JSX.Element {
  return (
    <View style={styles.card}>
      <View style={[styles.tile, { backgroundColor: accent.tint }]}>
        <Icon size={26} color={accent.main} strokeWidth={1.8} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    ...Shadow.card,
  },
  tile: {
    width: 56,
    height: 56,
    borderRadius: Radius.tile,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.cardTitle, color: Colors.textPrimary },
  subtitle: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
