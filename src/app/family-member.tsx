import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Bell,
  Check,
  Pill,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { type JSX, useCallback, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader';
import {
  adherenceAccent,
  MemberInitials,
  memberSubtitle,
} from '../components/family/shared';
import PrimaryButton from '../components/PrimaryButton';
import { EmptyState, ErrorNotice, LoadingState } from '../components/ui';
import {
  Accents,
  Colors,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { errorMessage } from '../services/errors';
import type { FamilyMember } from '../services/family';
import {
  getFamilyMember,
  memberScope,
  removeFamilyMember,
  setMissedDoseAlerts,
} from '../services/family';
import type { AdherenceSummary, ScheduledDose } from '../services/medicine';
import { getMemberAdherence, getTodaysDosesForMember } from '../services/medicine';
import { getProfileSummary } from '../services/profile';

/**
 * One family member's medicine picture.
 *
 * The first mock had Overview / Health / Medicine / Goals tabs, but three of
 * those four have no table behind them. This is the one that does — and it is
 * the reason anyone opens the screen.
 */
export default function FamilyMemberScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [member, setMember] = useState<FamilyMember | null>(null);
  const [adherence, setAdherence] = useState<AdherenceSummary | null>(null);
  const [doses, setDoses] = useState<ScheduledDose[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [alerting, setAlerting] = useState(false);

  /** Loads the member together with today's doses and their week so far. */
  const load = useCallback(async () => {
    if (!id) {
      setError('This family member could not be found.');
      return;
    }

    setError(null);
    try {
      const [found, profile] = await Promise.all([
        getFamilyMember(id),
        getProfileSummary(),
      ]);

      if (!found) {
        setError('This family member could not be found.');
        return;
      }
      if (!profile) {
        setError('You need to be signed in to view your family.');
        return;
      }

      const scope = memberScope(found, profile.id);
      const [nextAdherence, nextDoses] = await Promise.all([
        getMemberAdherence(scope),
        getTodaysDosesForMember(scope),
      ]);

      setMember(found);
      setAdherence(nextAdherence);
      setDoses(nextDoses);
    } catch (err) {
      setError(errorMessage(err, 'Could not load this family member.'));
    }
  }, [id]);

  // On focus rather than on mount: adding a medicine happens on another screen,
  // and coming back from it has to show the medicine that was just added.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  /** Turns missed-dose notifications on or off for this member. */
  const toggleAlerts = async (enabled: boolean) => {
    if (!member) return;

    // Optimistic: the switch has to move under the thumb, not after a round trip.
    setMember({ ...member, alertOnMissed: enabled });
    setAlerting(true);
    try {
      await setMissedDoseAlerts(member.id, enabled);
    } catch (err) {
      setMember({ ...member, alertOnMissed: !enabled });
      Alert.alert(
        'Could not save',
        errorMessage(err, 'Something went wrong')
      );
    } finally {
      setAlerting(false);
    }
  };

  /** Removes the member after confirming what goes with them. */
  const confirmRemove = () => {
    if (!member) return;

    const managed = member.connectionType === 'managed';
    Alert.alert(
      `Remove ${member.name}?`,
      managed
        ? 'Their medicines and dose history will be deleted. This cannot be undone.'
        : "You'll stop seeing their medicines. Their own account is not affected.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removeFamilyMember(member.id)
              .then(() => router.back())
              .catch((err: unknown) =>
                Alert.alert(
                  'Could not remove',
                  errorMessage(err, 'Something went wrong')
                )
              );
          },
        },
      ]
    );
  };

  /** Opens the medicine form with this member pre-selected as its owner. */
  const openAddMedicine = (memberId: string) =>
    router.push({ pathname: '/add-medicine', params: { memberId } });

  const managed = member?.connectionType === 'managed';
  // Distinguishes "nothing saved" from "saved, but nothing due today" — a
  // course that has ended still counts as a medicine.
  const hasMedicines = (adherence?.medicineCount ?? 0) > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title={member?.name ?? 'Family member'}
        action={
          member ? (
            <TouchableOpacity
              onPress={confirmRemove}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${member.name}`}>
              <Trash2 size={21} color={Colors.danger} strokeWidth={1.9} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {!member ? (
        <View style={styles.loading}>
          <ErrorNotice message={error} onRetry={() => void load()} />
          {!error && <LoadingState fill />}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <ErrorNotice message={error} onRetry={() => void load()} />

          <View style={styles.hero}>
            {member.avatarUrl ? (
              <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
            ) : (
              <MemberInitials name={member.name} size={72} />
            )}
            <Text style={styles.name}>{member.name}</Text>
            <Text style={styles.subtitle}>{memberSubtitle(member)}</Text>
          </View>

          {!!adherence && (
            <View style={styles.metrics}>
              <Metric
                value={`${adherence.onTrackPercent}%`}
                label="7-day"
                color={adherenceAccent(adherence.onTrackPercent).dark}
              />
              <Metric value={`${adherence.takenThisWeek}`} label="Taken" />
              <Metric
                value={`${adherence.missedThisWeek}`}
                label="Missed"
                color={
                  adherence.missedThisWeek > 0 ? Colors.danger : undefined
                }
              />
              <Metric value={`${adherence.medicineCount}`} label="Medicines" />
            </View>
          )}

          <View style={styles.section}>
            {/* The add action lives in the header, not inside the empty state:
                a managed member needs a second medicine as easily as a first. */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Today&apos;s doses</Text>
              {managed && (
                <TouchableOpacity
                  style={styles.addMedicine}
                  onPress={() => openAddMedicine(member.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Add a medicine for ${member.name}`}>
                  <Plus size={16} color={Colors.primary} strokeWidth={2.6} />
                  <Text style={styles.addMedicineText}>Add medicine</Text>
                </TouchableOpacity>
              )}
            </View>

            {doses.length === 0 ? (
              <EmptyState
                icon={Pill}
                title={
                  hasMedicines ? 'Nothing due today' : 'No medicines yet'
                }
                subtitle={
                  hasMedicines
                    ? `${member.name} has medicines saved, but none are scheduled for today.`
                    : managed
                      ? `Add the medicines ${member.name} takes and they'll show up here each day.`
                      : `${member.name} has not added any medicines yet.`
                }>
                {managed && !hasMedicines && (
                  <View style={styles.emptyAction}>
                    <PrimaryButton
                      label="Add a medicine"
                      icon={Plus}
                      hideArrow
                      onPress={() => openAddMedicine(member.id)}
                    />
                  </View>
                )}
              </EmptyState>
            ) : (
              <View style={styles.card}>
                {doses.map((dose, index) => (
                  <View key={dose.id}>
                    <View style={styles.dose}>
                      <View style={styles.doseTile}>
                        <Pill
                          size={18}
                          color={Colors.medication}
                          strokeWidth={2}
                        />
                      </View>
                      <View style={styles.doseBody}>
                        <Text style={styles.doseName} numberOfLines={1}>
                          {dose.name}
                        </Text>
                        <Text style={styles.doseMeta} numberOfLines={1}>
                          {dose.dosage}
                          {dose.foodRelation !== 'any'
                            ? ` · ${dose.foodRelation} food`
                            : ''}
                        </Text>
                      </View>
                      <Text style={styles.doseTime}>{dose.label}</Text>
                      <DoseStatusPill status={dose.status} />
                    </View>
                    {index < doses.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.doseTile}>
                <Bell size={18} color={Colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.doseBody}>
                <Text style={styles.doseName}>Tell me about missed doses</Text>
                <Text style={styles.doseMeta}>
                  A notification 30 minutes after a missed dose
                </Text>
              </View>
              <Switch
                value={member.alertOnMissed}
                onValueChange={(next) => void toggleAlerts(next)}
                disabled={alerting}
                trackColor={{
                  false: Colors.surfaceSunken,
                  true: Colors.primary,
                }}
                thumbColor={Colors.surface}
                accessibilityLabel="Tell me about missed doses"
              />
            </View>
          </View>

          <Text style={styles.footnote}>
            {managed
              ? `Reminders for ${member.name} come to your phone. Sending them to their own phone by SMS or call is not available yet.`
              : `${member.name} shares this with you from their own account, so only they can mark a dose as taken.`}
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** One figure in the stat row above the dose list. */
function Metric({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, !!color && { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

/** The taken / missed / due badge trailing a dose row. */
function DoseStatusPill({ status }: { status: ScheduledDose['status'] }) {
  if (status === 'taken') {
    return (
      <View style={[styles.statusPill, { backgroundColor: Accents.green.tint }]}>
        <Check size={11} color={Accents.green.dark} strokeWidth={3} />
        <Text style={[styles.statusText, { color: Accents.green.dark }]}>
          Taken
        </Text>
      </View>
    );
  }

  if (status === 'missed') {
    return (
      <View style={[styles.statusPill, { backgroundColor: Colors.errorTint }]}>
        <Text style={[styles.statusText, { color: Colors.error }]}>Missed</Text>
      </View>
    );
  }

  return (
    <View style={[styles.statusPill, { backgroundColor: Colors.surfaceSunken }]}>
      <Text style={[styles.statusText, { color: Colors.textSecondary }]}>
        Due
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, paddingHorizontal: Spacing.screen },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },

  hero: { alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 72, height: 72, borderRadius: Radius.round },
  name: { ...Typography.heading, color: Colors.textPrimary },
  subtitle: { ...Typography.caption, color: Colors.textSecondary },

  metrics: { flexDirection: 'row', gap: Spacing.sm },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs + 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    ...Shadow.card,
  },
  metricValue: {
    ...Typography.metricValue,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: { ...Typography.label, color: Colors.textSecondary },

  section: { gap: Spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    ...Shadow.card,
  },

  dose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  doseTile: {
    width: 36,
    height: 36,
    borderRadius: Radius.tile,
    backgroundColor: Colors.medicationTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doseBody: { flex: 1, minWidth: 0 },
  doseName: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  doseMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  doseTime: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm + 1,
    borderRadius: Radius.round,
  },
  statusText: { ...Typography.label, fontWeight: '700' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg + 36 + Spacing.md,
  },

  emptyAction: { alignSelf: 'stretch', marginTop: Spacing.xl },
  addMedicine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 1,
    paddingVertical: Spacing.xs,
  },
  addMedicineText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
  footnote: {
    ...Typography.caption,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.xs,
  },
});
