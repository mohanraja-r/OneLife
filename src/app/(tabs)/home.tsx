import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Bell,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  HeartPulse,
  type LucideIcon,
  Moon,
  Pill,
  Smile,
  Sparkles,
  TrendingUp,
  Trophy,
  User,
  Utensils,
  Zap,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { type JSX, useCallback, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AnimatedPressable from '../../components/AnimatedPressable';
import Avatar from '../../components/Avatar';
import CalendarSheet from '../../components/CalendarSheet';
import FloatingNav from '../../components/FloatingNav';
import GradientRing from '../../components/GradientRing';
import ProfileDrawer from '../../components/ProfileDrawer';
import Sparkline from '../../components/Sparkline';
import { ErrorNotice, LoadingState } from '../../components/ui';
import VitalsSheet from '../../components/VitalsSheet';
import WaterDroplet from '../../components/WaterDroplet';
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
  DashboardData,
  Insight,
  PlanCard,
  PlanKind,
  getDashboard,
} from '../../services/dashboard';
import { startOfToday, toDateString } from '../../services/dates';
import { errorMessage } from '../../services/errors';
import { formatSteps, splitWater } from '../../services/health';
import { useProfileSummary } from '../../services/profile';
import {
  VitalField,
  VitalPatch,
  isVitalsEmpty,
  setVital,
} from '../../services/vitals';

/** Diameter of the calorie ring. */
const RING_SIZE = 118;
/** Rendered width of the water droplet gauge. */
const DROPLET_SIZE = 104;
/** Diameter of the steps ring. Sized to sit level with the droplet beside it. */
const STEP_RING_SIZE = 112;
/**
 * Height both gauges centre within. The droplet renders 1.32× its width, which
 * makes it the taller of the two, so it sets the band.
 */
const GAUGE_HEIGHT = Math.round(DROPLET_SIZE * 1.32);
/** Size of a Health Overview sparkline. */
const SPARK_WIDTH = 72;
const SPARK_HEIGHT = 24;

/** Colours the three macro bars, in the order the Nutrition card lists them. */
const MACRO_COLORS = [
  Accents.violet.main,
  Accents.blue.main,
  Accents.pink.main,
] as const;

/** Icon and accent for each Today's Plan card, keyed by where it came from. */
const PLAN_STYLES: Record<PlanKind, { icon: LucideIcon; accent: Accent }> = {
  medicine: { icon: Pill, accent: Accents.violet },
  hydration: { icon: Droplets, accent: Accents.blue },
  task: { icon: CircleCheck, accent: Accents.green },
};

/** Icon and accent for each Health Overview row. */
const VITAL_STYLES: Record<VitalField, { icon: LucideIcon; accent: Accent }> = {
  heartRate: { icon: Heart, accent: Accents.rose },
  sleepMinutes: { icon: Moon, accent: Accents.violet },
  stress: { icon: Smile, accent: Accents.green },
  energy: { icon: Zap, accent: Accents.amber },
};

/** Icon per planner category, so a workout does not look like a meeting. */
const TASK_ICONS: Record<string, LucideIcon> = {
  Fitness: Dumbbell,
  Work: Briefcase,
  Personal: User,
};

/** Renders the date pill's label, e.g. `Today, Aug 15` or `Thu, Aug 14`. */
function dateLabel(date: Date, isToday: boolean): string {
  const dayAndMonth = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  if (isToday) return `Today, ${dayAndMonth}`;
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  return `${weekday}, ${dayAndMonth}`;
}

/** Where a Today's Plan card sends you when tapped. */
function planRoute(kind: PlanKind) {
  if (kind === 'medicine') return '/(tabs)/medicine' as const;
  if (kind === 'hydration') return '/(tabs)/health' as const;
  return '/(tabs)/planner' as const;
}

/**
 * Home — the dashboard: one day's nutrition, activity, hydration, schedule and
 * vitals, in the order the reference design lays them out.
 *
 * Every figure comes from the database through `getDashboard`, which composes
 * the six domain services into a single round of requests. The date pill
 * governs the whole screen rather than any one card, so no two widgets can end
 * up describing different days.
 *
 * The reference is a wide layout with separate Steps and Water cards, each
 * carrying a gauge, a chart and a quick-add row. Home shows the two counts
 * together in one Activity card instead: a dashboard answers "where am I",
 * and the Health tab it links to is where those numbers get logged and
 * broken down.
 */
