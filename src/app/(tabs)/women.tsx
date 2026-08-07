import { Redirect, useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import FloatingNav from '../../components/FloatingNav';
import AddCheckupSheet from '../../components/women/AddCheckupSheet';
import CyclePanel from '../../components/women/CyclePanel';
import LogSheet, {
  LOG_CONFIG,
  LogKind,
  LogValue,
} from '../../components/women/LogSheet';
import PregnancyPanel, {
  PregnancySetup,
} from '../../components/women/PregnancyPanel';
import {
  Accents,
  Colors,
  Motion,
  Radius,
  Spacing,
  Typography,
} from '../../constants/theme';
import { startOfToday, toDateString } from '../../services/dates';
import { useProfileSummary } from '../../services/profile';
import {
  Checkup,
  CycleEntry,
  CycleEntryInput,
  FlowLevel,
  OvulationTest,
  PregnancyRecord,
  addCheckup,
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
 * Only reachable when the signed-in user's profile gender is `woman`; the
 * bottom nav hides the tab for everyone else, and this screen redirects if the
 * route is opened directly.
 */
export default function WomenScreen() {
  const profile = useProfileSummary();
  const [tab, setTab] = useState<Tab>('cycle');
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [pregnancy, setPregnancy] = useState<PregnancyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLog, setActiveLog] = useState<LogKind | null>(null);
  const [checkupOpen, setCheckupOpen] = useState(false);

  const todayKey = toDateString(startOfToday());

  /** Loads the cycle history and the pregnancy record together. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const [cycleEntries, pregnancyRecord] = await Promise.all([
        getCycleEntries(),
        getPregnancy(),
      ]);
      setEntries(cycleEntries);
      setPregnancy(pregnancyRecord);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load your health data.'
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
      err instanceof Error ? err.message : fallback
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

  /** Adds an antenatal appointment to the pregnancy record. */
  const saveCheckup = async (checkup: Omit<Checkup, 'id'>) => {
    try {
      await addCheckup(checkup);
      await load();
    } catch (err) {
      reportFailure(err, 'Could not save that checkup.');
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Women&apos;s Health</Text>

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

        {!!error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={() => void load()}
              accessibilityRole="button">
              <Text style={styles.errorRetry}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Accents.pink.main} />
          </View>
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
                onPickLog={setActiveLog}
                onChangeDueDate={(date) => void saveDueDate(date)}
                onAddCheckup={() => setCheckupOpen(true)}
                onSeeAll={comingSoon}
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

      <AddCheckupSheet
        visible={checkupOpen}
        onClose={() => setCheckupOpen(false)}
        onSave={(checkup) => void saveCheckup(checkup)}
      />

      <FloatingNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.xxl,
  },
  title: { ...Typography.screenTitle, color: Colors.textPrimary },
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
  loading: { paddingVertical: Spacing.max, alignItems: 'center' },
  errorCard: {
    backgroundColor: Colors.errorTint,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  errorText: { ...Typography.caption, color: Colors.error },
  errorRetry: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.error,
    marginTop: Spacing.sm,
  },
});
