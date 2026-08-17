import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  HeartPulse,
  Phone,
  Pill,
  Plus,
  ScanLine,
  Users,
} from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader';
import { MemberInitials, memberSubtitle } from '../components/family/shared';
import {
  BottomSheet,
  ChipRow,
  EmptyState,
  ErrorNotice,
  LoadingState,
  sheetStyles,
} from '../components/ui';
import type { ChipOption } from '../components/ui';
import {
  Accents,
  Colors,
  Gradients,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { errorMessage } from '../services/errors';
import type { FamilyMember } from '../services/family';
import { getFamilyMember, getFamilyMembers, memberScope } from '../services/family';
import type {
  Allergy,
  BloodType,
  MedicalRecord,
  MedicalScope,
} from '../services/medical';
import {
  BLOOD_TYPES,
  allergySummary,
  conditionSummary,
  getMedicalRecord,
  procedureSummary,
  relativeTime,
  saveBloodType,
  titleCase,
} from '../services/medical';
import { getProfileSummary } from '../services/profile';

/**
 * Medical Info — the emergency-facing half of a profile.
 *
 * One screen, two jobs, told apart by the `memberId` param:
 *
 *   no param   your own record, with a Shared tab listing the people whose
 *              records you can see.
 *   memberId   one family member's record, opened from that tab.
 *
 * Whether the sections are editable is not a display choice: a managed member's
 * rows are owned by you, so you can write them; an invited member owns their
 * own, and RLS refuses your writes. The screen shows what the database allows
 * rather than offering actions that would fail.
 */

/** Which half of the top segmented control is showing. */
type Tab = 'mine' | 'shared';

/** Blood group chips, plus the "not recorded" answer that clears the field. */
const BLOOD_OPTIONS: readonly ChipOption<string>[] = [
  ...BLOOD_TYPES.map((type) => ({ label: type, value: type })),
  { label: 'Not sure', value: '' },
];

/** Severity drives the tint an allergy row is called out in. */
const SEVERITY_TONE: Record<Allergy['severity'], { bg: string; fg: string }> = {
  severe: { bg: Colors.errorTint, fg: Colors.error },
  moderate: { bg: Accents.amber.tint, fg: Accents.amber.dark },
  mild: { bg: Colors.surfaceSunken, fg: Colors.textSecondary },
};

export default function MedicalInformationScreen() {
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();

  const [tab, setTab] = useState<Tab>('mine');
  const [scope, setScope] = useState<MedicalScope | null>(null);
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [shared, setShared] = useState<FamilyMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bloodSheetOpen, setBloodSheetOpen] = useState(false);

  const scroller = useRef<ScrollView>(null);
  // Where the allergies section starts, so "View all" can jump to it.
  const allergiesY = useRef(0);

  /** Loads the record this screen shows, and who else has shared theirs. */
  const load = useCallback(async () => {
    setError(null);
    try {
      const profile = await getProfileSummary();
      if (!profile) {
        setError('You need to be signed in to see your medical info.');
        return;
      }

      if (memberId) {
        const found = await getFamilyMember(memberId);
        if (!found) {
          setError('This family member could not be found.');
          return;
        }
        const memberRecordScope = memberScope(found, profile.id);
        setMember(found);
        setScope(memberRecordScope);
        setRecord(await getMedicalRecord(memberRecordScope));
        return;
      }

      const ownScope: MedicalScope = { ownerId: profile.id, memberId: null };
      const [ownRecord, members] = await Promise.all([
        getMedicalRecord(ownScope),
        getFamilyMembers(),
      ]);
      setScope(ownScope);
      setRecord(ownRecord);
      setShared(members);
    } catch (err) {
      setError(errorMessage(err, 'Could not load medical information.'));
    }
  }, [memberId]);

  // On focus rather than on mount: every add and edit happens on another
  // screen, and coming back has to show what was just saved.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  /** True when the rows on show belong to an account this user can write to. */
  const editable = !memberId || member?.connectionType === 'managed';

  /** Opens a form for one kind of record, pre-scoped to whose record it is. */
  const openForm = (pathname: '/add-allergy' | '/medical-entry', params: Record<string, string>) =>
    router.push({
      pathname,
      params: { ...params, ...(memberId ? { memberId } : {}) },
    });

  /** Saves the blood type picked in the sheet, or clears it. */
  const chooseBloodType = (value: string) => {
    if (!scope || !record) return;

    const next = (value || null) as BloodType | null;
    setBloodSheetOpen(false);
    setRecord({ ...record, bloodType: next });

    void saveBloodType(scope, next).catch((err: unknown) => {
      setRecord(record);
      Alert.alert('Could not save', errorMessage(err, 'Something went wrong'));
    });
  };

  /** Dials a number from a contact or provider card. */
  const call = (phone: string) => {
    void Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() => {
      Alert.alert('Could not place the call', phone);
    });
  };

  const lastUpdated = relativeTime(record?.updatedAt ?? null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {memberId ? (
        <MemberHero
          member={member}
          editable={editable}
          lastUpdated={lastUpdated}
        />
      ) : (
        <AppHeader title="Medical Info" />
      )}

      {!record ? (
        <View style={styles.loading}>
          <ErrorNotice message={error} onRetry={() => void load()} />
          {!error && <LoadingState fill />}
        </View>
      ) : (
        <ScrollView
          ref={scroller}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <ErrorNotice message={error} onRetry={() => void load()} />

          {/* The tabs only exist on your own record — a member's record has no
              second thing to show. */}
          {!memberId && (
            <View style={styles.segmented}>
              {(['mine', 'shared'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.segment, tab === option && styles.segmentActive]}
                  onPress={() => setTab(option)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === option }}>
                  <Text
                    style={[
                      styles.segmentLabel,
                      tab === option && styles.segmentLabelActive,
                    ]}>
                    {option === 'mine' ? 'Your data' : 'Shared'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {tab === 'shared' && !memberId ? (
            <SharedList members={shared} />
          ) : (
            <>
              <Section label="At a glance">
                <View style={styles.glanceRow}>
                  <View style={styles.glanceTile}>
                    <Text style={styles.glanceLabel}>BLOOD TYPE</Text>
                    <Text style={styles.glanceValue}>
                      {record.bloodType ?? '—'}
                    </Text>
                    {editable && (
                      <TouchableOpacity
                        onPress={() => setBloodSheetOpen(true)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Change blood type">
                        <Text style={styles.glanceAction}>Change</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.glanceTile}>
                    <Text style={styles.glanceLabel}>ALLERGIES</Text>
                    <Text style={styles.glanceCount}>
                      {record.allergies.length}
                    </Text>
                    {record.allergies.length > 0 && (
                      <TouchableOpacity
                        onPress={() =>
                          scroller.current?.scrollTo({
                            y: allergiesY.current,
                            animated: true,
                          })
                        }
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="View all allergies">
                        <Text style={styles.glanceAction}>View all</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Section>

              <Section
                label="Allergies"
                onLayout={(y) => (allergiesY.current = y)}>
                {record.allergies.length === 0 ? (
                  <Blank text="Nothing recorded. Allergies are the first thing a doctor asks about." />
                ) : (
                  record.allergies.map((allergy) => (
                    <RecordCard
                      key={allergy.id}
                      kind={allergy.allergyType}
                      title={allergy.name}
                      subtitle={allergySummary(allergy)}
                      subtitleColor={SEVERITY_TONE[allergy.severity].fg}
                      badge={titleCase(allergy.severity)}
                      badgeTone={SEVERITY_TONE[allergy.severity]}
                      onPress={
                        editable
                          ? () => openForm('/add-allergy', { id: allergy.id })
                          : undefined
                      }
                    />
                  ))
                )}
                {editable && (
                  <AddButton
                    label="Add allergy"
                    onPress={() => openForm('/add-allergy', {})}
                  />
                )}
              </Section>

              <Section label="Chronic conditions">
                {record.conditions.length === 0 ? (
                  <Blank text="No long-term conditions recorded." />
                ) : (
                  record.conditions.map((condition) => (
                    <RecordCard
                      key={condition.id}
                      kind="condition"
                      title={condition.name}
                      subtitle={conditionSummary(condition)}
                      onPress={
                        editable
                          ? () =>
                              openForm('/medical-entry', {
                                kind: 'condition',
                                id: condition.id,
                              })
                          : undefined
                      }
                    />
                  ))
                )}
                {editable && (
                  <AddButton
                    label="Add condition"
                    onPress={() =>
                      openForm('/medical-entry', { kind: 'condition' })
                    }
                  />
                )}
              </Section>

              <Section label="Current medications">
                {record.medicines.length === 0 ? (
                  <Blank text="No active medicines." />
                ) : (
                  record.medicines.map((medicine) => (
                    <RecordCard
                      key={medicine.id}
                      kind="medicine"
                      title={`${medicine.name} ${medicine.dosage}`.trim()}
                      subtitle={medicine.frequency}
                      badge="Active"
                      badgeTone={{
                        bg: Colors.primaryTint,
                        fg: Colors.primaryDark,
                      }}
                      onPress={
                        editable
                          ? () =>
                              router.push({
                                pathname: '/add-medicine',
                                params: { medicineId: medicine.id },
                              })
                          : undefined
                      }
                    />
                  ))
                )}
                {/* Medicines have their own form and their own scanner — this
                    section links to them rather than reimplementing either. */}
                {editable && (
                  <View style={styles.actionRow}>
                    <AddButton
                      label="Add"
                      onPress={() =>
                        router.push({
                          pathname: '/add-medicine',
                          params: memberId ? { memberId } : {},
                        })
                      }
                    />
                    <AddButton
                      label="Scan"
                      icon={ScanLine}
                      onPress={() => router.push('/scan-prescription')}
                    />
                  </View>
                )}
              </Section>

              <Section label="Surgeries & procedures">
                {record.procedures.length === 0 ? (
                  <Blank text="No surgeries or procedures recorded." />
                ) : (
                  record.procedures.map((procedure) => (
                    <RecordCard
                      key={procedure.id}
                      kind="procedure"
                      title={procedure.name}
                      subtitle={procedureSummary(procedure)}
                      onPress={
                        editable
                          ? () =>
                              openForm('/medical-entry', {
                                kind: 'procedure',
                                id: procedure.id,
                              })
                          : undefined
                      }
                    />
                  ))
                )}
                {editable && (
                  <AddButton
                    label="Add"
                    onPress={() =>
                      openForm('/medical-entry', { kind: 'procedure' })
                    }
                  />
                )}
              </Section>

              <Section label="Emergency contact">
                {record.contacts.length === 0 ? (
                  <Blank text="Nobody to call yet. Add the person you would want reached first." />
                ) : (
                  record.contacts.map((contact) => (
                    <RecordCard
                      key={contact.id}
                      kind={contact.isPrimary ? 'primary emergency' : 'contact'}
                      title={contact.name}
                      subtitle={[contact.phone, contact.relationship]
                        .filter(Boolean)
                        .join('\n')}
                      urgent={contact.isPrimary}
                      onPress={
                        editable
                          ? () =>
                              openForm('/medical-entry', {
                                kind: 'contact',
                                id: contact.id,
                              })
                          : undefined
                      }
                      trailing={
                        <CallButton onPress={() => call(contact.phone)} />
                      }
                    />
                  ))
                )}
                {editable && (
                  <AddButton
                    label="Add contact"
                    onPress={() =>
                      openForm('/medical-entry', { kind: 'contact' })
                    }
                  />
                )}
              </Section>

              <Section label="Healthcare providers">
                {record.providers.length === 0 ? (
                  <Blank text="No doctors recorded." />
                ) : (
                  record.providers.map((provider) => (
                    <RecordCard
                      key={provider.id}
                      kind={provider.isPrimary ? 'primary doctor' : 'doctor'}
                      title={provider.name}
                      subtitle={[provider.facility, provider.specialty]
                        .filter(Boolean)
                        .join(' · ')}
                      onPress={
                        editable
                          ? () =>
                              openForm('/medical-entry', {
                                kind: 'provider',
                                id: provider.id,
                              })
                          : undefined
                      }
                      trailing={
                        provider.phone ? (
                          <CallButton
                            onPress={() => call(provider.phone ?? '')}
                          />
                        ) : undefined
                      }
                    />
                  ))
                )}
                {editable && (
                  <AddButton
                    label="Add provider"
                    onPress={() =>
                      openForm('/medical-entry', { kind: 'provider' })
                    }
                  />
                )}
              </Section>

              {!!memberId && member && (
                <Section label="Your access">
                  <View style={styles.accessCard}>
                    <Text style={styles.accessTitle}>Your role</Text>
                    <Text style={styles.accessRole}>
                      {member.relationship ?? 'Family'}
                    </Text>
                    <View style={styles.accessDivider} />
                    <Text style={styles.accessBody}>
                      {editable
                        ? `You manage ${member.name}'s record for them — everything on this screen is yours to add and edit.`
                        : `${member.name} shares this from their own account, so only they can change it.`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.linkRow}
                    onPress={() =>
                      router.push({
                        pathname: '/family-member',
                        params: { id: memberId },
                      })
                    }
                    accessibilityRole="button">
                    <Pill size={18} color={Colors.primary} strokeWidth={2} />
                    <Text style={styles.linkLabel}>
                      Today&apos;s medicines & adherence
                    </Text>
                    <ChevronRight size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </Section>
              )}

              <Text style={styles.footnote}>
                This is what an emergency contact or a doctor would be shown
                first. Keep allergies and blood type accurate above all.
              </Text>
            </>
          )}
        </ScrollView>
      )}

      <BottomSheet
        visible={bloodSheetOpen}
        onClose={() => setBloodSheetOpen(false)}>
        <Text style={sheetStyles.title}>Blood type</Text>
        <ChipRow
          options={BLOOD_OPTIONS}
          value={record?.bloodType ?? ''}
          onChange={chooseBloodType}
          wrap
          style={styles.bloodChips}
        />
        <TouchableOpacity
          style={sheetStyles.cancel}
          onPress={() => setBloodSheetOpen(false)}
          accessibilityRole="button">
          <Text style={sheetStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
}

/** The violet band above a family member's record, in place of the plain header. */
function MemberHero({
  member,
  editable,
  lastUpdated,
}: {
  member: FamilyMember | null;
  editable: boolean;
  lastUpdated: string | null;
}) {
  return (
    <LinearGradient
      colors={Gradients.primary}
      start={Gradients.diagonal.start}
      end={Gradients.diagonal.end}
      style={styles.hero}>
      <View style={styles.heroBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ArrowLeft size={24} color={Colors.onPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>
            {editable ? 'You can view & edit' : 'You can view'}
          </Text>
        </View>
      </View>

      <Text style={styles.heroTitle} numberOfLines={1}>
        {member ? `${member.name}'s health` : 'Medical info'}
      </Text>
      <Text style={styles.heroMeta}>
        {lastUpdated ? `Last updated ${lastUpdated}` : 'Nothing recorded yet'}
      </Text>
    </LinearGradient>
  );
}

/** The Shared tab: everyone whose medical record this user can open. */
function SharedList({ members }: { members: FamilyMember[] }) {
  if (members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nobody has shared yet"
        subtitle="People you care for show up here once they are in your family — you can then see the allergies and conditions that matter in an emergency."
      />
    );
  }

  return (
    <View style={styles.sharedList}>
      {members.map((member) => (
        <TouchableOpacity
          key={member.id}
          style={styles.sharedRow}
          onPress={() =>
            router.push({
              pathname: '/medical-information',
              params: { memberId: member.id },
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`Open ${member.name}'s medical info`}>
          <MemberInitials name={member.name} size={44} />
          <View style={styles.sharedBody}>
            <Text style={styles.sharedName} numberOfLines={1}>
              {member.name}
            </Text>
            <Text style={styles.sharedMeta} numberOfLines={1}>
              {memberSubtitle(member)}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** A titled block of record cards, with the section label the design uses. */
function Section({
  label,
  children,
  onLayout,
}: {
  label: string;
  children: React.ReactNode;
  /** Reports the section's y offset, for the "View all" jump. */
  onLayout?: (y: number) => void;
}) {
  return (
    <View
      style={styles.section}
      onLayout={(event) => onLayout?.(event.nativeEvent.layout.y)}>
      <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

/** One record: its kind, its name, and a line of detail underneath. */
function RecordCard({
  kind,
  title,
  subtitle,
  subtitleColor,
  badge,
  badgeTone,
  urgent = false,
  onPress,
  trailing,
}: {
  kind: string;
  title: string;
  subtitle: string;
  subtitleColor?: string;
  badge?: string;
  badgeTone?: { bg: string; fg: string };
  /** Tints the whole card — used for the primary emergency contact. */
  urgent?: boolean;
  /** Omit to render the card as plain text, which is what read-only means here. */
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  const body = (
    <>
      <View style={styles.recordBody}>
        <Text style={styles.recordKind}>{kind.toUpperCase()}</Text>
        <Text
          style={[styles.recordTitle, urgent && styles.recordTitleUrgent]}
          numberOfLines={2}>
          {title}
        </Text>
        {!!subtitle && (
          <Text
            style={[styles.recordSubtitle, !!subtitleColor && { color: subtitleColor }]}>
            {subtitle}
          </Text>
        )}
      </View>

      {!!badge && badgeTone && (
        <View style={[styles.badge, { backgroundColor: badgeTone.bg }]}>
          <Text style={[styles.badgeText, { color: badgeTone.fg }]}>
            {badge}
          </Text>
        </View>
      )}
      {trailing}
      {!!onPress && !trailing && (
        <ChevronRight size={18} color={Colors.textMuted} />
      )}
    </>
  );

  if (!onPress) {
    return <View style={[styles.record, urgent && styles.recordUrgent]}>{body}</View>;
  }

  return (
    <TouchableOpacity
      style={[styles.record, urgent && styles.recordUrgent]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityHint="Opens this record for editing">
      {body}
    </TouchableOpacity>
  );
}

/** The outline "Add …" pill under each section. */
function AddButton({
  label,
  onPress,
  icon: Icon = Plus,
}: {
  label: string;
  onPress: () => void;
  icon?: typeof Plus;
}) {
  return (
    <TouchableOpacity
      style={styles.addButton}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Icon size={16} color={Colors.primary} strokeWidth={2.4} />
      <Text style={styles.addLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

/** The round dial button on a contact or provider card. */
function CallButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.callButton}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Call">
      <Phone size={17} color={Colors.primary} strokeWidth={2.2} />
    </TouchableOpacity>
  );
}

/** The one-line placeholder inside a section with nothing in it yet. */
function Blank({ text }: { text: string }) {
  return (
    <View style={styles.blank}>
      <HeartPulse size={16} color={Colors.textMuted} strokeWidth={2} />
      <Text style={styles.blankText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, paddingHorizontal: Spacing.screen },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxxl,
  },

  hero: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  heroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  heroBadge: {
    backgroundColor: Colors.onPrimaryFaint,
    borderRadius: Radius.round,
    paddingVertical: Spacing.xs + 1,
    paddingHorizontal: Spacing.md,
  },
  heroBadgeText: { ...Typography.label, color: Colors.onPrimary, fontWeight: '700' },
  heroTitle: { ...Typography.screenTitle, color: Colors.onPrimary },
  heroMeta: {
    ...Typography.caption,
    color: Colors.onPrimaryMuted,
    marginTop: Spacing.xs,
  },

  segmented: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  segmentLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  segmentLabelActive: { color: Colors.onPrimary },

  section: { marginBottom: Spacing.xl, gap: Spacing.sm },
  sectionLabel: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },

  glanceRow: { flexDirection: 'row', gap: Spacing.md },
  glanceTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.xs,
    ...Shadow.card,
  },
  glanceLabel: { ...Typography.label, color: Colors.textSecondary },
  glanceValue: {
    ...Typography.sectionTitle,
    fontWeight: '700',
    color: Colors.primary,
  },
  glanceCount: {
    ...Typography.sectionTitle,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  glanceAction: { ...Typography.caption, color: Colors.accent, fontWeight: '600' },

  record: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    ...Shadow.card,
  },
  recordUrgent: {
    backgroundColor: Colors.errorTint,
    borderColor: Colors.errorTint,
  },
  recordBody: { flex: 1, minWidth: 0, gap: 2 },
  recordKind: {
    ...Typography.label,
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  recordTitle: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  recordTitleUrgent: { color: Colors.error },
  recordSubtitle: { ...Typography.caption, color: Colors.textSecondary },
  badge: {
    borderRadius: Radius.round,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  badgeText: { ...Typography.label, fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    ...Shadow.card,
  },
  addLabel: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  callButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  blank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderStrong,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  blankText: { ...Typography.caption, color: Colors.textMuted, flex: 1 },

  sharedList: { gap: Spacing.md },
  sharedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  sharedBody: { flex: 1, minWidth: 0 },
  sharedName: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sharedMeta: { ...Typography.caption, color: Colors.textSecondary },

  accessCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  accessTitle: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  accessRole: { ...Typography.caption, color: Colors.textSecondary },
  accessDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  accessBody: { ...Typography.caption, color: Colors.textSecondary },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    ...Shadow.card,
  },
  linkLabel: {
    ...Typography.body,
    fontSize: 15,
    flex: 1,
    color: Colors.textPrimary,
  },

  bloodChips: { marginTop: Spacing.md, marginBottom: Spacing.sm },
  footnote: {
    ...Typography.caption,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.xs,
  },
});