export default function HomeScreen(): JSX.Element {
  const router = useRouter();
  // One cached read for both the photo and the name set on Personal Information.
  const profile = useProfileSummary();

  const [selectedDate, setSelectedDate] = useState(() => startOfToday());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editingVital, setEditingVital] = useState<VitalField | null>(null);

  const dateKey = toDateString(selectedDate);
  const isToday = dateKey === toDateString(startOfToday());

  /** Loads every figure on the screen for the selected day. */
  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await getDashboard(dateKey));
    } catch (err) {
      setError(errorMessage(err, 'Could not load your dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  // Refetched on focus so returning from Health, Medicine or the Planner shows
  // what was just logged rather than the figures this screen mounted with.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  /** Saves one logged vital and refreshes the card's readings and sparklines. */
  const saveVital = async (patch: VitalPatch) => {
    try {
      await setVital(patch, dateKey);
      await load();
    } catch (err) {
      Alert.alert(
        'Could not save',
        errorMessage(err, 'Could not save that reading.')
      );
    }
  };

  const pendingDoses = data
    ? data.doses.filter((dose) => dose.status === 'pending').length
    : 0;
  // Split so the droplet can set the numeral and its unit at different sizes.
  const logged = splitWater(data?.health.entry.waterMl ?? 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ------------------------------------------------------- Header */}
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: Motion.fast }}
          style={styles.header}>
          <View style={styles.brand}>
            <HeartPulse size={26} color={Colors.primary} strokeWidth={2.2} />
            <Text style={styles.wordmark}>OneLife</Text>
          </View>

          {/* The dot marks doses still due, so the bell reports something real
              rather than standing in for a notification centre we don't have. */}
          <TouchableOpacity
            style={styles.bell}
            onPress={() => router.push('/(tabs)/medicine')}
            accessibilityRole="button"
            accessibilityLabel={
              pendingDoses > 0
                ? `${pendingDoses} doses still due today`
                : 'No doses due'
            }>
            <Bell size={18} color={Colors.textSecondary} />
            {pendingDoses > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setProfileOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open profile menu">
            <Avatar uri={profile?.avatarUrl ?? null} name={profile?.name} />
          </TouchableOpacity>
        </MotiView>

        {/* --------------------------------------------------- Date picker */}
        <TouchableOpacity
          style={styles.datePill}
          onPress={() => setCalendarOpen(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${dateLabel(selectedDate, isToday)}. Change date.`}>
          <CalendarDays size={16} color={Colors.primary} />
          <Text style={styles.dateLabel}>
            {dateLabel(selectedDate, isToday)}
          </Text>
          <ChevronDown size={16} color={Colors.textSecondary} />
        </TouchableOpacity>

        <ErrorNotice message={error} onRetry={() => void load()} />

        {loading || !data ? (
          <LoadingState color={Colors.primary} />
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            {/* ---------------------------------------------- Pregnancy */}
            {/* Above everything else: for someone who is pregnant this is the
                most important thing on the screen. */}
            {data.pregnancy && (
              <AnimatedPressable
                onPress={() => router.push('/(tabs)/women')}
                style={styles.pregnancyCard}>
                <View style={styles.pregnancyHead}>
                  <View style={styles.pregnancyBaby}>
                    <Text style={styles.pregnancyEmoji}>
                      {data.pregnancy.summary.babySize.emoji}
                    </Text>
                  </View>

                  <View style={styles.pregnancyText}>
                    <Text style={styles.pregnancyWeek}>
                      {data.pregnancy.summary.week}w{' '}
                      {data.pregnancy.summary.day}d
                    </Text>
                    <Text style={styles.pregnancyMeta}>
                      {data.pregnancy.summary.trimesterLabel} ·{' '}
                      {data.pregnancy.summary.weeksToGo === 0
                        ? 'due any day now'
                        : `${data.pregnancy.summary.weeksToGo} weeks to go`}
                    </Text>
                  </View>

                  <ChevronRight size={18} color={Accents.pink.main} />
                </View>

                <View style={styles.pregnancyTrack}>
                  <View
                    style={[
                      styles.pregnancyFill,
                      { width: `${data.pregnancy.summary.progress * 100}%` },
                    ]}
                  />
                </View>

                {/* Three figures worth knowing without opening the tab: how big
                    the baby is, what is due next, and the gain so far. */}
                <View style={styles.pregnancyStats}>
                  <View style={styles.pregnancyStat}>
                    <Text style={styles.pregnancyStatLabel}>Baby size</Text>
                    <Text style={styles.pregnancyStatValue} numberOfLines={1}>
                      {data.pregnancy.summary.babySize.name}
                    </Text>
                  </View>

                  <View style={styles.pregnancyStatDivider} />

                  <View style={styles.pregnancyStat}>
                    <Text style={styles.pregnancyStatLabel}>Next up</Text>
                    <Text
                      style={[
                        styles.pregnancyStatValue,
                        data.pregnancy.nextTest?.overdue &&
                          styles.pregnancyStatOverdue,
                      ]}
                      numberOfLines={1}>
                      {data.pregnancy.nextTest
                        ? data.pregnancy.nextTest.overdue
                          ? 'Overdue test'
                          : data.pregnancy.nextTest.daysAway <= 0
                            ? 'Due now'
                            : `${data.pregnancy.nextTest.daysAway}d away`
                        : 'All done'}
                    </Text>
                  </View>

                  <View style={styles.pregnancyStatDivider} />

                  <View style={styles.pregnancyStat}>
                    <Text style={styles.pregnancyStatLabel}>Weight gain</Text>
                    <Text style={styles.pregnancyStatValue} numberOfLines={1}>
                      {data.pregnancy.gainKg === null
                        ? '—'
                        : `${data.pregnancy.gainKg > 0 ? '+' : ''}${data.pregnancy.gainKg} kg`}
                    </Text>
                  </View>
                </View>
              </AnimatedPressable>
            )}

            {/* ------------------------------------------------- Streak */}
            {data.streak > 0 && (
              <View style={styles.streakCard}>
                <View style={styles.streakIcon}>
                  <Sparkles size={16} color={Accents.violet.main} />
                </View>
                <View style={styles.streakText}>
                  <Text style={styles.streakTitle}>
                    {data.streak} Day Streak
                  </Text>
                  <Text style={styles.streakBody}>
                    Keep it up! Consistency brings results.
                  </Text>
                </View>
                <View style={styles.streakFlame}>
                  <Flame size={20} color={Accents.orange.main} />
                </View>
              </View>
            )}

            {/* ---------------------------------------------- Nutrition */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeading}>
                  <Utensils size={17} color={Colors.primary} />
                  <Text style={styles.cardTitle}>Nutrition</Text>
                </View>
              </View>

              {/* Always the real figures. A day with nothing logged is a full
                  budget and empty bars, which is the honest picture — no
                  separate empty state needed. */}
              <View style={styles.splitRow}>
                <GradientRing
                  size={RING_SIZE}
                  thickness={11}
                  progress={data.nutrition.calorieProgress}
                  colors={Gradients.activity}>
                  <Text style={styles.ringValue}>
                    {data.nutrition.caloriesLeft.toLocaleString()}
                  </Text>
                  <Text style={styles.ringUnit}>kcal left</Text>
                  <Text style={styles.ringCaption}>
                    of {data.nutrition.targets.calories.toLocaleString()}
                  </Text>
                </GradientRing>

                <View style={styles.macros}>
                  {data.nutrition.macros.map((macro, index) => (
                    <View key={macro.key} style={styles.macro}>
                      <View style={styles.macroHeader}>
                        <View
                          style={[
                            styles.macroDot,
                            { backgroundColor: MACRO_COLORS[index] },
                          ]}
                        />
                        <Text style={styles.macroLabel}>{macro.label}</Text>
                        <Text style={styles.macroValue}>
                          {macro.eaten} / {macro.target}g
                        </Text>
                      </View>
                      <View style={styles.macroTrack}>
                        <View
                          style={[
                            styles.macroFill,
                            {
                              width: `${macro.progress * 100}%`,
                              backgroundColor: MACRO_COLORS[index],
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* -------------------------------------- Steps and water */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeading}>
                  <Footprints size={17} color={Colors.primary} />
                  <Text style={styles.cardTitle}>Activity</Text>
                </View>
                <TouchableOpacity
                  style={styles.headerAction}
                  onPress={() => router.push('/(tabs)/health')}
                  accessibilityRole="button"
                  accessibilityLabel="Open the Health tab to log steps and water">
                  <Text style={styles.headerActionLabel}>Details</Text>
                  <ChevronRight size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Read-only: the counts and the droplet gauge. Logging lives on
                  the Health tab, which is what the Details link is for. */}
              <View style={styles.metricRow}>
                <View style={styles.metric}>
                  <View style={styles.gaugeSlot}>
                    <GradientRing
                      size={STEP_RING_SIZE}
                      thickness={10}
                      progress={data.health.stepProgress}
                      colors={Gradients.activity}>
                      <Footprints size={16} color={Accents.violet.main} />
                      <Text style={styles.metricValue}>
                        {formatSteps(data.health.entry.steps)}
                      </Text>
                    </GradientRing>
                  </View>
                  <Text style={styles.metricHeading}>Steps</Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metric}>
                  <View style={styles.gaugeSlot}>
                    <WaterDroplet
                      size={DROPLET_SIZE}
                      progress={data.health.waterProgress}>
                      <View style={styles.dropletAmount}>
                        <Text style={styles.dropletValue}>{logged.value}</Text>
                        <Text style={styles.dropletUnit}>{logged.unit}</Text>
                      </View>
                    </WaterDroplet>
                  </View>
                  <Text style={styles.metricHeading}>Water Intake</Text>
                </View>
              </View>
            </View>

            {/* ------------------------------------------- Today's Plan */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {isToday ? "Today's Plan" : 'That Day'}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/planner')}
                accessibilityRole="button">
                <Text style={styles.headerActionLabel}>See All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.planRow}>
              {data.plan.map((card) => (
                <PlanTile
                  key={card.id}
                  card={card}
                  onPress={() => router.push(planRoute(card.kind))}
                />
              ))}
            </ScrollView>

            {/* --------------------------------------- Health Overview */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeading}>
                  <TrendingUp size={17} color={Colors.primary} />
                  <Text style={styles.cardTitle}>Health Overview</Text>
                </View>
                <Text style={styles.headerMuted}>Tap to log</Text>
              </View>

              {isVitalsEmpty(data.vitals) && (
                <Text style={styles.emptyNote}>
                  Nothing logged for this day yet — tap a row to add a reading.
                </Text>
              )}

              {data.vitalRows.map((row, index) => {
                const style = VITAL_STYLES[row.field];
                const Icon = style.icon;
                return (
                  <TouchableOpacity
                    key={row.field}
                    style={[
                      styles.vitalRow,
                      index > 0 && styles.vitalRowDivided,
                    ]}
                    onPress={() => setEditingVital(row.field)}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel={`${row.label}: ${row.value ?? 'not logged'}. Tap to log.`}>
                    <View
                      style={[
                        styles.vitalIcon,
                        { backgroundColor: style.accent.tint },
                      ]}>
                      <Icon size={15} color={style.accent.main} />
                    </View>
                    <Text style={styles.vitalLabel}>{row.label}</Text>
                    <Text
                      style={[
                        styles.vitalValue,
                        row.value === null && styles.vitalValueEmpty,
                      ]}>
                      {row.value ?? '—'}
                    </Text>
                    <Sparkline
                      values={row.series}
                      width={SPARK_WIDTH}
                      height={SPARK_HEIGHT}
                      color={style.accent.main}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* --------------------------------------------- Insights */}
            {data.insights.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeading}>
                    <Sparkles size={17} color={Colors.primary} />
                    <Text style={styles.cardTitle}>Insights for You</Text>
                  </View>
                </View>

                {data.insights.map((insight) => (
                  <InsightTile key={insight.id} insight={insight} />
                ))}
              </View>
            )}

            {/* -------------------------------------------- Motivation */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/(tabs)/health')}
              accessibilityRole="button"
              accessibilityLabel="Open the Health tab">
              <LinearGradient
                colors={Gradients.activity}
                start={Gradients.horizontal.start}
                end={Gradients.horizontal.end}
                style={styles.banner}>
                <View style={styles.bannerIcon}>
                  <Trophy size={22} color={Colors.onPrimary} />
                </View>
                <View style={styles.bannerText}>
                  <Text style={styles.bannerTitle}>
                    Small steps every day lead to big changes.
                  </Text>
                  <Text style={styles.bannerBody}>
                    You&apos;re building a better, healthier you!
                  </Text>
                </View>
                <ChevronRight size={18} color={Colors.onPrimaryMuted} />
              </LinearGradient>
            </TouchableOpacity>
          </MotiView>
        )}

        <View style={{ height: Spacing.navClearance }} />
      </ScrollView>

      <CalendarSheet
        visible={calendarOpen}
        selectedDate={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
          setCalendarOpen(false);
        }}
        onClose={() => setCalendarOpen(false)}
      />

      <VitalsSheet
        field={editingVital}
        entry={
          data?.vitals ?? {
            date: dateKey,
            heartRate: null,
            sleepMinutes: null,
            stress: null,
            energy: null,
          }
        }
        onClose={() => setEditingVital(null)}
        onSave={(patch) => void saveVital(patch)}
      />

      <ProfileDrawer
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      <FloatingNav />
    </SafeAreaView>
  );
}

/** One card in the horizontally scrolling Today's Plan strip. */
function PlanTile({ card, onPress }: { card: PlanCard; onPress: () => void }) {
  const style = PLAN_STYLES[card.kind];
  const Icon =
    card.kind === 'task' ? (TASK_ICONS[card.subtitle] ?? style.icon) : style.icon;

  return (
    <TouchableOpacity
      style={styles.planTile}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${card.title}. ${card.subtitle}. ${card.status}.`}>
      <View style={[styles.planIcon, { backgroundColor: style.accent.tint }]}>
        <Icon size={16} color={style.accent.main} />
      </View>
      <View style={styles.planText}>
        <Text style={styles.planTitle} numberOfLines={1}>
          {card.title}
        </Text>
        <Text style={styles.planSubtitle} numberOfLines={1}>
          {card.subtitle}
        </Text>
        <Text
          style={[styles.planStatus, card.done && styles.planStatusDone]}
          numberOfLines={1}>
          {card.status}
        </Text>
      </View>
      <ChevronRight size={15} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

/** One tile in the Insights card, with an optional progress bar and delta. */
function InsightTile({ insight }: { insight: Insight }) {
  return (
    <View style={styles.insight}>
      <View style={styles.insightIcon}>
        {insight.progress === undefined ? (
          <CircleCheck size={16} color={Accents.violet.main} />
        ) : (
          <TrendingUp size={16} color={Accents.violet.main} />
        )}
      </View>

      <View style={styles.insightText}>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightBody}>{insight.body}</Text>

        {insight.progress !== undefined && (
          <View style={styles.insightBarRow}>
            <View style={styles.insightTrack}>
              <View
                style={[
                  styles.insightFill,
                  { width: `${insight.progress * 100}%` },
                ]}
              />
            </View>
            {insight.delta !== undefined && (
              <Text
                style={[
                  styles.insightDelta,
                  insight.delta < 0 && styles.insightDeltaDown,
                ]}>
                {insight.delta >= 0 ? '▲' : '▼'} {Math.abs(insight.delta)}%
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
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
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  wordmark: {
    ...Typography.heading,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: Radius.round,
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },

  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  dateLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.primary,
  },

  pregnancyCard: {
    backgroundColor: Accents.pink.tint,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  pregnancyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pregnancyBaby: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pregnancyEmoji: { fontSize: 20, lineHeight: 26 },
  pregnancyText: { flex: 1 },
  pregnancyWeek: {
    ...Typography.optionLabel,
    fontSize: 16,
    color: Accents.pink.dark,
  },
  pregnancyMeta: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  pregnancyTrack: {
    height: 4,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  pregnancyFill: {
    height: '100%',
    borderRadius: Radius.round,
    backgroundColor: Accents.pink.main,
  },
  pregnancyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  pregnancyStat: { flex: 1 },
  pregnancyStatLabel: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  pregnancyStatValue: {
    ...Typography.label,
    fontSize: 12,
    fontWeight: '700',
    color: Accents.pink.dark,
    marginTop: 1,
  },
  pregnancyStatOverdue: { color: Accents.amber.dark },
  pregnancyStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Accents.violet.tint,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  streakIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakText: { flex: 1 },
  streakTitle: {
    ...Typography.optionLabel,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  streakBody: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  streakFlame: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: Accents.orange.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { ...Typography.cardTitle, fontSize: 16, color: Colors.primary },
  headerAction: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  headerActionLabel: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.primary,
  },
  headerMuted: { ...Typography.label, color: Colors.textMuted },
  emptyNote: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },

  splitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },

  // Tops aligned, not centres: the droplet is taller than the ring, and
  // centring the columns would push the two headings off the same line.
  metricRow: { flexDirection: 'row', alignItems: 'flex-start' },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  /** Shared band both gauges centre inside, so neither sits high or low. */
  gaugeSlot: { height: GAUGE_HEIGHT, justifyContent: 'center' },
  metricValue: {
    ...Typography.largeNumber,
    fontSize: 25,
    lineHeight: 30,
    color: Colors.textPrimary,
    marginTop: 2,
  },

  /**
   * Shared by both halves, so the two columns read as one row. Sits under its
   * gauge, and because both gauges occupy the same fixed band the two labels
   * land on the same line.
   */
  metricHeading: {
    ...Typography.label,
    fontSize: 11,
    fontWeight: '700',
    color: Accents.violet.main,
    marginTop: Spacing.xs,
  },
  dropletAmount: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  dropletValue: {
    ...Typography.largeNumber,
    fontSize: 25,
    lineHeight: 30,
    color: Colors.textPrimary,
  },
  dropletUnit: {
    ...Typography.unit,
    fontSize: 13,
    color: Colors.textPrimary,
    paddingBottom: 4,
  },

  metricDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },

  ringValue: {
    ...Typography.largeNumber,
    fontSize: 22,
    lineHeight: 27,
    color: Colors.textPrimary,
  },
  ringUnit: { ...Typography.label, fontSize: 10, color: Colors.textSecondary },
  ringCaption: { ...Typography.label, fontSize: 9, color: Colors.textMuted },

  macros: { flex: 1, gap: Spacing.md },
  macro: { gap: Spacing.xs },
  macroHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  macroDot: { width: 7, height: 7, borderRadius: Radius.round },
  macroLabel: {
    ...Typography.label,
    fontSize: 11,
    flex: 1,
    color: Colors.textPrimary,
  },
  macroValue: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  macroTrack: {
    height: 5,
    borderRadius: Radius.round,
    backgroundColor: Colors.surfaceSunken,
    overflow: 'hidden',
  },
  macroFill: { height: 5, borderRadius: Radius.round },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: { ...Typography.sectionTitle, color: Colors.textPrimary },

  planRow: {
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingRight: Spacing.xs,
  },
  planTile: {
    width: 210,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.card,
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planText: { flex: 1 },
  planTitle: {
    ...Typography.optionLabel,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  planSubtitle: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  planStatus: {
    ...Typography.label,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 1,
  },
  planStatusDone: { color: Colors.success },

  vitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  vitalRowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  vitalIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalLabel: { ...Typography.caption, flex: 1, color: Colors.textPrimary },
  vitalValue: {
    ...Typography.label,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  vitalValueEmpty: { color: Colors.textMuted, fontWeight: '500' },

  insight: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  insightIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.round,
    backgroundColor: Accents.violet.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: { flex: 1 },
  insightTitle: {
    ...Typography.optionLabel,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  insightBody: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  insightBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  insightTrack: {
    flex: 1,
    height: 5,
    borderRadius: Radius.round,
    backgroundColor: Colors.surfaceSunken,
    overflow: 'hidden',
  },
  insightFill: {
    height: 5,
    borderRadius: Radius.round,
    backgroundColor: Accents.violet.main,
  },
  insightDelta: {
    ...Typography.label,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },
  insightDeltaDown: { color: Colors.error },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    ...Shadow.glow,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.round,
    backgroundColor: Colors.onPrimaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { flex: 1 },
  bannerTitle: {
    ...Typography.optionLabel,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  bannerBody: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.onPrimaryMuted,
    marginTop: 2,
  },
});
