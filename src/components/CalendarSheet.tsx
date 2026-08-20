import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { type JSX, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  Colors,
  Radius,
  Spacing,
  Typography,
} from '../constants/theme';
import { startOfToday, toDateString } from '../services/dates';
import { getTaskCountsForRange } from '../services/planner';

import AnimatedPressable from './AnimatedPressable';
import { BottomSheet, sheetStyles } from './ui';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** The first day of the month the given date falls in, at local midnight. */
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Every cell of a Monday-first month grid, including the neighbouring days that
 * pad out the first and last weeks so the rows stay square.
 */
function buildMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  // getDay() is Sunday-first; shift it so Monday leads the week.
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate();

  return Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = new Date(first);
    day.setDate(first.getDate() - lead + i);
    return day;
  });
}

interface Props {
  visible: boolean;
  /** The day the planner is currently showing. */
  selectedDate: Date;
  /** Fires with the day the user picked. */
  onSelect: (date: Date) => void;
  onClose: () => void;
}

/**
 * Month calendar in a bottom sheet: browse any month, see which days already
 * have tasks, and pick the day the planner should show.
 */
export default function CalendarSheet({
  visible,
  selectedDate,
  onSelect,
  onClose,
}: Props): JSX.Element {
  const [month, setMonth] = useState(() => startOfMonth(selectedDate));
  const [counts, setCounts] = useState<Record<string, number>>({});

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const todayKey = toDateString(new Date());
  const selectedKey = toDateString(selectedDate);

  // Reopening the sheet lands on the month the planner is showing, however far
  // the user browsed away last time.
  useEffect(() => {
    if (visible) setMonth(startOfMonth(selectedDate));
  }, [visible, selectedDate]);

  useEffect(() => {
    if (!visible) return;
    let active = true;

    getTaskCountsForRange(
      toDateString(grid[0]),
      toDateString(grid[grid.length - 1])
    )
      .then((result) => {
        if (active) setCounts(result);
      })
      // The dots are decoration — a failed count just leaves the grid bare.
      .catch(() => {
        if (active) setCounts({});
      });

    return () => {
      active = false;
    };
  }, [visible, grid]);

  /** Moves the grid a whole month forward or back. */
  const shiftMonth = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  return (
    <BottomSheet visible={visible} onClose={onClose} grabberGap={Spacing.lg}>
      <View style={styles.monthRow}>
        <TouchableOpacity
          onPress={() => shiftMonth(-1)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Previous month">
          <ChevronLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Text style={sheetStyles.pickerTitle}>
          {month.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })}
        </Text>

        <TouchableOpacity
          onPress={() => shiftMonth(1)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Next month">
          <ChevronRight size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.cell}>
            <Text style={styles.weekdayLabel}>{label}</Text>
          </View>
        ))}

        {grid.map((day) => {
          const key = toDateString(day);
          const isSelected = key === selectedKey;
          const isToday = key === todayKey;
          const isOutside = day.getMonth() !== month.getMonth();

          return (
            <AnimatedPressable
              key={key}
              onPress={() => onSelect(day)}
              style={styles.cell}>
              <View
                style={[
                  styles.dayCircle,
                  isToday && !isSelected && styles.dayCircleToday,
                  isSelected && styles.dayCircleSelected,
                ]}>
                <Text
                  style={[
                    styles.dayNumber,
                    isOutside && styles.dayNumberOutside,
                    isToday && !isSelected && styles.dayNumberToday,
                    isSelected && styles.dayNumberSelected,
                  ]}>
                  {day.getDate()}
                </Text>
              </View>
              {/* Always laid out, so a day gaining a task doesn't shift the row. */}
              <View
                style={[
                  styles.dot,
                  !!counts[key] && !isSelected && styles.dotFilled,
                ]}
              />
            </AnimatedPressable>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={() => onSelect(startOfToday())}
        style={sheetStyles.cancel}
        accessibilityRole="button"
        activeOpacity={0.6}>
        <Text style={styles.todayAction}>Jump to today</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  weekdayLabel: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
    paddingBottom: Spacing.xs,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleToday: {
    backgroundColor: Colors.primaryTint,
  },
  dayCircleSelected: {
    backgroundColor: Colors.primary,
  },
  dayNumber: {
    ...Typography.caption,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dayNumberOutside: { color: Colors.textMuted },
  dayNumberToday: { color: Colors.primary, fontWeight: '700' },
  dayNumberSelected: { color: Colors.onPrimary, fontWeight: '700' },
  dot: {
    width: 5,
    height: 5,
    borderRadius: Radius.round,
    marginTop: 3,
    backgroundColor: Colors.surfaceTransparent,
  },
  dotFilled: { backgroundColor: Colors.primary },
  todayAction: {
    ...Typography.button,
    fontSize: 15,
    color: Colors.primary,
  },
});
