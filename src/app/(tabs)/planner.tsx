import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  Briefcase,
  CalendarDays,
  Check,
  Dumbbell,
  House,
  Pill,
  Plus,
  Utensils,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimatedPressable from '../../components/AnimatedPressable';
import FloatingNav from '../../components/FloatingNav';
import {
  Accent,
  Accents,
  Colors,
  Gradients,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import {
  PlannerTask,
  TaskCategory,
  getTasksForDate,
  toggleTaskComplete,
} from '../../services/planner';
import {
  ContextItem,
  ContextKind,
  getTasksContextForDate,
} from '../../services/plannerContext';
import { supabase } from '../../services/supabase';

/** The icon tile and accent a timeline row is drawn with. */
interface RowVisual {
  icon: LucideIcon;
  accent: Accent;
}

/** Task categories keep one colour each, so a row reads before you do. */
const CATEGORY_VISUALS: Record<TaskCategory, RowVisual> = {
  work: { icon: Briefcase, accent: Accents.blue },
  personal: { icon: House, accent: Accents.violet },
  fitness: { icon: Dumbbell, accent: Accents.orange },
};

/** Read-only markers reuse the colour their own tab uses. */
const CONTEXT_VISUALS: Record<ContextKind, RowVisual> = {
  medicine: { icon: Pill, accent: Accents.violet },
  meal: { icon: Utensils, accent: Accents.green },
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Formats a Date as a local YYYY-MM-DD key, matching how tasks are stored. */
function toDateString(d: Date) {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Returns the Monday-to-Sunday week containing the given date. */
function getWeek(date: Date) {
  const start = new Date(date);
  // getDay() is Sunday-first; shift it so Monday is index 0.
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Renders an HH:MM time as "8:00 AM". */
function formatTime12h(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Picks the greeting that matches the current time of day. */
function greetingFor(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** One row of the day: an editable planner task, or a read-only tracker marker. */
type TimelineEntry =
  | { key: string; sortKey: string; type: 'task'; task: PlannerTask }
  | { key: string; sortKey: string; type: 'context'; item: ContextItem };

export default function PlannerScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userName, setUserName] = useState('there');
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Loads the tasks and the meal/medicine markers for one day together. */
  const loadDay = useCallback(async (date: Date, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setError(null);
      const dateStr = toDateString(date);
      const [taskList, context] = await Promise.all([
        getTasksForDate(dateStr),
        getTasksContextForDate(dateStr),
      ]);
      setTasks(taskList);
      setContextItems(context);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this day.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /** Reads the signed-in user's first name for the hero greeting. */
  const loadName = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .maybeSingle();

    const profile = data as { name?: string | null } | null;
    const name = profile?.name ?? user.email?.split('@')[0];
    if (name) setUserName(name.split(' ')[0]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDay(selectedDate);
      void loadName();
    }, [selectedDate, loadDay, loadName])
  );

  /** Flips a task's completion state, then reloads the day. */
  const toggleTask = async (task: PlannerTask) => {
    try {
      await toggleTaskComplete(task.id, !task.completed);
      await loadDay(selectedDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update that task.');
    }
  };

  const week = useMemo(() => getWeek(selectedDate), [selectedDate]);
  const todayKey = toDateString(new Date());
  const selectedKey = toDateString(selectedDate);

  // Untimed ("all day") tasks lead the list — an empty sort key sorts first.
  const timeline = useMemo<TimelineEntry[]>(
    () =>
      [
        ...tasks.map<TimelineEntry>((task) => ({
          key: `task-${task.id}`,
          sortKey: task.time ?? '',
          type: 'task',
          task,
        })),
        ...contextItems.map<TimelineEntry>((item, i) => ({
          key: `context-${i}`,
          sortKey: item.time,
          type: 'context',
          item,
        })),
      ].sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
    [tasks, contextItems]
  );

  const doses = contextItems.filter((c) => c.kind === 'medicine');
  const summary = [
    {
      value: String(tasks.filter((t) => !t.completed).length),
      caption: 'Tasks left',
    },
    {
      value: String(tasks.filter((t) => t.completed).length),
      caption: 'Completed',
    },
    {
      value: `${doses.filter((d) => d.status === 'done').length}/${doses.length}`,
      caption: 'Doses taken',
    },
    {
      value: String(contextItems.filter((c) => c.kind === 'meal').length),
      caption: 'Meals logged',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadDay(selectedDate, true)}
            tintColor={Colors.primary}
          />
        }>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Planner</Text>
          <AnimatedPressable
            onPress={() => setSelectedDate(new Date())}
            style={styles.todayButton}>
            <CalendarDays size={18} color={Colors.primary} strokeWidth={2} />
          </AnimatedPressable>
        </View>

        {/* Hero: greeting over the brand gradient, with the week strip inset
            into its lower edge the way the reference design has it. */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: Motion.slow }}
          style={styles.heroCard}>
          <LinearGradient
            colors={Gradients.primary}
            start={Gradients.diagonal.start}
            end={Gradients.diagonal.end}
            style={styles.heroGradient}>
            <Text style={styles.heroGreeting}>
              {greetingFor(new Date())}, {userName}! ☀️
            </Text>
            <Text style={styles.heroSubtitle}>Let’s make today amazing</Text>

            <View style={styles.weekStrip}>
              {week.map((day, index) => {
                const dayKey = toDateString(day);
                const isSelected = dayKey === selectedKey;
                const isToday = dayKey === todayKey;
                return (
                  <AnimatedPressable
                    key={dayKey}
                    onPress={() => setSelectedDate(day)}
                    style={styles.dayColumn}>
                    <Text style={styles.dayLabel}>{WEEKDAY_LABELS[index]}</Text>
                    <MotiView
                      animate={{
                        backgroundColor: isSelected
                          ? Colors.primary
                          : Colors.surfaceTransparent,
                      }}
                      transition={{ type: 'timing', duration: Motion.fast }}
                      style={styles.dayPill}>
                      <Text
                        style={[
                          styles.dayNumber,
                          isToday && styles.dayNumberToday,
                          isSelected && styles.dayNumberSelected,
                        ]}>
                        {day.getDate()}
                      </Text>
                    </MotiView>
                  </AnimatedPressable>
                );
              })}
            </View>
          </LinearGradient>
        </MotiView>

        <Text style={styles.sectionTitle}>Today’s Summary</Text>

        <View style={styles.summaryGrid}>
          {summary.map((tile, index) => (
            <MotiView
              key={tile.caption}
              from={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'timing',
                duration: Motion.base,
                delay: 100 + index * Motion.stagger,
              }}
              style={styles.summaryCard}>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {tile.value}
              </Text>
              <Text style={styles.summaryCaption}>{tile.caption}</Text>
            </MotiView>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Upcoming</Text>

        {!!error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <AnimatedPressable onPress={() => void loadDay(selectedDate)}>
              <Text style={styles.errorRetry}>Try again</Text>
            </AnimatedPressable>
          </View>
        )}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : timeline.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyTile}>
              <CalendarDays size={26} color={Colors.primary} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>Nothing scheduled</Text>
            <Text style={styles.emptySubtitle}>
              Add a task and it will show up here alongside the meals and doses
              you log that day.
            </Text>
          </View>
        ) : (
          timeline.map((entry, index) => {
            const visual =
              entry.type === 'task'
                ? CATEGORY_VISUALS[entry.task.category]
                : CONTEXT_VISUALS[entry.item.kind];
            const Icon = visual.icon;
            const done =
              entry.type === 'task'
                ? entry.task.completed
                : entry.item.status === 'done';
            const time =
              entry.type === 'task'
                ? entry.task.time
                  ? formatTime12h(entry.task.time)
                  : 'All day'
                : formatTime12h(entry.item.time);

            const body = (
              <>
                <Text style={[styles.rowTime, { color: visual.accent.main }]}>
                  {time}
                </Text>
                <View
                  style={[
                    styles.rowTile,
                    { backgroundColor: visual.accent.tint },
                  ]}>
                  <Icon size={18} color={visual.accent.main} strokeWidth={2} />
                </View>
                <View style={styles.rowText}>
                  <Text
                    style={[styles.rowTitle, done && styles.rowTitleDone]}
                    numberOfLines={1}>
                    {entry.type === 'task'
                      ? entry.task.title
                      : entry.item.label}
                  </Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {entry.type === 'task'
                      ? entry.task.category
                      : entry.item.detail}
                  </Text>
                </View>
              </>
            );

            return (
              <MotiView
                key={entry.key}
                from={{ opacity: 0, translateX: -12 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{
                  type: 'timing',
                  duration: Motion.fast,
                  delay: Motion.enterDelay + index * Motion.stagger,
                }}>
                {entry.type === 'task' ? (
                  <AnimatedPressable
                    onPress={() =>
                      router.push({
                        pathname: '/add-task',
                        params: { taskId: entry.task.id },
                      })
                    }
                    style={styles.row}>
                    {body}
                    <AnimatedPressable
                      onPress={() => void toggleTask(entry.task)}>
                      <View style={[styles.check, done && styles.checkDone]}>
                        {done && (
                          <Check
                            size={13}
                            color={Colors.textInverse}
                            strokeWidth={3}
                          />
                        )}
                      </View>
                    </AnimatedPressable>
                  </AnimatedPressable>
                ) : (
                  // Meals and doses are mirrored here for context only — they
                  // are edited on their own tabs, so this row is not tappable.
                  <View style={styles.row}>
                    {body}
                    <View style={[styles.check, done && styles.checkDone]}>
                      {done && (
                        <Check
                          size={13}
                          color={Colors.textInverse}
                          strokeWidth={3}
                        />
                      )}
                    </View>
                  </View>
                )}
              </MotiView>
            );
          })
        )}

        <AnimatedPressable
          onPress={() =>
            router.push({
              pathname: '/add-task',
              params: { date: selectedKey },
            })
          }
          style={styles.addButton}>
          <LinearGradient
            colors={Gradients.primary}
            start={Gradients.horizontal.start}
            end={Gradients.horizontal.end}
            style={styles.addButtonFill}>
            <Plus size={20} color={Colors.textInverse} strokeWidth={2.4} />
            <Text style={styles.addButtonText}>Add Task</Text>
          </LinearGradient>
        </AnimatedPressable>

        <View style={{ height: Spacing.navClearance }} />
      </ScrollView>

      <FloatingNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  screenTitle: {
    ...Typography.screenTitle,
    color: Colors.textPrimary,
  },
  todayButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
    ...Shadow.glow,
  },
  heroGradient: {
    padding: Spacing.xl,
  },
  heroGreeting: {
    ...Typography.cardTitle,
    color: Colors.onPrimary,
  },
  heroSubtitle: {
    ...Typography.secondary,
    color: Colors.onPrimaryMuted,
    marginTop: Spacing.xs,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xl,
  },
  dayColumn: {
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  dayLabel: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
  },
  dayPill: {
    width: 30,
    height: 30,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dayNumberToday: { color: Colors.primary },
  dayNumberSelected: { color: Colors.onPrimary },

  sectionTitle: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  summaryGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    ...Shadow.card,
  },
  summaryValue: {
    ...Typography.metricValue,
    fontSize: 20,
    lineHeight: 26,
    color: Colors.textPrimary,
  },
  summaryCaption: {
    ...Typography.label,
    fontSize: 10,
    lineHeight: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  rowTime: {
    ...Typography.label,
    width: 58,
  },
  rowTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.tile,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: {
    ...Typography.optionLabel,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  rowTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  rowSubtitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },

  loading: { paddingVertical: Spacing.xxxl, alignItems: 'center' },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadow.card,
  },
  emptyTile: {
    width: 56,
    height: 56,
    borderRadius: Radius.tile,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  errorCard: {
    backgroundColor: Colors.errorTint,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { ...Typography.secondary, color: Colors.error },
  errorRetry: {
    ...Typography.secondary,
    fontWeight: '600',
    color: Colors.error,
    marginTop: Spacing.xs,
  },

  addButton: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  addButtonFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  addButtonText: {
    ...Typography.button,
    color: Colors.textInverse,
  },
});
