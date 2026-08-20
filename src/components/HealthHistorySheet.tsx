import type { JSX } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Accents, Colors, Radius, Spacing, Typography } from '../constants/theme';
import { formatShortDate } from '../services/dates';
import {
  HealthEntry,
  HealthGoals,
  formatSteps,
  formatWater,
} from '../services/health';

import { BottomSheet, sheetStyles } from './ui';

interface Props {
  visible: boolean;
  /** Recent days, oldest first — the same history the week chart is built on. */
  entries: HealthEntry[];
  goals: HealthGoals;
  onClose: () => void;
}

/**
 * The recent-days list behind "View History": one row per logged day with its
 * steps and water, newest first, and a dot marking days that met a goal.
 */
export default function HealthHistorySheet({
  visible,
  entries,
  goals,
  onClose,
}: Props): JSX.Element {
  // Newest first reads better in a list, but the chart wants oldest first, so
  // the reversal happens here rather than in the shared history fetch.
  const rows = [...entries].reverse();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={sheetStyles.title}>Recent days</Text>
      <Text style={sheetStyles.subtitle}>
        Steps and water for the days you have logged.
      </Text>

      {rows.length === 0 ? (
        <Text style={styles.empty}>Nothing logged yet.</Text>
      ) : (
        <View style={styles.list}>
          {rows.map((entry) => {
            const stepsMet = entry.steps >= goals.stepGoal;
            const waterMet = entry.waterMl >= goals.waterGoalMl;
            return (
              <View key={entry.date} style={styles.row}>
                <Text style={styles.date}>{formatShortDate(entry.date)}</Text>

                <View style={styles.metric}>
                  <Text
                    style={[styles.value, stepsMet && styles.valueMet]}>
                    {formatSteps(entry.steps)}
                  </Text>
                  <Text style={styles.unit}>steps</Text>
                </View>

                <View style={styles.metric}>
                  <Text
                    style={[styles.value, waterMet && styles.valueMet]}>
                    {formatWater(entry.waterMl)}
                  </Text>
                  <Text style={styles.unit}>water</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  date: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  metric: { width: 84, alignItems: 'flex-end' },
  value: { ...Typography.caption, color: Colors.textSecondary },
  valueMet: { color: Accents.green.dark, fontWeight: '700' },
  unit: { ...Typography.label, fontSize: 9, color: Colors.textMuted },
  empty: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
  },
});
