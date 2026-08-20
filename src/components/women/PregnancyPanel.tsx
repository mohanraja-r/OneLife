import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  Baby,
  CalendarDays,
  ChevronRight,
  Footprints,
  Image as ImageIcon,
  Quote,
  Salad,
  Settings2,
  ShoppingBag,
  Stethoscope,
  TrendingUp,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { type JSX, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

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
  accentShadow,
} from '../../constants/theme';
import {
  addDays,
  formatLongDate,
  parseDateString,
  startOfToday,
  toDateString,
} from '../../services/dates';
import type {
  PregnancyLog,
  PregnancyRecord,
  PregnancySummary,
} from '../../services/women';
import AnimatedPressable from '../AnimatedPressable';
import { DateTimeSpinnerSheet } from '../ui';

import { LogKind, PREGNANCY_LOGS } from './LogSheet';
import { Disclaimer, LogRow, SectionHeader } from './shared';

/** A full term from the last menstrual period, used to seed the date picker. */
const GESTATION_DAYS = 280;

/** One tile in the feature grid. */
interface Feature {
  key: string;
  label: string;
  icon: LucideIcon;
  accent: Accent;
  /** Typed so a renamed route is caught here rather than at runtime. */
  route: Href;
}

/**
 * The six pregnancy features.
 *
 * Labels wrap naturally rather than carrying hard line breaks: forcing every
 * label onto two lines left the one-word ones ("Memories") short, and against a
 * fixed tile height that read as the content floating at the top of the card.
 * Two across gives each label the room to sit on one line at most widths.
 */
const FEATURES: Feature[] = [
  {
    key: 'weight',
    label: 'Weight tracker',
    icon: TrendingUp,
    accent: Accents.violet,
    route: '/pregnancy/weight',
  },
  {
    key: 'kicks',
    label: 'Kick tracker',
    icon: Footprints,
    accent: Accents.pink,
    route: '/pregnancy/kicks',
  },
  {
    key: 'tests',
    label: 'Tests & scans',
    icon: Stethoscope,
    accent: Accents.blue,
    route: '/pregnancy/tests',
  },
  {
    key: 'bag',
    label: 'Hospital bag',
    icon: ShoppingBag,
    accent: Accents.orange,
    route: '/pregnancy/hospital-bag',
  },
  {
    key: 'memories',
    label: 'Memories',
    icon: ImageIcon,
    accent: Accents.rose,
    route: '/pregnancy/memories',
  },
  {
    key: 'diet',
    label: 'Diet chart',
    icon: Salad,
    accent: Accents.green,
    route: '/pregnancy/diet',
  },
];

/**
 * Short daily notes, grouped by trimester. Picked by the day of the month so
 * the same tip shows all day and changes overnight, without needing to store
 * which ones have already been seen.
 */
const TIPS: Record<1 | 2 | 3, string[]> = {
  1: [
    'Eat something small every two hours — an empty stomach makes nausea worse, not better.',
    'Folate matters most in these weeks. Palak, methi and moong dal are the easiest sources.',
    'Tiredness now is normal and it does pass. Sleep when you can.',
    'Sip water through the day rather than drinking a lot at once.',
    'Ginger or saunf genuinely help with morning sickness. Both are safe.',
  ],
  2: [
    'Stay hydrated, eat nutritious foods and take short walks.',
    'Pair iron foods with something sour — lemon over dal doubles what you absorb.',
    'Start sleeping on your left side. It improves blood flow to the baby.',
    'This is the easiest trimester for most people. Use the energy while it lasts.',
    'Ragi and til are the two best everyday calcium sources in an Indian kitchen.',
  ],
  3: [
    'Smaller, more frequent meals help now that there is less room for your stomach.',
    'Keep your hospital bag packed from week 34 onwards.',
    'Count kicks at the same time each day — the pattern matters more than the number.',
    'Swelling in the feet is common. Sudden swelling in the face or hands is not — call your doctor.',
    'Dates in the last few weeks are linked with a shorter first stage of labour.',
  ],
};

interface DueDateProps {
  /** `YYYY-MM-DD`, or null when no due date has been set yet. */
  value: string | null;
  onChange: (date: string) => void;
  children: (open: () => void) => React.ReactNode;
}

/**
 * Wraps any control in the platform's date picker for the due date.
 *
 * Android gets the system dialog through the imperative API; iOS has no
 * equivalent, so the wheel is presented in a sheet styled like the rest of the
 * app. `children` is a render prop so the trigger can be a button or a row.
 */
