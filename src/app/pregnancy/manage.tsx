import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useFocusEffect } from 'expo-router';
import {
  Baby,
  CalendarDays,
  Check,
  RotateCcw,
  Trash2,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AnimatedPressable from '../../components/AnimatedPressable';
import PregnancyHeader from '../../components/pregnancy/PregnancyHeader';
import {
  DateTimeSpinnerSheet,
  ErrorNotice,
  LoadingState,
} from '../../components/ui';
import {
  Accents,
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import {
  formatLongDate,
  parseDateString,
  startOfToday,
  toDateString,
} from '../../services/dates';
import { errorMessage } from '../../services/errors';
import { deleteAllPregnancyData } from '../../services/pregnancy';
import {
  BabyOutcome,
  PregnancyRecord,
  clearDelivery,
  getPregnancy,
  setDelivery,
  setDueDate,
} from '../../services/women';

/** Which date the picker is currently editing. */
type Picking = 'due' | 'delivered' | null;

/** The three answers people give to "who arrived?". */
const OUTCOMES: { id: BabyOutcome; label: string; emoji: string }[] = [
  { id: 'girl', label: 'A girl', emoji: '👧' },
  { id: 'boy', label: 'A boy', emoji: '👦' },
  { id: 'twins', label: 'Twins', emoji: '👶👶' },
];

/**
 * Manage — change the due date, record the birth, or delete everything.
 *
 * Kept off the hub because all three are rare, and the last one is
 * irreversible. Grouping them here means the destructive action is somewhere
 * deliberate rather than one stray tap away from the daily screens.
 */
export default function ManageScreen() {
  const [record, setRecord] = useState<PregnancyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [draft, setDraft] = useState(startOfToday());
  const [outcome, setOutcome] = useState<BabyOutcome | null>(null);
  const [busy, setBusy] = useState(false);

  /** Loads the pregnancy record this screen edits. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const pregnancy = await getPregnancy();
      setRecord(pregnancy);
      setOutcome(pregnancy?.babyOutcome ?? null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your pregnancy.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const delivered = record?.deliveredOn !== null && record?.deliveredOn !== undefined;

  /** Saves a picked date to whichever field opened the picker. */
  const commitDate = async (date: Date, target: Exclude<Picking, null>) => {
    if (!record) return;
    try {
      if (target === 'due') {
        await setDueDate(toDateString(date));
      } else {
        // The birth date is only meaningful alongside who arrived, so the
        // outcome has to be chosen before this can be saved.
        if (!outcome) {
          setError('Choose girl, boy or twins first.');
          return;
        }
        await setDelivery(toDateString(date), outcome);
      }
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not save that change.'));
    }
  };

  /** Opens the platform date picker for one of the two dates. */
  const openPicker = (target: Exclude<Picking, null>) => {
    const seed =
      target === 'due' && record
        ? parseDateString(record.dueDate)
        : record?.deliveredOn
          ? parseDateString(record.deliveredOn)
          : startOfToday();

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: seed,
        mode: 'date',
        onChange: (event, date) => {
          if (event.type === 'set' && date) void commitDate(date, target);
        },
      });
      return;
    }

    setDraft(seed);
    setPicking(target);
  };

  /** Records the birth once an outcome has been chosen. */
  const recordBirth = (chosen: BabyOutcome) => {
    setOutcome(chosen);
    setError(null);
    // The date matters as much as the answer, so picking one leads straight
    // into the other rather than saving today's date silently.
    setTimeout(() => openPicker('delivered'), 0);
  };

  /** Reopens a pregnancy closed by mistake. */
  const undoBirth = () => {
    Alert.alert(
      'Reopen this pregnancy?',
      'Week tracking will start again from your due date.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen',
          onPress: () => {
            void (async () => {
              try {
                await clearDelivery();
                setOutcome(null);
                await load();
              } catch (err) {
                setError(errorMessage(err, 'Could not reopen the pregnancy.'));
              }
            })();
          },
        },
      ]
    );
  };

  /**
   * Deletes everything, behind two confirmations.
   *
   * The second one names the photographs specifically. They are the only part
   * of this that cannot be recreated, and a single tap is not enough of a gate
   * in front of losing them.
   */
  const confirmDelete = () => {
    Alert.alert(
      'Delete pregnancy data?',
      'This removes your due date, weight history, kick sessions, test records, hospital bag and every saved memory.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'This cannot be undone',
              'Your saved photos will be permanently deleted. Save anything you want to keep before continuing.',
              [
                { text: 'Keep my data', style: 'cancel' },
                {
                  text: 'Delete everything',
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      try {
                        setBusy(true);
                        await deleteAllPregnancyData();
                        router.replace('/(tabs)/women');
                      } catch (err) {
                        setBusy(false);
                        setError(
                          errorMessage(err, 'Could not delete your data.')
                        );
                      }
                    })();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <PregnancyHeader title="Manage" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ErrorNotice message={error} onRetry={() => void load()} />

        {loading || !record ? (
          <LoadingState color={Accents.pink.main} />
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            {/* ------------------------------------------------- Due date */}
            <Text style={styles.sectionTitle}>Expected delivery date</Text>
            <AnimatedPressable
              onPress={() => openPicker('due')}
              style={styles.card}>
              <View style={styles.rowIcon}>
                <CalendarDays
                  size={18}
                  color={Accents.violet.main}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>
                  {formatLongDate(record.dueDate)}
                </Text>
                <Text style={styles.rowBody}>
                  Every week, test date and chart on the other screens is worked
                  out from this.
                </Text>
              </View>
            </AnimatedPressable>

            {/* ------------------------------------------------- Delivery */}
            <Text style={styles.sectionTitle}>Baby delivery</Text>

            {delivered ? (
              <View style={styles.card}>
                <View style={[styles.rowIcon, styles.rowIconDone]}>
                  <Check size={18} color={Accents.green.main} strokeWidth={2.6} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>
                    {record.babyOutcome === 'twins'
                      ? 'Twins arrived'
                      : record.babyOutcome === 'girl'
                        ? 'A girl arrived'
                        : 'A boy arrived'}
                  </Text>
                  <Text style={styles.rowBody}>
                    On {formatLongDate(record.deliveredOn as string)}. Week
                    tracking has stopped.
                  </Text>
                  <AnimatedPressable onPress={undoBirth} style={styles.undoRow}>
                    <RotateCcw size={13} color={Colors.accent} />
                    <Text style={styles.undoText}>Reopen pregnancy</Text>
                  </AnimatedPressable>
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.rowText}>
                  <View style={styles.deliveryHead}>
                    <Baby size={18} color={Accents.pink.main} strokeWidth={2} />
                    <Text style={styles.rowTitle}>Has your baby arrived?</Text>
                  </View>
                  <Text style={styles.rowBody}>
                    Let us know who it was, then pick the date. Week tracking
                    stops and your memories stay exactly where they are.
                  </Text>

                  <View style={styles.outcomeRow}>
                    {OUTCOMES.map((item) => {
                      const selected = outcome === item.id;
                      return (
                        <AnimatedPressable
                          key={item.id}
                          onPress={() => recordBirth(item.id)}
                          style={[
                            styles.outcome,
                            selected && styles.outcomeActive,
                          ]}>
                          <Text style={styles.outcomeEmoji}>{item.emoji}</Text>
                          <Text
                            style={[
                              styles.outcomeLabel,
                              selected && styles.outcomeLabelActive,
                            ]}>
                            {item.label}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* --------------------------------------------------- Danger */}
            <Text style={styles.sectionTitle}>Delete pregnancy data</Text>
            <View style={[styles.card, styles.dangerCard]}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Delete everything</Text>
                <Text style={styles.rowBody}>
                  Removes your due date, weight history, kick sessions, test
                  records, hospital bag and every saved memory including the
                  photos. This cannot be undone.
                </Text>

                <AnimatedPressable
                  onPress={confirmDelete}
                  style={styles.dangerButton}>
                  <Trash2 size={16} color={Colors.danger} strokeWidth={2.2} />
                  <Text style={styles.dangerText}>
                    {busy ? 'Deleting…' : 'Delete pregnancy data'}
                  </Text>
                </AnimatedPressable>
              </View>
            </View>
          </MotiView>
        )}
      </ScrollView>

      {Platform.OS === 'ios' && (
        <DateTimeSpinnerSheet
          visible={picking !== null}
          onClose={() => setPicking(null)}
          title={
            picking === 'due' ? 'Expected delivery date' : 'Date of birth'
          }
          value={draft}
          mode="date"
          accent={Accents.pink}
          onChange={setDraft}
          onDone={() => {
            if (picking) void commitDate(draft, picking);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.navClearance,
  },
  sectionTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  dangerCard: { borderColor: Colors.errorTint },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Accents.violet.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowIconDone: { backgroundColor: Accents.green.tint },
  rowText: { flex: 1 },
  rowTitle: {
    ...Typography.optionLabel,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  rowBody: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 17,
  },
  deliveryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  outcomeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  outcome: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: Spacing.md,
  },
  outcomeActive: {
    backgroundColor: Accents.pink.tint,
    borderColor: Accents.pink.main,
  },
  outcomeEmoji: { fontSize: 20, lineHeight: 26 },
  outcomeLabel: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  outcomeLabelActive: { color: Accents.pink.dark },
  undoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
  },
  undoText: { ...Typography.label, fontWeight: '600', color: Colors.accent },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorTint,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  dangerText: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.danger,
  },
});
