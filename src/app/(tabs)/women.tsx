import { Redirect, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { type JSX, useCallback, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import FloatingNav from '../../components/FloatingNav';
import { ErrorNotice, LoadingState } from '../../components/ui';
import CyclePanel from '../../components/women/CyclePanel';
import LogSheet, {
  LOG_CONFIG,
  LogKind,
  LogValue,
} from '../../components/women/LogSheet';
import PregnancyPanel, {
  PregnancySetup,
} from '../../components/women/PregnancyPanel';
import { allItemIds, totalItemsFor } from '../../constants/hospitalBag';
import {
  Accents,
  Colors,
  Motion,
  Radius,
  Spacing,
  Typography,
} from '../../constants/theme';
import { startOfToday, toDateString } from '../../services/dates';
import { errorMessage } from '../../services/errors';
import {
  KickSession,
  getKickSessions,
  getMemories,
  scheduleTests,
  summariseKicks,
} from '../../services/pregnancy';
import { useProfileSummary } from '../../services/profile';
import {
  CycleEntry,
  CycleEntryInput,
  FlowLevel,
  OvulationTest,
  PregnancyRecord,
  getCycleEntries,
  getPregnancy,
  logCycleEntry,
  logPregnancyEntry,
  setDueDate,
  summariseCycle,
  summarisePregnancy,
} from '../../services/women';

/** The two halves of the Women's Health area. */
type Tab = 'cycle' | 'pregnancy';

const TABS: { id: Tab; label: string }[] = [
  { id: 'cycle', label: 'Cycle' },
  { id: 'pregnancy', label: 'Pregnancy' },
];

/**
 * Women's Health — cycle tracking and pregnancy, behind a segmented control.
 *
 * Reached from the Women's Health row on the Profile screen, which only shows
 * for users whose profile gender is `woman`. This screen redirects anyone else
 * who opens the route directly.
 */
export default function WomenScreen(): JSX.Element {
  const profile = useProfileSummary();
  const [tab, setTab] = useState<Tab>('cycle');
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [pregnancy, setPregnancy] = useState<PregnancyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLog, setActiveLog] = useState<LogKind | null>(null);
  const [kickSessions, setKickSessions] = useState<KickSession[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);

  const todayKey = toDateString(startOfToday());

  /** Loads the cycle history, the pregnancy record and its feature counts. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const [cycleEntries, pregnancyRecord] = await Promise.all([
        getCycleEntries(),
        getPregnancy(),
      ]);
      setEntries(cycleEntries);
      setPregnancy(pregnancyRecord);

      // Only worth querying once there is a pregnancy to summarise. Both feed
      // tile subtitles, so a failure here should not take the whole tab down.
      if (pregnancyRecord) {
        const [sessions, memories] = await Promise.all([
          getKickSessions(7).catch(() => [] as KickSession[]),
          getMemories().catch(() => []),
        ]);
        setKickSessions(sessions);
        setMemoryCount(memories.length);
      }
    } catch (err) {
      setError(
        errorMessage(err, 'Could not load your health data.')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Every number on the Cycle tab is derived, so it only has to be recomputed
  // when the underlying entries change.
  const cycleSummary = useMemo(() => summariseCycle(entries), [entries]);
  const pregnancySummary = useMemo(
    () => (pregnancy ? summarisePregnancy(pregnancy) : null),
    [pregnancy]
  );

  const todayEntry = entries.find((entry) => entry.date === todayKey) ?? null;
  const todayLog =
    pregnancy?.logs.find((log) => log.date === todayKey) ?? null;

  /** The live value under each feature tile on the hub. */
  const tileValues = useMemo((): Partial<Record<string, string>> => {
    if (!pregnancy || !pregnancySummary) return {};

    const weights = pregnancy.logs.filter(
      (log) => typeof log.weightKg === 'number'
    );
    const latest = weights[weights.length - 1]?.weightKg;
    const gain =
      pregnancy.prePregnancyWeightKg !== null && latest !== undefined
        ? Number((latest - pregnancy.prePregnancyWeightKg).toFixed(1))
        : null;

    const kicks = summariseKicks(kickSessions, todayKey);
    const nextTest = scheduleTests(pregnancy).find(
      (test) => test.status !== 'done'
    );

    // Counted against the catalogue rather than the stored array's length, so a
    // stored id that no longer exists cannot push the tile past the total or
    // make it disagree with the hospital-bag screen's own count.
    const catalogue = new Set(allItemIds());
    const packed = pregnancy.bag.packed.filter((id) => catalogue.has(id)).length;
    const totalItems = totalItemsFor('mom') + totalItemsFor('baby');

    /** `In 1 day` / `In 9 days`, or the state when it is no longer ahead. */
    const testLabel = () => {
      if (!nextTest) return 'All done';
      // Overdue reads as "Due now" if it goes through the days-away branch,
      // which hides a missed test behind a reassuring phrase.
      if (nextTest.status === 'overdue') return 'Overdue';
      if (nextTest.daysAway <= 0) return 'Due now';
      return `In ${nextTest.daysAway} day${nextTest.daysAway === 1 ? '' : 's'}`;
    };

    return {
      weight:
        pregnancy.prePregnancyWeightKg === null
          ? 'Add starting weight'
          : gain === null
            ? 'Log your weight'
            : `${gain > 0 ? '+' : ''}${gain} kg`,
      kicks:
        kicks.totalKicks > 0
          ? `${kicks.totalKicks} today`
          : 'Not counted today',
      tests: testLabel(),
      bag: `${packed} of ${totalItems} packed`,
      memories:
        memoryCount === 0
          ? 'Add your first'
          : `${memoryCount} saved`,
      diet: `Trimester ${pregnancySummary.trimester} plan`,
    };
  }, [pregnancy, pregnancySummary, kickSessions, memoryCount, todayKey]);

  /** What the open log sheet should start from, for today's date. */
  const initialLogValue = useMemo((): LogValue => {
    if (!activeLog) return null;
    if (tab === 'cycle') {
      switch (activeLog) {
        case 'flow':
          return todayEntry?.flow ?? null;
        case 'symptoms':
          return todayEntry?.symptoms ?? [];
        case 'mood':
          return todayEntry?.mood ?? null;
        case 'bbt':
          return todayEntry?.bbt ?? null;
        case 'ovulation':
          return todayEntry?.ovulationTest ?? null;
        default:
          return null;
      }
    }
    switch (activeLog) {
      case 'weight':
        return todayLog?.weightKg ?? null;
      case 'symptoms':
        return todayLog?.symptoms ?? [];
      case 'kicks':
        return todayLog?.kicks ?? null;
      case 'mood':
        return todayLog?.mood ?? null;
      case 'sleep':
        return todayLog?.sleepHours ?? null;
      case 'notes':
        return todayLog?.notes ?? null;
      default:
        return null;
    }
  }, [activeLog, tab, todayEntry, todayLog]);

  /** Reports a failed write without losing what the user was doing. */
  const reportFailure = (err: unknown, fallback: string) => {
    Alert.alert(
      'Could not save',
      errorMessage(err, fallback)
    );
  };

  /** Writes one measurement for today, then refreshes the derived numbers. */
  const saveLog = async (kind: LogKind, value: LogValue) => {
    try {
      if (tab === 'cycle') {
        const patch: CycleEntryInput = {};
        if (kind === 'flow') patch.flow = value as FlowLevel | null;
        if (kind === 'symptoms') patch.symptoms = (value as string[]) ?? [];
        if (kind === 'mood') patch.mood = value as string | null;
        if (kind === 'bbt') patch.bbt = value as number | null;
        if (kind === 'ovulation') {
          patch.ovulationTest = value as OvulationTest | null;
        }
        await logCycleEntry(todayKey, patch);
      } else {
        // A cleared field is written as `undefined` so it drops out of the
        // stored jsonb rather than sitting there as an explicit null.
        const clear = <T,>(input: LogValue) =>
          (input === null ? undefined : (input as T));

        await logPregnancyEntry(todayKey, {
          ...(kind === 'weight' && { weightKg: clear<number>(value) }),
          ...(kind === 'symptoms' && { symptoms: (value as string[]) ?? [] }),
          ...(kind === 'kicks' && { kicks: clear<number>(value) }),
          ...(kind === 'mood' && { mood: clear<string>(value) }),
          ...(kind === 'sleep' && { sleepHours: clear<number>(value) }),
          ...(kind === 'notes' && { notes: clear<string>(value) }),
        });
      }
      await load();
    } catch (err) {
      reportFailure(err, `Could not save your ${LOG_CONFIG[kind].label}.`);
    }
  };

  /** Sets or moves the due date, creating the pregnancy record if needed. */
  const saveDueDate = async (date: string) => {
    try {
      await setDueDate(date);
      await load();
    } catch (err) {
      reportFailure(err, 'Could not save your due date.');
    }
  };

  /** Placeholder for the detail screens that are not built yet. */
  const comingSoon = () => {
    Alert.alert('Coming soon', 'The full history view is on its way.');
  };

  // The nav hides this tab for everyone else, so a direct hit on the route is
  // the only way to get here without it applying.
  if (profile && profile.gender !== 'woman') {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Women's Health" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <View style={styles.segmented}>
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setTab(item.id)}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.segment, active && styles.segmentActive]}>
                <Text
                  style={[
                    styles.segmentLabel,
                    active && styles.segmentLabelActive,
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ErrorNotice message={error} onRetry={() => void load()} />

        {loading ? (
          <LoadingState color={Accents.pink.main} />
        ) : (
          <MotiView
            // Keyed on the tab so switching replays the entrance rather than
            // cross-fading two very different layouts.
            key={tab}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            {tab === 'cycle' ? (
              <CyclePanel
                summary={cycleSummary}
                today={todayEntry}
                onPickLog={setActiveLog}
                onSeeAll={comingSoon}
              />
            ) : pregnancy && pregnancySummary ? (
              <PregnancyPanel
                record={pregnancy}
                summary={pregnancySummary}
                today={todayLog}
                tileValues={tileValues}
                onPickLog={setActiveLog}
              />
            ) : (
              <PregnancySetup
                onSetDueDate={(date) => void saveDueDate(date)}
              />
            )}
          </MotiView>
        )}

        <View style={{ height: Spacing.navClearance }} />
      </ScrollView>

      <LogSheet
        kind={activeLog}
        initialValue={initialLogValue}
        onClose={() => setActiveLog(null)}
        onSave={(kind, value) => void saveLog(kind, value)}
      />

      <FloatingNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    paddingHorizontal: Spacing.screen,
  },
  segmented: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.lg,
    padding: Spacing.xs,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  segmentActive: { backgroundColor: Colors.primaryTint },
  segmentLabel: { ...Typography.optionLabel, color: Colors.textSecondary },
  segmentLabelActive: { color: Colors.primary },
});