function DueDatePicker({ value, onChange, children }: DueDateProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  // Default to a due date a full term out, which is what someone setting this
  // up on the day they found out would want.
  const seed = value
    ? parseDateString(value)
    : addDays(startOfToday(), GESTATION_DAYS);
  const [draft, setDraft] = useState(seed);

  /** Opens the platform's date picker. */
  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: seed,
        mode: 'date',
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toDateString(date));
        },
      });
      return;
    }
    setDraft(seed);
    setSheetOpen(true);
  };

  return (
    <>
      {children(open)}

      {Platform.OS === 'ios' && (
        <DateTimeSpinnerSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Estimated due date"
          value={draft}
          mode="date"
          accent={Accents.pink}
          onChange={setDraft}
          onDone={() => onChange(toDateString(draft))}
        />
      )}
    </>
  );
}

/** The empty state: no due date is set, so there is nothing to track yet. */
export function PregnancySetup({
  onSetDueDate,
}: {
  onSetDueDate: (date: string) => void;
}): JSX.Element {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 14 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: Motion.slow }}
      style={styles.setupCard}>
      <View style={styles.setupTile}>
        <Baby size={28} color={Accents.pink.main} strokeWidth={1.8} />
      </View>
      <Text style={styles.setupTitle}>Track your pregnancy</Text>
      <Text style={styles.setupBody}>
        Set your estimated due date and we&apos;ll follow the weeks with you —
        size comparisons, weight and kick tracking, your test schedule and a
        place to keep the photos.
      </Text>

      <DueDatePicker value={null} onChange={onSetDueDate}>
        {(open) => (
          <AnimatedPressable
            onPress={open}
            style={[styles.setupButton, accentShadow(Accents.pink.main)]}>
            <CalendarDays size={18} color={Colors.textInverse} strokeWidth={2.2} />
            <Text style={styles.setupButtonText}>Set due date</Text>
          </AnimatedPressable>
        )}
      </DueDatePicker>
    </MotiView>
  );
}

interface Props {
  record: PregnancyRecord;
  summary: PregnancySummary;
  /** Today's log, so the log tiles can show what is already recorded. */
  today: PregnancyLog | null;
  /** Live value for each feature tile, keyed by `Feature.key`. */
  tileValues: Partial<Record<string, string>>;
  onPickLog: (kind: LogKind) => void;
}

/**
 * Shown once the birth has been recorded, in place of the week tracker.
 *
 * The features stay reachable — memories especially, which is the part people
 * come back to afterwards — but nothing goes on counting weeks.
 */
function DeliveredCard({ record }: { record: PregnancyRecord }) {
  const arrival =
    record.babyOutcome === 'twins'
      ? 'Your twins have arrived'
      : record.babyOutcome === 'girl'
        ? 'Your daughter has arrived'
        : 'Your son has arrived';

  return (
    <MotiView
      from={{ opacity: 0, translateY: 14 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: Motion.slow }}>
      <LinearGradient
        colors={Gradients.activity}
        start={Gradients.diagonal.start}
        end={Gradients.diagonal.end}
        style={styles.deliveredCard}>
        <Text style={styles.deliveredEmoji}>
          {record.babyOutcome === 'twins' ? '👶👶' : '👶'}
        </Text>
        <Text style={styles.deliveredTitle}>{arrival}</Text>
        <Text style={styles.deliveredBody}>
          Congratulations. Week tracking has stopped, and everything you saved
          is still here whenever you want it.
        </Text>
      </LinearGradient>

      <AnimatedPressable
        onPress={() => router.push('/pregnancy/memories')}
        style={styles.deliveredAction}>
        <ImageIcon size={16} color={Colors.accent} strokeWidth={2.2} />
        <Text style={styles.deliveredActionText}>Open your memories</Text>
      </AnimatedPressable>

      <AnimatedPressable
        onPress={() => router.push('/pregnancy/manage')}
        style={styles.dueRow}>
        <Settings2 size={13} color={Colors.textSecondary} strokeWidth={2.2} />
        <Text style={styles.dueText}>Manage pregnancy data</Text>
      </AnimatedPressable>
    </MotiView>
  );
}

/**
 * Which log tiles already hold a value for today.
 *
 * Only covers what `PREGNANCY_LOGS` actually draws — weight and kicks moved to
 * their own screens and are no longer quick-logged here.
 */
