import { useFocusEffect } from 'expo-router';
import {
  Apple,
  ChevronDown,
  ChevronRight,
  Salad,
  Target,
  XCircle,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { MotiView } from 'moti';
import { type JSX, useCallback, useMemo, useState } from 'react';
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
import {
  AVOID_FOODS,
  AvoidFood,
  DietMode,
  dietFor,
} from '../../constants/pregnancyDiet';
import {
  Accent,
  Accents,
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import { errorMessage } from '../../services/errors';
import { getProfileSummary } from '../../services/profile';
import {
  DietRegion,
  PregnancyRecord,
  getPregnancy,
  setDietRegion,
  summarisePregnancy,
} from '../../services/women';

/** Which panel is expanded. Only one opens at a time. */
type Panel = 'goals' | 'eat' | 'avoid' | 'meals' | null;

/** Label for each diet mode, shown on the plan card. */
const MODE_LABEL: Record<DietMode, string> = {
  veg: 'Vegetarian',
  eggetarian: 'Eggetarian',
  non_veg: 'Veg + non-veg',
};

/**
 * Works out which foods the plan may suggest.
 *
 * `dietary_preference` is the precise field and the only one that distinguishes
 * eggetarian, so it wins when set. It is not written at onboarding yet, though,
 * so `eating_style` — which is — stands in when it is null.
 *
 * Keto and paleo appear in `eating_style` and neither is appropriate in
 * pregnancy, so they are read only as "not vegetarian" rather than being
 * honoured as diets in their own right.
 */
function dietModeFor(
  profile: { dietaryPreference: string | null; eatingStyle: string | null } | null
): DietMode {
  const preference = profile?.dietaryPreference;
  if (preference === 'veg') return 'veg';
  if (preference === 'eggetarian') return 'eggetarian';
  if (preference === 'non_veg') return 'non_veg';

  const style = profile?.eatingStyle;
  if (style === 'vegetarian' || style === 'vegan') return 'veg';
  return 'non_veg';
}

/** How firmly an avoid entry is actually evidenced. */
const STRENGTH_STYLE: Record<
  AvoidFood['strength'],
  { label: string; accent: Accent }
> = {
  avoid: { label: 'Avoid', accent: Accents.rose },
  limit: { label: 'Limit', accent: Accents.amber },
  custom: { label: 'Custom', accent: Accents.neutral },
};

interface RowProps {
  icon: LucideIcon;
  accent: Accent;
  title: string;
  subtitle: string;
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

/** One expandable section of the chart. */
function Section({
  icon: Icon,
  accent,
  title,
  subtitle,
  open,
  onPress,
  children,
}: RowProps) {
  return (
    <View style={styles.section}>
      <AnimatedPressable onPress={onPress} style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: accent.tint }]}>
          <Icon size={17} color={accent.main} strokeWidth={2.2} />
        </View>
        <View style={styles.sectionText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        {open ? (
          <ChevronDown size={18} color={Colors.textMuted} />
        ) : (
          <ChevronRight size={18} color={Colors.textMuted} />
        )}
      </AnimatedPressable>

      {open && (
        <MotiView
          from={{ opacity: 0, translateY: -6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: Motion.fast }}
          style={styles.sectionBody}>
          {children}
        </MotiView>
      )}
    </View>
  );
}

/**
 * Diet Chart — a trimester plan for North or South Indian eating, vegetarian
 * or with non-veg options.
 *
 * Rendered from structured content rather than shown as an image, so it reflows
 * on a phone, works with text scaling and can be read aloud.
 */
export default function DietScreen(): JSX.Element {
  const [record, setRecord] = useState<PregnancyRecord | null>(null);
  const [region, setRegion] = useState<DietRegion>('north');
  const [mode, setMode] = useState<DietMode>('non_veg');
  const [panel, setPanel] = useState<Panel>('goals');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Loads the record, the saved region, and whether she eats vegetarian. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const [pregnancy, profile] = await Promise.all([
        getPregnancy(),
        getProfileSummary(),
      ]);
      setRecord(pregnancy);
      if (pregnancy?.dietRegion) setRegion(pregnancy.dietRegion);
      setMode(dietModeFor(profile));
    } catch (err) {
      setError(errorMessage(err, 'Could not load your diet chart.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const summary = record ? summarisePregnancy(record) : null;
  const chart = useMemo(
    () => dietFor(summary?.trimester ?? 1, region),
    [summary?.trimester, region]
  );

  /** Switches region and remembers the choice for next time. */
  const pickRegion = async (next: DietRegion) => {
    setRegion(next);
    try {
      await setDietRegion(next);
    } catch {
      // A failed preference write is not worth interrupting her reading for —
      // the chart already shows the right region for this session.
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Diet Chart" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ErrorNotice message={error} onRetry={() => void load()} />

        {loading || !summary ? (
          <LoadingState color={Accents.green.main} />
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            <View style={styles.regionRow}>
              {(['north', 'south'] as DietRegion[]).map((item) => {
                const selected = region === item;
                return (
                  <AnimatedPressable
                    key={item}
                    onPress={() => void pickRegion(item)}
                    style={[styles.region, selected && styles.regionActive]}>
                    <Text
                      style={[
                        styles.regionLabel,
                        selected && styles.regionLabelActive,
                      ]}>
                      {item === 'north' ? 'North Indian' : 'South Indian'}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            <View style={styles.planCard}>
              <Salad size={26} color={Accents.green.dark} strokeWidth={1.9} />
              <Text style={styles.planTitle}>
                {chart.trimester === 1
                  ? 'First'
                  : chart.trimester === 2
                    ? 'Second'
                    : 'Third'}{' '}
                trimester plan
              </Text>
              <Text style={styles.planWeeks}>{chart.weeks}</Text>
              <Text style={styles.planFocus}>{chart.focus}</Text>
              <View style={styles.planTags}>
                <Text style={styles.planTag}>{MODE_LABEL[mode]}</Text>
                {chart.extraCalories > 0 && (
                  <Text style={styles.planTag}>
                    +{chart.extraCalories} kcal/day
                  </Text>
                )}
              </View>
            </View>

            <Section
              icon={Target}
              accent={Accents.green}
              title="Daily nutrition goals"
              subtitle="What to aim for this trimester"
              open={panel === 'goals'}
              onPress={() => setPanel(panel === 'goals' ? null : 'goals')}>
              {chart.goals.map((goal) => (
                <View key={goal.label} style={styles.goalRow}>
                  <View style={styles.goalHead}>
                    <Text style={styles.goalLabel}>{goal.label}</Text>
                    <Text style={styles.goalAmount}>{goal.amount}</Text>
                  </View>
                  <Text style={styles.goalNote}>{goal.note}</Text>
                </View>
              ))}
            </Section>

            <Section
              icon={Apple}
              accent={Accents.green}
              title="Foods to eat"
              subtitle="Recommended for these weeks"
              open={panel === 'eat'}
              onPress={() => setPanel(panel === 'eat' ? null : 'eat')}>
              {chart.eat.map((food) => (
                <View key={food.name} style={styles.foodRow}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodWhy}>{food.why}</Text>
                </View>
              ))}
            </Section>

            <Section
              icon={XCircle}
              accent={Accents.rose}
              title="Foods to avoid"
              subtitle="Limit or avoid entirely"
              open={panel === 'avoid'}
              onPress={() => setPanel(panel === 'avoid' ? null : 'avoid')}>
              {AVOID_FOODS.map((food) => {
                const style = STRENGTH_STYLE[food.strength];
                return (
                  <View key={food.name} style={styles.foodRow}>
                    <View style={styles.avoidHead}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text
                        style={[
                          styles.strengthPill,
                          {
                            backgroundColor: style.accent.tint,
                            color: style.accent.dark,
                          },
                        ]}>
                        {style.label}
                      </Text>
                    </View>
                    <Text style={styles.foodWhy}>{food.why}</Text>
                  </View>
                );
              })}
              <Text style={styles.avoidNote}>
                Entries marked &quot;custom&quot; are widely avoided in India but
                have little evidence behind them. They are listed so you know
                which is which.
              </Text>
            </Section>

            <Section
              icon={Salad}
              accent={Accents.amber}
              title="Sample meal plan"
              subtitle="A full day, morning to bedtime"
              open={panel === 'meals'}
              onPress={() => setPanel(panel === 'meals' ? null : 'meals')}>
              {chart.meals.map((meal) => (
                <View key={meal.occasion} style={styles.mealRow}>
                  <View style={styles.mealHead}>
                    <Text style={styles.mealOccasion}>{meal.occasion}</Text>
                    <Text style={styles.mealTime}>{meal.time}</Text>
                  </View>
                  <Text style={styles.mealText}>{meal.veg}</Text>
                  {mode !== 'veg' && !!meal.egg && (
                    <Text style={styles.mealAlt}>Egg option · {meal.egg}</Text>
                  )}
                  {mode === 'non_veg' && !!meal.nonVeg && (
                    <Text style={styles.mealAlt}>
                      Non-veg option · {meal.nonVeg}
                    </Text>
                  )}
                </View>
              ))}
            </Section>

            <Text style={styles.footnote}>
              A general guide, not a prescription. If you have gestational
              diabetes, a thyroid condition, high blood pressure or are carrying
              twins, follow the plan your doctor or dietitian gives you instead.
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
  regionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  region: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  regionActive: { backgroundColor: Accents.green.tint },
  regionLabel: { ...Typography.caption, color: Colors.textSecondary },
  regionLabelActive: { color: Accents.green.dark, fontWeight: '700' },
  planCard: {
    backgroundColor: Accents.green.tint,
    borderRadius: Radius.card,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  planTitle: {
    ...Typography.cardTitle,
    color: Accents.green.dark,
    marginTop: Spacing.md,
  },
  planWeeks: { ...Typography.caption, color: Accents.green.dark, marginTop: 2 },
  planFocus: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  planTags: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  planTag: {
    ...Typography.label,
    fontSize: 10.5,
    fontWeight: '700',
    color: Accents.green.dark,
    backgroundColor: Colors.surface,
    borderRadius: Radius.round,
    paddingVertical: 3,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionText: { flex: 1 },
  sectionTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionSubtitle: { ...Typography.label, color: Colors.textSecondary },
  sectionBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  goalRow: { paddingVertical: Spacing.sm },
  goalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  goalLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  goalAmount: {
    ...Typography.caption,
    fontWeight: '700',
    color: Accents.green.dark,
  },
  goalNote: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  foodRow: { paddingVertical: Spacing.sm },
  avoidHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  foodName: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  foodWhy: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  strengthPill: {
    ...Typography.label,
    fontSize: 10,
    fontWeight: '700',
    borderRadius: Radius.round,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  avoidNote: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    lineHeight: 17,
  },
  mealRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mealHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  mealOccasion: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  mealTime: { ...Typography.label, color: Colors.textMuted },
  mealText: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 17,
  },
  mealAlt: {
    ...Typography.label,
    color: Accents.rose.dark,
    marginTop: Spacing.xs,
    lineHeight: 17,
  },
  footnote: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: Spacing.lg,
    lineHeight: 17,
  },
});
