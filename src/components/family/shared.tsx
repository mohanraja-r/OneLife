import type { JSX } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Accent } from '../../constants/theme';
import {
  Accents,
  Colors,
  Radius,
  Spacing,
  Typography,
} from '../../constants/theme';
import type { FamilyMember } from '../../services/family';

/** Pieces the Family list and the member profile draw the same way. */

/**
 * Grades an adherence percentage onto the shared accent families, so the same
 * number reads the same way on every screen: green on track, amber slipping,
 * rose needs attention.
 */
export function adherenceAccent(percent: number): Accent {
  return adherenceStatus(percent).accent;
}

/** A member's name with their relationship after it — "Emma (Partner)". */
export function nameWithRelationship(member: {
  name: string;
  relationship: string | null;
}): string {
  return member.relationship
    ? `${member.name} (${member.relationship})`
    : member.name;
}

/** How an adherence percentage is described in words, next to its colour. */
export interface AdherenceStatus {
  /** Row-level wording, e.g. "On track". */
  label: string;
  /** Score-card wording, e.g. "Excellent". */
  grade: string;
  accent: Accent;
  /** True when the row should be called out rather than just tinted. */
  urgent: boolean;
}

/** Grades an adherence percentage into the wording and colour shown for it. */
export function adherenceStatus(percent: number): AdherenceStatus {
  if (percent >= 90) {
    return {
      label: 'On track',
      grade: 'Excellent',
      accent: Accents.green,
      urgent: false,
    };
  }
  if (percent >= 80) {
    return {
      label: 'On track',
      grade: 'Good',
      accent: Accents.green,
      urgent: false,
    };
  }
  if (percent >= 50) {
    return {
      label: 'Slipping',
      grade: 'Could be better',
      accent: Accents.amber,
      urgent: false,
    };
  }
  return {
    label: 'Needs attention',
    grade: 'Needs attention',
    accent: Accents.rose,
    urgent: true,
  };
}

/**
 * The one-line summary under a member's name — "Mother · 68 · Managed", with
 * the empty parts left out rather than rendered blank.
 */
export function memberSubtitle(member: FamilyMember): string {
  return [
    member.relationship,
    member.age === null ? null : `${member.age}`,
    member.connectionType === 'managed' ? 'Managed' : 'Has the app',
  ]
    .filter(Boolean)
    .join(' · ');
}

interface AdherenceBarProps {
  /** Doses taken in the last 7 days, as a percentage of doses expected. */
  percent: number;
  /** Hide the numeral and show the track alone. */
  compact?: boolean;
}

/** A member's seven-day adherence as a graded numeral over a thin track. */
export function AdherenceBar({ percent, compact = false }: AdherenceBarProps): JSX.Element {
  const accent = adherenceAccent(percent);

  return (
    <View
      style={styles.adherence}
      accessibilityRole="progressbar"
      accessibilityLabel={`${percent}% of doses taken this week`}>
      {!compact && (
        <Text style={[styles.percent, { color: accent.dark }]}>{percent}%</Text>
      )}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            // Never fully empty: a hairline of colour reads as "none yet"
            // where a zero-width bar just looks like a missing element.
            { width: `${Math.max(percent, 3)}%`, backgroundColor: accent.main },
          ]}
        />
      </View>
    </View>
  );
}

/** The member's photo, falling back to their initials on a tinted circle. */
export function MemberInitials({
  name,
  size = 44,
}: {
  name: string;
  size?: number;
}): JSX.Element {
  return (
    <View
      style={[
        styles.initialsCircle,
        { width: size, height: size, borderRadius: Radius.round },
      ]}>
      <Text style={[styles.initials, { fontSize: size * 0.34 }]}>
        {name.trim().slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  adherence: { width: 74, alignItems: 'flex-end', gap: Spacing.xs + 1 },
  percent: {
    ...Typography.caption,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  track: {
    width: '100%',
    height: 5,
    borderRadius: Radius.round,
    backgroundColor: Colors.surfaceSunken,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: Radius.round },
  initialsCircle: {
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    ...Typography.cardTitle,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
});
