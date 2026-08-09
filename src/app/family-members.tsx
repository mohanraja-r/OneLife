import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Plus,
  UserRoundPlus,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MemberInitials,
  nameWithRelationship,
} from '../components/family/shared';
import { ErrorNotice, LoadingState } from '../components/ui';
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
import { formatLongDate } from '../services/dates';
import { errorMessage } from '../services/errors';
import type { FamilyInvite, FamilyMemberWithAdherence } from '../services/family';
import { revokeInvite, useFamilyOverview } from '../services/family';

/**
 * The full family roster.
 *
 * The dashboard previews the first few people and sends everything else here,
 * where each row is about who someone *is* — their age, how they are connected —
 * rather than how their week of doses has gone.
 */
export default function FamilyMembersScreen() {
  const { self, members, invites, loading, error, reload } = useFamilyOverview();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  /** Shares an invite code through the OS share sheet. */
  const shareInvite = async (invite: FamilyInvite) => {
    const who = invite.inviteeName ? `${invite.inviteeName}, ` : '';
    try {
      await Share.share({
        message: `${who}join my family on OneLife so we can keep track of each other's medicines. Your invite code is ${invite.code}.`,
      });
    } catch (err) {
      Alert.alert('Could not share', errorMessage(err, 'Something went wrong'));
    }
  };

  /** Cancels an invite after confirming, so the code stops working. */
  const cancelInvite = (invite: FamilyInvite) => {
    Alert.alert(
      'Cancel this invite?',
      `The code ${invite.code} will stop working straight away.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel invite',
          style: 'destructive',
          onPress: () => {
            void revokeInvite(invite.id).catch((err: unknown) =>
              Alert.alert(
                'Could not cancel',
                errorMessage(err, 'Something went wrong')
              )
            );
          },
        },
      ]
    );
  };

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
        <Text style={styles.headerTitle}>Family Members</Text>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => router.push('/add-family-member')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Add a family member">
          <Plus size={23} color={Colors.textPrimary} strokeWidth={2.2} />
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
            {/* Invite promo */}
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: Motion.base }}>
              <LinearGradient
                colors={Gradients.familyHero}
                start={Gradients.diagonal.start}
                end={Gradients.diagonal.end}
                style={styles.promo}>
                <View style={styles.promoBody}>
                  <Text style={styles.promoTitle}>Add family members</Text>
                  <Text style={styles.promoText}>
                    Invite and manage your loved ones in one place.
                  </Text>
                  <TouchableOpacity
                    style={styles.inviteButton}
                    onPress={() => router.push('/add-family-member')}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Invite a family member">
                    <Text style={styles.inviteText}>Invite</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.promoGlyph}>
                  <UserRoundPlus
                    size={30}
                    color={Colors.primary}
                    strokeWidth={1.8}
                  />
                </View>
              </LinearGradient>
            </MotiView>

            {/* You */}
            {!!self && (
              <RosterRow
                index={0}
                name={self.name}
                subtitle="Primary Account"
                avatarUrl={self.avatarUrl}
                badge="Admin"
                emphasis
              />
            )}

            {/* Everybody else */}
            {members.map((member, index) => (
              <RosterRow
                key={member.id}
                index={index + 1}
                name={nameWithRelationship(member)}
                subtitle={describeMember(member)}
                avatarUrl={member.avatarUrl}
                badge="Member"
                onPress={() =>
                  router.push({
                    pathname: '/family-member',
                    params: { id: member.id },
                  })
                }
              />
            ))}

            {/* Sent, not yet accepted */}
            {invites.map((invite, index) => (
              <MotiView
                key={invite.id}
                from={{ opacity: 0, translateX: -10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{
                  type: 'timing',
                  duration: Motion.fast,
                  delay:
                    Motion.enterDelay +
                    (members.length + index + 1) * Motion.stagger,
                }}>
                <View style={styles.row}>
                  <View style={styles.pendingTile}>
                    <Clock size={20} color={Colors.textMuted} strokeWidth={1.9} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {invite.inviteeName ?? 'Invite sent'}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      Code {invite.code}
                      {invite.relationship ? ` · ${invite.relationship}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sharePill}
                    onPress={() => void shareInvite(invite)}
                    accessibilityRole="button"
                    accessibilityLabel={`Share the code for ${invite.inviteeName ?? 'this invite'}`}>
                    <Text style={styles.sharePillText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => cancelInvite(invite)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel this invite">
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </MotiView>
            ))}

            {members.length === 0 && invites.length === 0 && (
              <Text style={styles.footnote}>
                Nobody else yet. Invite someone who has the app, or set up a
                managed profile for a parent who won&apos;t use one.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** The identity line under a member's name — date of birth and age, or how they connect. */
function describeMember(member: FamilyMemberWithAdherence): string {
  if (member.dateOfBirth) {
    const age = member.age === null ? null : `${member.age} yrs`;
    return [formatLongDate(member.dateOfBirth), age].filter(Boolean).join(' · ');
  }
  return member.connectionType === 'managed'
    ? 'Managed profile'
    : 'Has the app';
}

interface RosterRowProps {
  index: number;
  name: string;
  subtitle: string;
  avatarUrl: string | null;
  badge: string;
  /** Tints the badge as the account owner's rather than a plain member's. */
  emphasis?: boolean;
  onPress?: () => void;
}

/** One person on the roster: face, who they are, and their role. */
function RosterRow({
  index,
  name,
  subtitle,
  avatarUrl,
  badge,
  emphasis = false,
  onPress,
}: RosterRowProps) {
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
        style={styles.row}
        activeOpacity={onPress ? 0.6 : 1}
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={`${name}, ${subtitle}, ${badge}`}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <MemberInitials name={name} />
        )}

        <View style={styles.rowBody}>
          <Text style={styles.rowName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <View style={[styles.rolePill, emphasis && styles.rolePillOwner]}>
          <Text style={[styles.roleText, emphasis && styles.roleTextOwner]}>
            {badge}
          </Text>
        </View>

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
  headerTitle: { ...Typography.cardTitle, color: Colors.textPrimary, flex: 1 },
  headerIcon: { padding: Spacing.xs },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },

  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.card,
    padding: Spacing.xl,
    marginBottom: Spacing.xs,
  },
  promoBody: { flex: 1, minWidth: 0, gap: Spacing.xs },
  promoTitle: { ...Typography.cardTitle, color: Colors.primaryDark },
  promoText: { ...Typography.caption, color: Colors.textSecondary },
  inviteButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
  },
  inviteText: {
    ...Typography.caption,
    color: Colors.textInverse,
    fontWeight: '700',
  },
  promoGlyph: {
    width: 64,
    height: 64,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  row: {
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
  avatar: { width: 44, height: 44, borderRadius: Radius.round },
  pendingTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.round,
    backgroundColor: Colors.surfaceSunken,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { ...Typography.optionLabel, color: Colors.textPrimary },
  rowMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  rolePill: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.round,
    backgroundColor: Colors.infoTint,
  },
  rolePillOwner: { backgroundColor: Accents.green.tint },
  roleText: { ...Typography.label, color: Colors.info, fontWeight: '700' },
  roleTextOwner: { color: Accents.green.dark },

  sharePill: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryTint,
  },
  sharePillText: {
    ...Typography.label,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  cancelText: { ...Typography.label, color: Colors.textMuted },

  footnote: {
    ...Typography.caption,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.sm,
  },
});
