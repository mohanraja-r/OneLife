import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  Bell,
  Check,
  Droplet,
  Fish,
  Leaf,
  Pill,
  Plus,
  Shield,
  Sun,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AddMedicineSheet from '../../components/AddMedicineSheet';
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
  accentShadow,
} from '../../constants/theme';
import {
  AdherenceSummary,
  ScheduledDose,
  getAdherenceSummary,
  getTodaysDoses,
  nextPendingDose,
  setDoseStatus,
} from '../../services/medicine';
import { supabase } from '../../services/supabase';

/** Name fragments that earn a medicine its own icon and accent in the list. */
const GLYPHS: { match: string[]; icon: LucideIcon; accent: Accent }[] = [
  { match: ['vitamin d', 'vitamin-d', 'd3'], icon: Sun, accent: Accents.amber },
  { match: ['omega', 'fish oil'], icon: Fish, accent: Accents.blue },
  { match: ['probiotic', 'herbal'], icon: Leaf, accent: Accents.green },
  { match: ['multivitamin', 'multi'], icon: Shield, accent: Accents.violet },
  { match: ['iron', 'folic', 'b12'], icon: Droplet, accent: Accents.rose },
];

/** A rotation for medicines that match no keyword, so rows stay distinguishable. */
const FALLBACK_ACCENTS: Accent[] = [
  Accents.violet,
  Accents.blue,
  Accents.green,
  Accents.orange,
  Accents.pink,
];

/** Picks the icon and accent a medicine is drawn with, from its name. */
function glyphFor(
  name: string,
  index: number
): { icon: LucideIcon; accent: Accent } {
  const lower = name.toLowerCase();
  const hit = GLYPHS.find((glyph) =>
    glyph.match.some((term) => lower.includes(term))
  );
  if (hit) return { icon: hit.icon, accent: hit.accent };

  return {
    icon: Pill,
    accent: FALLBACK_ACCENTS[index % FALLBACK_ACCENTS.length],
  };
}