function loggedKinds(today: PregnancyLog | null): Set<LogKind> {
  const done = new Set<LogKind>();
  if (!today) return done;
  if (today.symptoms?.length) done.add('symptoms');
  if (today.mood) done.add('mood');
  if (typeof today.sleepHours === 'number') done.add('sleep');
  if (today.notes) done.add('notes');
  return done;
}

/**
 * The Pregnancy hub: how far along she is, the six feature tiles, a place to
 * log the day, and the tip for today.
 *
 * Each feature opens its own screen under `/pregnancy` rather than expanding
 * here — this panel used to hold everything and had grown past the point of
 * being readable or navigable.
 */
export default function PregnancyPanel({
  record,
  summary,
  today,
  tileValues,
  onPickLog,
}: Props): JSX.Element {
  // Once the birth is recorded there is no week to count, so the whole hero and
  // the daily log come out rather than being shown against a frozen date.
  if (record.deliveredOn !== null) {
    return <DeliveredCard record={record} />;
  }

  const {
    week,
    day,
    trimester,
    trimesterLabel,
    weeksToGo,
    progress,
    dueDate,
    babySize,
  } = summary;

  const tips = TIPS[trimester];
  const tip = tips[new Date().getDate() % tips.length];

  return (
    <View>
      {/* ------------------------------------------------------------ Hero */}
      <MotiView
        from={{ opacity: 0, translateY: 14 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: Motion.slow }}>
        <LinearGradient
          colors={Gradients.activity}
          start={Gradients.diagonal.start}
          end={Gradients.diagonal.end}
          style={styles.hero}>
          <View style={styles.heroMain}>
            <View style={styles.heroWeekRow}>
              <Text style={styles.heroWeek}>{week}w</Text>
              <Text style={styles.heroDay}>{day}d</Text>
            </View>
            <Text style={styles.heroTrimester}>{trimesterLabel}</Text>
            <Text style={styles.heroToGo}>
              {weeksToGo === 0 ? 'Due any day now' : `${weeksToGo} weeks to go!`}
            </Text>

            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>

            <Text style={styles.heroSize}>
              Your baby is about the size of a {babySize.name.toLowerCase()}
            </Text>

            <AnimatedPressable
              onPress={() => router.push('/pregnancy/baby-growth')}
              style={styles.heroButton}>
              <Text style={styles.heroButtonText}>View baby growth</Text>
              <ChevronRight size={15} color={Colors.onPrimary} strokeWidth={2.4} />
            </AnimatedPressable>
          </View>

          <View style={styles.heroAside}>
            <View style={styles.babyCircle}>
              <Text style={styles.babyEmoji}>{babySize.emoji}</Text>
            </View>
          </View>
        </LinearGradient>
      </MotiView>

      <AnimatedPressable
        onPress={() => router.push('/pregnancy/manage')}
        style={styles.dueRow}>
        <CalendarDays size={14} color={Colors.textSecondary} />
        <Text style={styles.dueText}>Due {formatLongDate(dueDate)}</Text>
        <View style={styles.manageChip}>
          <Settings2 size={12} color={Colors.accent} strokeWidth={2.2} />
          <Text style={styles.manageText}>Manage</Text>
        </View>
      </AnimatedPressable>

      {/* ---------------------------------------------------- Feature grid */}
      <SectionHeader title="Your pregnancy" />
      <View style={styles.grid}>
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          const value = tileValues[feature.key];

          return (
            <MotiView
              key={feature.key}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: 'timing',
                duration: Motion.fast,
                delay: Motion.enterDelay + index * Motion.stagger,
              }}
              style={styles.gridCell}>
              <AnimatedPressable
                onPress={() => router.push(feature.route)}
                style={styles.tile}>
                <View style={styles.tileTop}>
                  <View
                    style={[
                      styles.tileIcon,
                      { backgroundColor: feature.accent.tint },
                    ]}>
                    <Icon
                      size={20}
                      color={feature.accent.main}
                      strokeWidth={2.1}
                    />
                  </View>
                  <ChevronRight size={15} color={Colors.textMuted} />
                </View>

                <Text style={styles.tileLabel} numberOfLines={2}>
                  {feature.label}
                </Text>

                {/* The accent carries the value, which is the theme's rule —
                    icon tile and highlighted figure share one colour. */}
                <Text
                  style={[styles.tileValue, { color: feature.accent.dark }]}
                  numberOfLines={1}>
                  {value ?? '—'}
                </Text>
              </AnimatedPressable>
            </MotiView>
          );
        })}
      </View>

      {/* ------------------------------------------------------ Log today */}
      <SectionHeader title="Log today" />
      <LogRow
        kinds={PREGNANCY_LOGS}
        logged={loggedKinds(today)}
        onPick={onPickLog}
      />

      {/* ------------------------------------------------------ Daily tip */}
      <View style={styles.tipCard}>
        <View style={styles.tipIcon}>
          <Quote size={14} color={Accents.violet.main} strokeWidth={2.4} />
        </View>
        <View style={styles.tipText}>
          <Text style={styles.tipTitle}>Daily tip</Text>
          <Text style={styles.tipBody}>{tip}</Text>
        </View>
      </View>

      {record.logs.length === 0 && (
        <Text style={styles.footnote}>
          Log a weight today and again next week to start your gain chart.
        </Text>
      )}

      <Disclaimer text="This tracks your logged data only and isn't medical advice. Please follow your doctor's guidance for all pregnancy care decisions." />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    gap: Spacing.md,
    borderRadius: Radius.card,
    padding: Spacing.xl,
    ...Shadow.glow,
  },
  heroMain: { flex: 1.7 },
  heroWeekRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  heroWeek: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    color: Colors.onPrimary,
  },
  heroDay: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    color: Colors.onPrimaryMuted,
  },
  heroTrimester: {
    ...Typography.caption,
    color: Colors.onPrimary,
    marginTop: Spacing.xs,
  },
  heroToGo: { ...Typography.label, color: Colors.onPrimaryMuted, marginTop: 2 },
  progressTrack: {
    height: 5,
    borderRadius: Radius.round,
    backgroundColor: Colors.onPrimaryFaint,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.round,
    backgroundColor: Colors.onPrimary,
  },
  heroSize: {
    ...Typography.label,
    color: Colors.onPrimaryMuted,
    marginTop: Spacing.md,
    lineHeight: 17,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.onPrimaryFaint,
    borderRadius: Radius.round,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  heroButtonText: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.onPrimary,
  },
  heroAside: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  babyCircle: {
    width: 92,
    height: 92,
    borderRadius: Radius.round,
    backgroundColor: Colors.onPrimaryFaint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  babyEmoji: { fontSize: 44, lineHeight: 54 },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  // Takes the slack so the Manage chip is pushed to the right edge.
  dueText: { ...Typography.label, color: Colors.textSecondary, flex: 1 },
  manageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.round,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
  },
  manageText: {
    ...Typography.label,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  // Two across, at a basis under half so both cells plus the gap always fit the
  // row. `flexGrow` spreads the remainder, so the pair fills edge to edge at any
  // width. Cells in a wrapped row stretch by default, which is what keeps the
  // two cards in each row the same height without a hard-coded minimum.
  gridCell: { flexBasis: '46%', flexGrow: 1 },
  tile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.tile,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileLabel: {
    ...Typography.optionLabel,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textPrimary,
  },
  tileValue: {
    ...Typography.label,
    fontWeight: '700',
    marginTop: 3,
  },
  tipCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Accents.violet.tint,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginTop: Spacing.xxl,
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: { flex: 1 },
  tipTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Accents.violet.dark,
  },
  tipBody: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 17,
  },
  footnote: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: Spacing.lg,
  },
  setupCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadow.card,
  },
  setupTile: {
    width: 64,
    height: 64,
    borderRadius: Radius.round,
    backgroundColor: Accents.pink.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  setupTitle: { ...Typography.cardTitle, color: Colors.textPrimary },
  setupBody: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Accents.pink.main,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.xl,
  },
  setupButtonText: { ...Typography.button, color: Colors.textInverse },
  deliveredCard: {
    borderRadius: Radius.card,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadow.glow,
  },
  deliveredEmoji: { fontSize: 44, lineHeight: 54 },
  deliveredTitle: {
    ...Typography.cardTitle,
    color: Colors.onPrimary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  deliveredBody: {
    ...Typography.caption,
    color: Colors.onPrimaryMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 19,
  },
  deliveredAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
  },
  deliveredActionText: {
    ...Typography.button,
    fontSize: 15,
    color: Colors.accent,
  },
});
