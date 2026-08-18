import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Info, Square } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AnimatedPressable from '../../components/AnimatedPressable';
import AppHeader from '../../components/AppHeader';
import { ErrorNotice, LoadingState } from '../../components/ui';
import {
  Accents,
  Colors,
  Gradients,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
  accentShadow,
} from '../../constants/theme';
import { formatShortDate, startOfToday, toDateString } from '../../services/dates';
import { errorMessage } from '../../services/errors';
import {
  KICK_TARGET,
  KICK_WINDOW_MINUTES,
  KickSession,
  deleteKickSession,
  endKickSession,
  getKickSessions,
  recordKick,
  startKickSession,
  summariseKicks,
  timeToTenMinutes,
} from '../../services/pregnancy';

/** The three tabs across the bottom of the screen. */
type Tab = 'counter' | 'history' | 'why';

const TABS: { id: Tab; label: string }[] = [
  { id: 'counter', label: 'Count' },
  { id: 'history', label: 'History' },
  { id: 'why', label: 'Why track' },
];

/** `38 min`, or `1h 22m` once it runs past the hour. */
function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * Kick Tracker — a counting session, the history behind it, and what the count
 * actually means.
 *
 * One control: the circle. The first tap opens a session and counts as the first
 * movement, and every tap after it adds one, with no upper limit.
 *
 * The session is still timed, because "ten movements in two hours" is the whole
 * point of the guidance — but the clock is not shown while counting. A number
 * ticking up beside the count invited watching it, and the duration only
 * actually matters once the session is read back, which is where it appears.
 */
