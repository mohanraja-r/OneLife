import { useFocusEffect } from 'expo-router';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AnimatedPressable from '../../components/AnimatedPressable';
import AppHeader from '../../components/AppHeader';
import { ErrorNotice, LoadingState } from '../../components/ui';
import { weekDetail } from '../../constants/pregnancyWeeks';
import {
  Accents,
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import { errorMessage } from '../../services/errors';
import {
  PregnancyRecord,
  babySizeForWeek,
  getPregnancy,
  summarisePregnancy,
} from '../../services/women';

/** The range the size chart covers. */
const FIRST_WEEK = 4;
const LAST_WEEK = 40;

/**
 * Baby Growth — this week's size comparison, measurements and development
 * highlights, with arrows to step through the other weeks.
 *
 * Opens on the current week but is browsable, because "what happens next" is
 * the question people actually come here with.
 */
export default function BabyGrowthScreen() {
  const [record, setRecord] = useState<PregnancyRecord | null>(null);
  const [week, setWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Loads the pregnancy record and opens on the week she is currently at. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const pregnancy = await getPregnancy();
      setRecord(pregnancy);
      if (pregnancy) {
        // Only seeded once — stepping through weeks must survive a refocus.
        setWeek((current) =>
          current ?? summarisePregnancy(pregnancy).week
        );
      }
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

  const currentWeek = record ? summarisePregnancy(record).week : 0;
  const shownWeek = week ?? currentWeek;
  const size = useMemo(() => babySizeForWeek(shownWeek), [shownWeek]);
  const detail = useMemo(() => weekDetail(shownWeek), [shownWeek]);

  const summary = record ? summarisePregnancy(record) : null;
  const isCurrentWeek = shownWeek === currentWeek;

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Baby Growth" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ErrorNotice message={error} onRetry={() => void load()} />

        {loading ? (
          <LoadingState color={Accents.pink.main} />
        ) : (
          <MotiView
            key={shownWeek}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            <Text style={styles.question}>How big is baby?</Text>

            <View style={styles.weekRow}>
              <AnimatedPressable
                onPress={() => setWeek(Math.max(FIRST_WEEK, shownWeek - 1))}
                style={styles.stepButton}>
                <ChevronLeft
                  size={20}
                  color={
                    shownWeek <= FIRST_WEEK
                      ? Colors.textMuted
                      : Colors.textPrimary
                  }
                />
              </AnimatedPressable>

              <View style={styles.weekLabel}>
                <Text style={styles.weekValue}>
                  {isCurrentWeek && summary
                    ? `${summary.week}w ${summary.day}d`
                    : `Week ${shownWeek}`}
                </Text>
                {!isCurrentWeek && (
                  <AnimatedPressable onPress={() => setWeek(currentWeek)}>
                    <Text style={styles.backToNow}>Back to this week</Text>
                  </AnimatedPressable>
                )}
              </View>

              <AnimatedPressable
                onPress={() => setWeek(Math.min(LAST_WEEK, shownWeek + 1))}
                style={styles.stepButton}>
                <ChevronRight
                  size={20}
                  color={
                    shownWeek >= LAST_WEEK
                      ? Colors.textMuted
                      : Colors.textPrimary
                  }
                />
              </AnimatedPressable>
            </View>

            <Text style={styles.sizeIntro}>Baby is about the size of a</Text>
            <Text style={styles.sizeName}>{size.name}</Text>

            <View style={styles.emojiStage}>
              <Text style={styles.emoji}>{size.emoji}</Text>
            </View>

            <View style={styles.metricsCard}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{size.lengthCm}</Text>
                <Text style={styles.metricUnit}>cm</Text>
                <Text style={styles.metricLabel}>Length</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{size.weightG}</Text>
                <Text style={styles.metricUnit}>gm</Text>
                <Text style={styles.metricLabel}>Weight</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metric}>
                <Text style={styles.metricValue}>
                  {detail.headCm ?? '—'}
                </Text>
                <Text style={styles.metricUnit}>cm</Text>
                <Text style={styles.metricLabel}>Head size</Text>
              </View>
            </View>

            <View style={styles.highlightsCard}>
              <Text style={styles.highlightsTitle}>This week&apos;s highlights</Text>
              {detail.highlights.map((line) => (
                <View key={line} style={styles.highlightRow}>
                  <View style={styles.highlightTick}>
                    <Check
                      size={11}
                      color={Accents.pink.main}
                      strokeWidth={3}
                    />
                  </View>
                  <Text style={styles.highlightText}>{line}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.footnote}>
              These are average figures from standard growth charts. A baby
              measuring above or below them is completely normal — your scan
              reports are what count.
            </Text>
          </MotiView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.navClearance,
  },
  question: {
    ...Typography.cardTitle,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekLabel: { alignItems: 'center', flex: 1 },
  weekValue: {
    ...Typography.screenTitle,
    color: Colors.textPrimary,
  },
  backToNow: { ...Typography.label, color: Colors.accent, marginTop: 2 },
  sizeIntro: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  sizeName: {
    ...Typography.screenTitle,
    color: Accents.violet.main,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  emojiStage: {
    height: 190,
    borderRadius: Radius.card,
    backgroundColor: Accents.pink.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  emoji: { fontSize: 108, lineHeight: 130 },
  metricsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
    ...Shadow.card,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: {
    ...Typography.largeNumber,
    fontSize: 26,
    lineHeight: 32,
    color: Colors.textPrimary,
  },
  metricUnit: { ...Typography.label, color: Colors.textSecondary },
  metricLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  metricDivider: {
    width: 1,
    height: 42,
    backgroundColor: Colors.border,
  },
  highlightsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    ...Shadow.card,
  },
  highlightsTitle: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  highlightTick: {
    width: 18,
    height: 18,
    borderRadius: Radius.round,
    backgroundColor: Accents.pink.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  highlightText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 19,
  },
  footnote: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
    lineHeight: 17,
  },
});
