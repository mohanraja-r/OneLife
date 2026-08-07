import { router, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPressable from '../../components/AnimatedPressable';
import AppHeader from '../../components/AppHeader';
import FloatingNav from '../../components/FloatingNav';
import { Colors, Radius, Spacing } from '../../constants/theme';
import {
  getTasksForDate,
  PlannerTask,
  toggleTaskComplete,
} from '../../services/planner';
import { getTasksContextForDate } from '../../services/plannerContext';

// Rotating pastel palette — matches the reference design, where each
// timeline card gets a different soft color regardless of category.
const PALETTE = [
  { bg: '#E4DFFC', text: '#6C5CE0' }, // lavender
  { bg: '#D9F5EA', text: '#1E9E74' }, // mint
  { bg: '#FCE9D9', text: '#D97F3D' }, // peach
  { bg: '#F7DFF0', text: '#C24FA0' }, // lilac
];

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Full Sun–Sat week containing the given date, matching the reference's
// fixed week strip (not a rolling 5-day window).
function getWeek(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatTime12h(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${m ? ':' + String(m).padStart(2, '0') : ''}${period.toLowerCase()}`;
}

interface ContextItem {
  time: string;
  label: string;
  icon: string;
  status: 'done' | 'due' | 'neutral';
}

export default function PlannerScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDay = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = toDateString(date);
      const [taskList, context] = await Promise.all([
        getTasksForDate(dateStr),
        getTasksContextForDate(dateStr),
      ]);
      setTasks(taskList);
      setContextItems(context);
    } catch (err) {
      console.error('Failed to load planner day:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDay(selectedDate);
    }, [selectedDate, loadDay])
  );

  const week = getWeek(selectedDate);

  const timeline = [
    ...contextItems.map((c) => ({ type: 'context' as const, ...c })),
    ...tasks
      .filter((t) => t.time)
      .map((t) => ({ type: 'task' as const, time: t.time!, task: t })),
  ].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  const untimedTasks = tasks.filter((t) => !t.time);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Planner" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => loadDay(selectedDate)}
          />
        }>
        {/* "This week" card */}
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 280 }}
          style={styles.weekCard}>
          <View style={styles.weekCardHeader}>
            <Text style={styles.weekCardTitle}>This week</Text>
            <AnimatedPressable haptic={false}>
              <Text style={styles.seeAll}>See all</Text>
            </AnimatedPressable>
          </View>

          <View style={styles.weekRow}>
            {week.map((d) => {
              const isSelected = toDateString(d) === toDateString(selectedDate);
              return (
                <AnimatedPressable
                  key={d.toISOString()}
                  onPress={() => setSelectedDate(d)}
                  style={styles.dayPillWrap}>
                  <Text style={styles.dayLabel}>
                    {d
                      .toLocaleDateString('en-IN', { weekday: 'short' })
                      .toUpperCase()}
                  </Text>
                  <MotiView
                    animate={{
                      backgroundColor: isSelected
                        ? Colors.textPrimary
                        : 'transparent',
                      scale: isSelected ? 1 : 0.92,
                    }}
                    transition={{ type: 'spring', damping: 14 }}
                    style={styles.dayPill}>
                    <Text
                      style={[
                        styles.dayNumber,
                        isSelected && styles.dayNumberSelected,
                      ]}>
                      {String(d.getDate()).padStart(2, '0')}
                    </Text>
                  </MotiView>
                </AnimatedPressable>
              );
            })}
          </View>
        </MotiView>

        {/* Untimed tasks */}
        {untimedTasks.length > 0 && (
          <View style={styles.untimedSection}>
            {untimedTasks.map((task, i) => {
              const color = PALETTE[i % PALETTE.length];
              return (
                <MotiView
                  key={task.id}
                  from={{ opacity: 0, translateX: -12 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{
                    type: 'timing',
                    duration: 240,
                    delay: 80 + i * 50,
                  }}>
                  <AnimatedPressable
                    onPress={() =>
                      router.push({
                        pathname: '/add-task',
                        params: { taskId: task.id },
                      })
                    }
                    style={[styles.untimedCard, { backgroundColor: color.bg }]}>
                    <AnimatedPressable
                      onPress={() =>
                        toggleTaskComplete(task.id, !task.completed).then(() =>
                          loadDay(selectedDate)
                        )
                      }>
                      <View
                        style={[
                          styles.checkbox,
                          task.completed && {
                            backgroundColor: color.text,
                            borderColor: color.text,
                          },
                        ]}>
                        {task.completed && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                    </AnimatedPressable>
                    <Text
                      style={[
                        styles.taskTitle,
                        { color: color.text },
                        task.completed && styles.taskTitleDone,
                      ]}>
                      {task.title}
                    </Text>
                  </AnimatedPressable>
                </MotiView>
              );
            })}
          </View>
        )}

        {/* Timeline */}
        <View style={styles.timeline}>
          {timeline.length === 0 && untimedTasks.length === 0 && !loading && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Nothing scheduled for this day
              </Text>
            </MotiView>
          )}

          {timeline.map((item, index) => {
            const color = PALETTE[index % PALETTE.length];
            return (
              <MotiView
                key={index}
                from={{ opacity: 0, translateY: 14 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: 'timing',
                  duration: 260,
                  delay: 100 + index * 60,
                }}
                style={styles.timelineRow}>
                <Text style={styles.timelineTime}>
                  {formatTime12h(item.time)}
                </Text>

                {item.type === 'context' ? (
                  <View style={[styles.block, { backgroundColor: color.bg }]}>
                    <Text style={[styles.blockTitle, { color: color.text }]}>
                      {item.icon} {item.label}
                    </Text>
                    {item.status === 'done' && (
                      <Text style={[styles.blockCheck, { color: color.text }]}>
                        ✓
                      </Text>
                    )}
                  </View>
                ) : (
                  <AnimatedPressable
                    onPress={() =>
                      router.push({
                        pathname: '/add-task',
                        params: { taskId: item.task.id },
                      })
                    }
                    style={[styles.block, { backgroundColor: color.bg }]}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.blockTitle,
                          { color: color.text },
                          item.task.completed && styles.taskTitleDone,
                        ]}>
                        {item.task.title}
                      </Text>
                      <Text
                        style={[styles.blockSubtitle, { color: color.text }]}>
                        {formatTime12h(item.task.time!)} · {item.task.category}
                      </Text>
                    </View>
                    <AnimatedPressable
                      onPress={() =>
                        toggleTaskComplete(
                          item.task.id,
                          !item.task.completed
                        ).then(() => loadDay(selectedDate))
                      }>
                      <View
                        style={[
                          styles.checkbox,
                          item.task.completed && {
                            backgroundColor: color.text,
                            borderColor: color.text,
                          },
                        ]}>
                        {item.task.completed && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                    </AnimatedPressable>
                  </AnimatedPressable>
                )}
              </MotiView>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating add button */}
      <AnimatedPressable
        onPress={() =>
          router.push({
            pathname: '/add-task',
            params: { date: toDateString(selectedDate) },
          })
        }
        style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </AnimatedPressable>

      <FloatingNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  weekCard: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg,
    margin: Spacing.md,
    padding: Spacing.md,
  },
  weekCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  weekCardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  seeAll: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayPillWrap: { alignItems: 'center', gap: 6 },
  dayLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  dayPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  dayNumberSelected: { color: 'white' },

  untimedSection: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  untimedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.sm + 4,
  },

  timeline: { paddingHorizontal: Spacing.md },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  timelineTime: {
    width: 56,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  block: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  blockTitle: { fontSize: 14.5, fontWeight: '700' },
  blockSubtitle: { fontSize: 11.5, opacity: 0.8, marginTop: 2 },
  blockCheck: { fontSize: 14, fontWeight: '700' },

  taskTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  taskTitleDone: { textDecorationLine: 'line-through', opacity: 0.5 },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: { color: 'white', fontSize: 12, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyStateText: { color: Colors.textMuted, fontSize: 13 },

  fab: {
    position: 'absolute',
    right: Spacing.md,
    // Clears the floating nav pill so the two don't overlap.
    bottom: 120,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabText: { color: 'white', fontSize: 26, fontWeight: '600', lineHeight: 28 },
});