export default function KicksScreen() {
  const [tab, setTab] = useState<Tab>('counter');
  const [sessions, setSessions] = useState<KickSession[]>([]);
  const [active, setActive] = useState<KickSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const todayKey = toDateString(startOfToday());
  // Held in a ref as well so the interval can read it without being torn down
  // and rebuilt on every tick.
  const activeRef = useRef<KickSession | null>(null);
  activeRef.current = active;
  // Guards the gap between the first tap and the session existing.
  const startingRef = useRef(false);

  /** Loads recent sessions and picks up any that was left running. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const recent = await getKickSessions(30);
      const open = recent.filter((session) => session.endedAt === null);

      // A session is only worth resuming while it could still plausibly be the
      // one she is in the middle of: today, and inside the counting window.
      // Anything older is an abandoned session — reopening it used to restore a
      // days-old elapsed time, which immediately tripped the two-hour
      // low-movement warning and its alarming copy.
      const resumable = open.find(
        (session) =>
          session.date === toDateString(startOfToday()) &&
          Date.now() - new Date(session.startedAt).getTime() <
            KICK_WINDOW_MINUTES * 60 * 1000
      );

      const abandoned = open.filter((session) => session.id !== resumable?.id);
      if (abandoned.length > 0) {
        // Close them out so they settle into history rather than surfacing
        // again on the next visit.
        await Promise.all(
          abandoned.map((session) =>
            session.kickCount === 0
              ? deleteKickSession(session.id)
              : endKickSession(
                  session.id,
                  new Date(
                    session.kickTimes[session.kickTimes.length - 1] ??
                      session.startedAt
                  )
                )
          )
        );
        setSessions(await getKickSessions(30));
      } else {
        setSessions(recent);
      }

      setActive(resumable ?? null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your kick history.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Ticks the live timer once a second while a session is open. Elapsed time is
  // recomputed from the start timestamp rather than incremented, so it stays
  // correct if the screen was backgrounded.
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }

    const tick = () => {
      const started = new Date(active.startedAt).getTime();
      setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [active]);

  const summary = useMemo(
    () => summariseKicks(sessions, todayKey),
    [sessions, todayKey]
  );

  const count = active?.kickCount ?? 0;
  const reachedTarget = count >= KICK_TARGET;
  const pastWindow = elapsed >= KICK_WINDOW_MINUTES * 60;

  /**
   * Records one kick, opening a session first if none is running.
   *
   * The circle is the only control needed to begin: a separate Start button made
   * the first movement a two-tap job, and the tap you make when you feel a kick
   * is itself the thing being counted, so it is counted.
   *
   * There is no upper limit. Ten is the figure the guidance is written around,
   * but movements past it are still movements and stopping the counter at ten
   * would throw away a real record of them.
   */
  const tap = async () => {
    const session = activeRef.current;

    try {
      if (!session) {
        // Two fast taps before the first session exists would otherwise open
        // two sessions and split the count between them.
        if (startingRef.current) return;
        startingRef.current = true;

        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const fresh = await startKickSession();
        const withFirst = await recordKick(fresh);
        setActive(withFirst);
        startingRef.current = false;
        return;
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updated = await recordKick(session);
      setActive(updated);

      // Fires once, as the tenth lands — not on every tap after it.
      if (updated.kickCount === KICK_TARGET) {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      }
    } catch (err) {
      startingRef.current = false;
      setError(errorMessage(err, 'Could not record that kick.'));
    }
  };

  /** Closes the session, discarding it if nothing was ever counted. */
  const stop = async () => {
    const session = activeRef.current;
    if (!session) return;

    try {
      setSaving(true);
      // An empty session is noise in the history rather than a record of
      // anything, so it is dropped instead of stored.
      if (session.kickCount === 0) {
        await deleteKickSession(session.id);
      } else {
        await endKickSession(session.id);
      }
      setActive(null);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not save that session.'));
    } finally {
      setSaving(false);
    }
  };

  /** Confirms before throwing away a session that has kicks in it. */
  const confirmStop = () => {
    const session = activeRef.current;
    if (session && session.kickCount > 0 && !reachedTarget) {
      Alert.alert(
        'Finish this session?',
        `You've counted ${session.kickCount} so far. It will be saved as it is.`,
        [
          { text: 'Keep counting', style: 'cancel' },
          { text: 'Finish', onPress: () => void stop() },
        ]
      );
      return;
    }
    void stop();
  };

  const history = sessions.filter((session) => session.endedAt !== null);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Kick Tracker"
        action={
          <AnimatedPressable onPress={() => setTab('why')} haptic={false}>
            <Info size={20} color={Colors.textSecondary} />
          </AnimatedPressable>
        }
      />

      <View style={styles.segmented}>
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <AnimatedPressable
              key={item.id}
              onPress={() => setTab(item.id)}
              style={[styles.segment, selected && styles.segmentActive]}>
              <Text
                style={[
                  styles.segmentLabel,
                  selected && styles.segmentLabelActive,
                ]}>
                {item.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ErrorNotice message={error} onRetry={() => void load()} />

        {loading ? (
          <LoadingState color={Accents.pink.main} />
        ) : (
          <MotiView
            key={tab}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            {/* --------------------------------------------------- Counter */}
            {tab === 'counter' && (
              <View>
                <Text style={styles.prompt}>
                  {active
                    ? 'Tap each time you feel a movement'
                    : 'Tap the circle to start counting'}
                </Text>

                {/* A plain filled circle, not a progress ring. The count has no
                    ceiling now, so there was no honest fraction for an arc to
                    represent — it filled to ten and then sat there while the
                    number kept climbing past it. */}
                <View style={styles.counterWrap}>
                  <AnimatedPressable
                    onPress={() => void tap()}
                    haptic={false}
                    style={styles.counterPress}>
                    <LinearGradient
                      colors={Gradients.activity}
                      start={Gradients.diagonal.start}
                      end={Gradients.diagonal.end}
                      style={styles.counter}>
                      <Text style={styles.kickCount}>{count}</Text>
                      <Text style={styles.kickLabel}>
                        {count === 1 ? 'Kick' : 'Kicks'}
                      </Text>
                    </LinearGradient>
                  </AnimatedPressable>
                </View>

                {/* The result line. Three states, and the wording of the third
                    matters more than anything else on this screen. */}
                {reachedTarget ? (
                  <View style={[styles.resultCard, styles.resultGood]}>
                    <Text style={styles.resultTitle}>
                      {count} kicks in {formatDuration(elapsed)}
                    </Text>
                    <Text style={styles.resultBody}>
                      You reached {KICK_TARGET} — that&apos;s a normal, healthy
                      pattern. Keep tapping for as long as you like, or finish to
                      save this session.
                    </Text>
                  </View>
                ) : pastWindow ? (
                  <View style={[styles.resultCard, styles.resultLow]}>
                    <Text style={styles.resultTitle}>
                      {count} in {formatDuration(elapsed)}
                    </Text>
                    <Text style={styles.resultBody}>
                      Babies have quiet spells and this is often nothing. Have
                      something to eat or a cold drink, lie on your left side,
                      and try counting again. If you still count fewer than{' '}
                      {KICK_TARGET} movements, call your doctor or midwife —
                      they would always rather hear from you.
                    </Text>
                  </View>
                ) : active ? (
                  <Text style={styles.hint}>
                    Counting towards {KICK_TARGET} movements. Most babies get
                    there well inside two hours.
                  </Text>
                ) : (
                  <Text style={styles.hint}>
                    Pick a time when your baby is usually active, then sit or lie
                    somewhere comfortable. Your first tap starts the timer.
                  </Text>
                )}

                {/* Only Finish. Starting is the circle's job, so a Start button
                    would just be a second way to do the same thing. */}
                {active && (
                  <AnimatedPressable
                    onPress={confirmStop}
                    style={[styles.cta, accentShadow(Accents.pink.main)]}>
                    <Square
                      size={16}
                      color={Colors.textInverse}
                      strokeWidth={2.6}
                      fill={Colors.textInverse}
                    />
                    <Text style={styles.ctaText}>
                      {saving ? 'Saving…' : 'Finish session'}
                    </Text>
                  </AnimatedPressable>
                )}

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Today&apos;s summary</Text>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>
                        {summary.sessions}
                      </Text>
                      <Text style={styles.summaryLabel}>Sessions</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>
                        {summary.totalKicks}
                      </Text>
                      <Text style={styles.summaryLabel}>Total kicks</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>
                        {summary.totalMinutes >= 60
                          ? `${Math.floor(summary.totalMinutes / 60)}h ${summary.totalMinutes % 60}m`
                          : `${summary.totalMinutes}m`}
                      </Text>
                      <Text style={styles.summaryLabel}>Total time</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* --------------------------------------------------- History */}
            {tab === 'history' && (
              <View>
                {history.length === 0 ? (
                  <Text style={styles.hint}>
                    No finished sessions yet. Your history builds up here once
                    you&apos;ve counted a few times.
                  </Text>
                ) : (
                  history.map((session) => {
                    const toTen = timeToTenMinutes(session);
                    return (
                      <View key={session.id} style={styles.historyRow}>
                        <View style={styles.historyDate}>
                          <Text style={styles.historyDay}>
                            {session.date === todayKey
                              ? 'Today'
                              : formatShortDate(session.date)}
                          </Text>
                          <Text style={styles.historyTime}>
                            {new Date(session.startedAt).toLocaleTimeString(
                              undefined,
                              { hour: 'numeric', minute: '2-digit' }
                            )}
                          </Text>
                        </View>
                        <View style={styles.historyMain}>
                          <Text style={styles.historyCount}>
                            {session.kickCount} kicks
                          </Text>
                          <Text style={styles.historyMeta}>
                            {toTen === null
                              ? 'Session ended before 10'
                              : `${KICK_TARGET} reached in ${toTen} min`}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}

                {summary.lastTimeToTenMinutes !== null && (
                  <Text style={styles.footnote}>
                    Your most recent count reached {KICK_TARGET} in{' '}
                    {summary.lastTimeToTenMinutes} minutes. What matters is your
                    own usual pattern, not a particular number — mention any
                    lasting change to your doctor.
                  </Text>
                )}
              </View>
            )}

            {/* ------------------------------------------------- Why track */}
            {tab === 'why' && (
              <View style={styles.whyCard}>
                <Text style={styles.whyTitle}>Why counting kicks helps</Text>
                <Text style={styles.whyBody}>
                  From around week 28, your baby settles into a pattern of
                  movement. Getting to know that pattern is the most useful
                  thing you can do between appointments, because a lasting
                  change from it is one of the few early signals you can notice
                  yourself.
                </Text>

                <Text style={styles.whyHeading}>How to count</Text>
                <Text style={styles.whyBody}>
                  Choose a time your baby is usually active — often after a meal
                  or in the evening. Sit or lie on your left side somewhere
                  quiet, start the timer, and tap once for every kick, roll,
                  swish or jab. Hiccups don&apos;t count. Stop at{' '}
                  {KICK_TARGET} movements.
                </Text>

                <Text style={styles.whyHeading}>What&apos;s normal</Text>
                <Text style={styles.whyBody}>
                  Most babies reach {KICK_TARGET} movements well within two
                  hours, and often within half an hour. Counting at the same
                  time each day makes your own pattern much easier to see.
                </Text>

                <Text style={styles.whyHeading}>When to call someone</Text>
                <Text style={styles.whyBody}>
                  If you count fewer than {KICK_TARGET} movements in two hours,
                  have something to eat or a cold drink, lie on your left side
                  and try again. If it is still fewer than {KICK_TARGET}, or if
                  the movements feel clearly different from usual, call your
                  doctor or midwife the same day. Do not wait until morning, and
                  do not worry about troubling them — they would always rather
                  check and find nothing wrong.
                </Text>

                <Text style={styles.whyFootnote}>
                  This screen records what you count. It cannot assess your
                  baby&apos;s wellbeing, and it is never a substitute for
                  speaking to your doctor.
                </Text>
              </View>
            )}
          </MotiView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  segmented: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.lg,
    padding: Spacing.xs,
    marginHorizontal: Spacing.screen,
    marginBottom: Spacing.lg,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  segmentActive: { backgroundColor: Colors.primaryTint },
  segmentLabel: { ...Typography.caption, color: Colors.textSecondary },
  segmentLabelActive: { color: Colors.primary, fontWeight: '700' },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.navClearance,
  },
  prompt: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  counterWrap: { alignItems: 'center', marginTop: Spacing.xl },
  counterPress: { borderRadius: Radius.round },
  counter: {
    width: 230,
    height: 230,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.glow,
  },
  kickCount: {
    fontSize: 76,
    fontWeight: '700',
    lineHeight: 86,
    color: Colors.onPrimary,
  },
  kickLabel: {
    ...Typography.caption,
    color: Colors.onPrimaryMuted,
    marginTop: -Spacing.xs,
  },
  hint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
    lineHeight: 19,
  },
  resultCard: {
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
  },
  resultGood: { backgroundColor: Accents.green.tint },
  resultLow: { backgroundColor: Accents.amber.tint },
  resultTitle: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  resultBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Accents.pink.main,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
  },
  ctaText: { ...Typography.button, color: Colors.textInverse },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    ...Shadow.card,
  },
  summaryTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { ...Typography.metricValue, color: Colors.textPrimary },
  summaryLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  historyDate: { width: 72 },
  historyDay: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  historyTime: { ...Typography.label, color: Colors.textMuted },
  historyMain: { flex: 1 },
  historyCount: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historyMeta: { ...Typography.label, color: Colors.textSecondary },
  footnote: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: Spacing.lg,
    lineHeight: 17,
  },
  whyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    ...Shadow.card,
  },
  whyTitle: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  whyHeading: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  whyBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  whyFootnote: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
    lineHeight: 17,
  },
});