export default function MedicineScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('there');
  const [doses, setDoses] = useState<ScheduledDose[]>([]);
  const [summary, setSummary] = useState<AdherenceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  /** Loads today's doses and the weekly adherence numbers together. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const [todaysDoses, adherence] = await Promise.all([
        getTodaysDoses(),
        getAdherenceSummary(),
      ]);
      setDoses(todaysDoses);
      setSummary(adherence);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load your medicines.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /** Reads the signed-in user's first name for the greeting. */
  const loadName = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .maybeSingle();

    const name = data?.name ?? user.email?.split('@')[0];
    if (name) setUserName(name.split(' ')[0]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      loadName();
    }, [load, loadName])
  );

  /** Marks a dose taken (or back to pending) and refreshes the screen. */
  const toggleDose = async (dose: ScheduledDose) => {
    try {
      await setDoseStatus(dose, dose.status === 'taken' ? 'pending' : 'taken');
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not update that dose.'
      );
    }
  };

  const nextDose = nextPendingDose(doses);
  const trend = summary?.weeklyTrend ?? [];
  // Bars are drawn relative to the busiest day, so a quiet week still reads.
  const trendMax = Math.max(1, ...trend);
  const stats = [
    { label: 'On Track', value: `${summary?.onTrackPercent ?? 0}%` },
    { label: 'Medicines', value: `${summary?.medicineCount ?? 0}` },
    { label: 'This Week', value: `${summary?.takenThisWeek ?? 0}` },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: Motion.slow }}
          style={styles.header}>
          <View style={styles.greeting}>
            <LinearGradient
              colors={Gradients.avatar}
              start={Gradients.diagonal.start}
              end={Gradients.diagonal.end}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.greetingSubtext}>Good morning,</Text>
              <Text style={styles.greetingName}>{userName}! 👋</Text>
            </View>
          </View>
          <View style={styles.bellButton}>
            <Bell size={18} color={Colors.textSecondary} />
            {!!nextDose && <View style={styles.bellDot} />}
          </View>
        </MotiView>

        <Text style={styles.sectionTitle}>Today's Overview</Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <>
            {!!error && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={load} accessibilityRole="button">
                  <Text style={styles.errorRetry}>Try again</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Next-dose hero. The dial is the ring track plus the pill glyph —
                a true progress arc needs react-native-svg, which is not a
                dependency yet. */}
            {nextDose ? (
              <MotiView
                from={{ opacity: 0, translateY: 16 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: 'timing',
                  duration: Motion.slow,
                  delay: 60,
                }}
                style={styles.heroCard}>
                <LinearGradient
                  colors={Gradients.primary}
                  start={Gradients.diagonal.start}
                  end={Gradients.diagonal.end}
                  style={styles.heroGradient}>
                  <View style={styles.heroText}>
                    <Text style={styles.heroLabel}>Next Medicine</Text>
                    <Text style={styles.heroTime}>{nextDose.label}</Text>
                    <Text style={styles.heroName} numberOfLines={1}>
                      {nextDose.name}
                    </Text>
                    <AnimatedPressable
                      onPress={() => toggleDose(nextDose)}
                      style={styles.takeNowButton}>
                      <Text style={styles.takeNowText}>Take Now</Text>
                      <Check
                        size={16}
                        color={Colors.primary}
                        strokeWidth={2.6}
                      />
                    </AnimatedPressable>
                  </View>
                  <View style={styles.heroRing}>
                    <Pill
                      size={30}
                      color={Colors.onPrimary}
                      strokeWidth={1.8}
                    />
                  </View>
                </LinearGradient>
              </MotiView>
            ) : (
              <MotiView
                from={{ opacity: 0, translateY: 16 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: 'timing',
                  duration: Motion.slow,
                  delay: 60,
                }}
                style={styles.allDoneCard}>
                <View style={styles.allDoneTile}>
                  <Check size={22} color={Colors.success} strokeWidth={2.6} />
                </View>
                <View style={styles.allDoneText}>
                  <Text style={styles.allDoneTitle}>
                    {doses.length
                      ? "You're all caught up"
                      : 'Nothing due today'}
                  </Text>
                  <Text style={styles.allDoneSubtitle}>
                    {doses.length
                      ? 'Every dose scheduled for today is logged.'
                      : 'Add a medicine to start tracking your doses.'}
                  </Text>
                </View>
              </MotiView>
            )}

            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <MotiView
                  key={stat.label}
                  from={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: 'timing',
                    duration: Motion.base,
                    delay: 120 + index * Motion.stagger,
                  }}
                  style={styles.statCard}>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  {index === 0 && (
                    // Doses taken per day over the last week, drawn as bars
                    // because there is no SVG dependency for a real sparkline.
                    <View style={styles.sparkline}>
                      {trend.map((count, day) => (
                        <View
                          key={day}
                          style={[
                            styles.sparkBar,
                            { height: Math.max(3, (count / trendMax) * 14) },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                  {index === 1 && (
                    <Pill
                      size={16}
                      color={Colors.primary}
                      strokeWidth={2}
                      style={styles.statGlyph}
                    />
                  )}
                  {index === 2 && (
                    <View style={styles.statTakenRow}>
                      <Text style={styles.statTakenText}>Taken</Text>
                      <Check size={12} color={Colors.success} strokeWidth={3} />
                    </View>
                  )}
                </MotiView>
              ))}
            </View>

            <View style={styles.scheduleHeader}>
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
              <AnimatedPressable onPress={() => router.push('/medicines')}>
                <Text style={styles.viewAllLink}>View all</Text>
              </AnimatedPressable>
            </View>

            {doses.length > 0 ? (
              doses.map((dose, index) => {
                const { icon: Icon, accent } = glyphFor(dose.name, index);
                const isTaken = dose.status === 'taken';
                const isNext = nextDose?.id === dose.id;

                return (
                  <MotiView
                    key={dose.id}
                    from={{ opacity: 0, translateX: -12 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{
                      type: 'timing',
                      duration: Motion.fast,
                      delay: 160 + index * Motion.stagger,
                    }}>
                    <AnimatedPressable
                      onPress={() => toggleDose(dose)}
                      style={[styles.doseRow, isNext && styles.doseRowNext]}>
                      <Text style={styles.doseTime}>{dose.label}</Text>
                      <View
                        style={[
                          styles.doseTile,
                          { backgroundColor: accent.tint },
                        ]}>
                        <Icon size={18} color={accent.main} strokeWidth={2} />
                      </View>
                      <View style={styles.doseText}>
                        <Text style={styles.doseName} numberOfLines={1}>
                          {dose.name}
                        </Text>
                        <Text style={styles.doseDosage} numberOfLines={1}>
                          {dose.dosage}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.doseCheck,
                          isTaken && styles.doseCheckDone,
                        ]}>
                        {isTaken && (
                          <Check
                            size={13}
                            color={Colors.textInverse}
                            strokeWidth={3}
                          />
                        )}
                      </View>
                    </AnimatedPressable>
                  </MotiView>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyTile}>
                  <Pill size={26} color={Colors.primary} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyTitle}>No medicines yet</Text>
                <Text style={styles.emptySubtitle}>
                  Scan a prescription or add one by hand — we'll remind you when
                  each dose is due.
                </Text>
              </View>
            )}
          </>
        )}

        <AnimatedPressable
          onPress={() => setSheetOpen(true)}
          style={styles.addButton}>
          <LinearGradient
            colors={Gradients.primary}
            start={Gradients.horizontal.start}
            end={Gradients.horizontal.end}
            style={styles.addButtonFill}>
            <Plus size={20} color={Colors.textInverse} strokeWidth={2.4} />
            <Text style={styles.addButtonText}>Add Medicine</Text>
          </LinearGradient>
        </AnimatedPressable>

        <View style={{ height: Spacing.navClearance }} />
      </ScrollView>

      <AddMedicineSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onScan={() => router.push('/scan-prescription')}
        onManual={() => router.push('/add-medicine')}
      />

      <FloatingNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
  },
  greetingSubtext: {
    ...Typography.secondary,
    color: Colors.textSecondary,
  },
  greetingName: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionTitle: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  loading: {
    paddingVertical: Spacing.max,
    alignItems: 'center',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    backgroundColor: Colors.errorTint,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    flex: 1,
  },
  errorRetry: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '700',
  },
  heroCard: {
    marginBottom: Spacing.xl,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.glow,
  },
  heroGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  heroText: {
    flex: 1,
  },
  heroLabel: {
    ...Typography.label,
    color: Colors.onPrimaryMuted,
    marginBottom: Spacing.xs,
  },
  heroTime: {
    ...Typography.largeHero,
    color: Colors.onPrimary,
  },
  heroName: {
    ...Typography.secondary,
    color: Colors.onPrimaryMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  takeNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: Colors.onPrimary,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
  },
  takeNowText: {
    ...Typography.optionLabel,
    color: Colors.primary,
  },
  heroRing: {
    width: 84,
    height: 84,
    borderRadius: Radius.round,
    borderWidth: 6,
    borderColor: Colors.onPrimaryFaint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allDoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadow.card,
  },
  allDoneTile: {
    width: 48,
    height: 48,
    borderRadius: Radius.tile,
    backgroundColor: Colors.successTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allDoneText: {
    flex: 1,
  },
  allDoneTitle: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
  },
  allDoneSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    ...Shadow.card,
  },
  statLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  statValue: {
    ...Typography.largeNumber,
    fontSize: 26,
    lineHeight: 32,
    color: Colors.textPrimary,
    marginVertical: Spacing.xs,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 14,
  },
  sparkBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.success,
  },
  statGlyph: {
    marginTop: 1,
  },
  statTakenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statTakenText: {
    ...Typography.label,
    color: Colors.success,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllLink: {
    ...Typography.secondary,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  doseRow: {
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
  doseRowNext: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primary,
  },
  doseTime: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.primary,
    width: 62,
  },
  doseTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.tile,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doseText: {
    flex: 1,
  },
  doseName: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  doseDosage: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  doseCheck: {
    width: 26,
    height: 26,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doseCheckDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    ...Shadow.card,
  },
  emptyTile: {
    width: 56,
    height: 56,
    borderRadius: Radius.tile,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
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
  addButton: {
    marginTop: Spacing.xl,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...accentShadow(Accents.violet.main),
  },
  addButtonFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg + 2,
  },
  addButtonText: {
    ...Typography.button,
    color: Colors.textInverse,
  },
});
