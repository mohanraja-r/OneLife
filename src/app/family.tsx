import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  Heart,
  Info,
  Plus,
  Ticket,
  UserRoundPlus,
  Users,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  adherenceStatus,
  MemberInitials,
  nameWithRelationship,
} from '../components/family/shared';
import PrimaryButton from '../components/PrimaryButton';
import ProgressRing from '../components/ProgressRing';
import { EmptyState, ErrorNotice, LoadingState } from '../components/ui';
import {
  Accents,
  Colors,
  Gradients,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { useFamilyOverview } from '../services/family';
import { firstNameOf } from '../services/profile';

/** How many people the dashboard previews before "View all" takes over. */
const PREVIEW_COUNT = 4;

/**
 * The family dashboard.
 *
 * The headline figure is medicine adherence rather than a general wellness
 * score — the app holds no steps, sleep or vitals for anybody but the
 * signed-in user, so doses taken is the only thing it can honestly say about
 * how a family is doing.
 */
export default function FamilyScreen() {
  const { self, members, invites, score, loading, error, reload } =
    useFamilyOverview();

  // Members are added and removed on other screens, so refresh on the way back.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  /** Explains what the score counts, from the info affordance beside it. */
  const explainScore = () => {
    Alert.alert(
      'Family Medicine Score',
      'The average share of doses taken in the last seven days, across everyone in your family who takes medicine. People with no medicines are left out rather than counted as a perfect score.'
    );
  };

  const isEmpty = members.length === 0 && invites.length === 0;
  const preview = members.slice(0, PREVIEW_COUNT);
  const status = score === null ? null : adherenceStatus(score);
  const faces = [
    ...(self ? [{ id: self.id, name: self.name, avatarUrl: self.avatarUrl }] : []),
    ...members,
  ].slice(0, 4);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family</Text>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => router.push('/join-family')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Enter an invite code">
          <Ticket size={21} color={Colors.textPrimary} strokeWidth={1.9} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ErrorNotice message={error} onRetry={reload} />

        {loading && !self ? (
          <LoadingState />
        ) : (
          <>
            {/* Greeting */}
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: Motion.base }}>
              <LinearGradient
                colors={Gradients.familyHero}
                start={Gradients.diagonal.start}
                end={Gradients.diagonal.end}
                style={styles.hero}>
                <View style={styles.heroText}>
                  <Text style={styles.heroTitle}>
                    Hello, {self ? firstNameOf(self.name) : 'there'}! 👋
                  </Text>
                  <Text style={styles.heroBody}>
                    Here&apos;s how your family is doing today.
                  </Text>
                </View>

                {/* Overlapping faces, newest tucked behind the one before it. */}
                <View style={styles.faces}>
                  {faces.map((face, index) => (
                    <View
                      key={face.id}
                      style={[
                        styles.face,
                        { marginLeft: index === 0 ? 0 : -Spacing.md },
                        { zIndex: faces.length - index },
                      ]}>
                      {face.avatarUrl ? (
                        <Image
                          source={{ uri: face.avatarUrl }}
                          style={styles.faceImage}
                        />
                      ) : (
                        <MemberInitials name={face.name} size={38} />
                      )}
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </MotiView>

            {/* Score */}
            {status !== null && score !== null && (
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: 'timing',
                  duration: Motion.base,
                  delay: Motion.enterDelay,
                }}
                style={styles.scoreCard}>
                <View style={styles.scoreBody}>
                  <TouchableOpacity
                    style={styles.scoreLabelRow}
                    onPress={explainScore}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Family Medicine Score. What is this?">
                    <Text style={styles.scoreLabel}>Family Medicine Score</Text>
                    <Info size={14} color={Colors.textMuted} strokeWidth={2} />
                  </TouchableOpacity>

                  <View style={styles.scoreValueRow}>
                    <Text style={styles.scoreValue}>{score}</Text>
                    <Text style={styles.scoreOutOf}>/100</Text>
                  </View>

                  <View
                    style={[
                      styles.gradePill,
                      { backgroundColor: status.accent.tint },
                    ]}>
                    <Text
                      style={[styles.gradeText, { color: status.accent.dark }]}>
                      {status.grade}
                    </Text>
                  </View>
                </View>

                <ProgressRing
                  size={88}
                  thickness={8}
                  progress={score / 100}
                  color={status.accent.main}>
                  <View style={styles.ringCore}>
                    <Heart
                      size={26}
                      color={Colors.primary}
                      fill={Colors.primary}
                      strokeWidth={0}
                    />
                  </View>
                </ProgressRing>
              </MotiView>
            )}

            {/* Members */}
            {isEmpty ? (
              <EmptyState
                icon={Users}
                title="No one here yet"
                subtitle="Add the people whose medicines you help keep track of, and you'll see whether each dose was taken.">
                <View style={styles.emptyAction}>
                  <PrimaryButton
                    label="Add family member"
                    icon={UserRoundPlus}
                    hideArrow
                    onPress={() => router.push('/add-family-member')}
                  />
                </View>
              </EmptyState>
            ) : (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Family Members</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/family-members')}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="View all family members">
                    <Text style={styles.viewAll}>View all</Text>
                  </TouchableOpacity>
                </View>

                {!!self && (
                  <PersonRow
                    index={0}
                    name={self.name}
                    avatarUrl={self.avatarUrl}
                    adherence={self.adherence}
                    badge="You"
                  />
                )}

                {preview.map((member, index) => (
                  <PersonRow
                    key={member.id}
                    index={index + 1}
                    name={nameWithRelationship(member)}
                    avatarUrl={member.avatarUrl}
                    adherence={member.adherence}
                    onPress={() =>
                      router.push({
                        pathname: '/family-member',
                        params: { id: member.id },
                      })
                    }
                  />
                ))}

                {invites.length > 0 && (
                  <TouchableOpacity
                    style={styles.pendingNote}
                    onPress={() => router.push('/family-members')}
                    accessibilityRole="button">
                    <Text style={styles.pendingText}>
                      {invites.length === 1
                        ? '1 invite is waiting to be accepted'
                        : `${invites.length} invites are waiting to be accepted`}
                    </Text>
                    <ChevronRight size={16} color={Colors.accent} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!isEmpty && (
              <PrimaryButton
                label="Add Family Member"
                icon={Plus}
                hideArrow
                onPress={() => router.push('/add-family-member')}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface PersonRowProps {
  index: number;
  name: string;
  avatarUrl: string | null;
  adherence: { onTrackPercent: number; medicineCount: number };
  /** Shown instead of a score, e.g. the "You" chip on your own row. */
  badge?: string;
  onPress?: () => void;
}

/** One person on the dashboard: face, name, how their week is going. */
function PersonRow({
  index,
  name,
  avatarUrl,
  adherence,
  badge,
  onPress,
}: PersonRowProps) {
  const scored = adherence.medicineCount > 0;
  const status = adherenceStatus(adherence.onTrackPercent);
  const urgent = scored && status.urgent;

  return (
    <MotiView
      from={{ opacity: 0, translateX: -10 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{
        type: 'timing',
        duration: Motion.fast,
        delay: Motion.enterDelay + index * Motion.stagger,
      }}>
      <TouchableOpacity
        style={[styles.personRow, urgent && styles.personRowUrgent]}
        activeOpacity={onPress ? 0.6 : 1}
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={
          scored
            ? `${name}, ${status.label}, ${adherence.onTrackPercent} out of 100`
            : `${name}, no medicines`
        }>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.rowAvatar} />
        ) : (
          <MemberInitials name={name} />
        )}

        <View style={styles.rowBody}>
          <Text
            style={[styles.rowName, urgent && styles.rowNameUrgent]}
            numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {scored ? (
              <>
                <Text style={{ color: status.accent.dark }}>
                  {status.label}
                </Text>
                {` · ${adherence.onTrackPercent}`}
              </>
            ) : (
              'No medicines yet'
            )}
          </Text>
        </View>

        {badge ? (
          <View style={styles.youPill}>
            <Text style={styles.youText}>{badge}</Text>
          </View>
        ) : urgent ? (
          <View style={styles.alertDot}>
            <Text style={styles.alertMark}>!</Text>
          </View>
        ) : null}

        {!!onPress && <ChevronRight size={19} color={Colors.textMuted} />}
      </TouchableOpacity>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.screen,
    height: 52,
  },
  headerTitle: { ...Typography.heading, color: Colors.textPrimary, flex: 1 },
  headerIcon: { padding: Spacing.xs },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.card,
    padding: Spacing.xl,
    minHeight: 118,
  },
  heroText: { flex: 1, minWidth: 0 },
  heroTitle: { ...Typography.cardTitle, color: Colors.primaryDark },
  heroBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  faces: { flexDirection: 'row', alignItems: 'center' },
  face: {
    borderWidth: 2,
    borderColor: Colors.surface,
    borderRadius: Radius.round,
  },
  faceImage: { width: 38, height: 38, borderRadius: Radius.round },

  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.xl,
    ...Shadow.card,
  },
  scoreBody: { flex: 1, minWidth: 0, gap: Spacing.sm },
  scoreLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  scoreLabel: { ...Typography.caption, color: Colors.textSecondary },
  scoreValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  scoreValue: {
    ...Typography.largeNumber,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  scoreOutOf: {
    ...Typography.unit,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },
  gradePill: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.round,
  },
  gradeText: { ...Typography.label, fontWeight: '700' },
  ringCore: {
    width: 56,
    height: 56,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },

  section: { gap: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  sectionTitle: { ...Typography.cardTitle, color: Colors.textPrimary },
  viewAll: { ...Typography.caption, color: Colors.accent, fontWeight: '700' },

  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Shadow.card,
  },
  personRowUrgent: {
    borderColor: Accents.rose.tint,
    backgroundColor: Accents.rose.tint,
  },
  rowAvatar: { width: 44, height: 44, borderRadius: Radius.round },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { ...Typography.optionLabel, color: Colors.textPrimary },
  rowNameUrgent: { color: Accents.rose.dark },
  rowMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  youPill: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryTint,
  },
  youText: {
    ...Typography.label,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  alertDot: {
    width: 22,
    height: 22,
    borderRadius: Radius.round,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertMark: {
    ...Typography.label,
    color: Colors.textInverse,
    fontWeight: '700',
  },

  pendingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  pendingText: { ...Typography.caption, color: Colors.accent, fontWeight: '600' },

  emptyAction: { alignSelf: 'stretch', marginTop: Spacing.xl },
});
