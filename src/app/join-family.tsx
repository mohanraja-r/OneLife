import { router, useLocalSearchParams } from 'expo-router';
import { Check, Eye } from 'lucide-react-native';
import { type JSX, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader';
import { MemberInitials } from '../components/family/shared';
import PrimaryButton from '../components/PrimaryButton';
import { ErrorNotice, LoadingState } from '../components/ui';
import {
  Colors,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { errorMessage } from '../services/errors';
import type { InviteSender } from '../services/family';
import { acceptInvite, lookupInvite } from '../services/family';

/** How many characters an invite code has, matching `createInvite`. */
const CODE_LENGTH = 6;

/**
 * Accepting a family invite.
 *
 * The caregiver's side of the flow is only half of it: sharing medicine data
 * needs the other person to agree, and to see what they are agreeing to before
 * they do. That consent is what this screen is for.
 */
export default function JoinFamilyScreen(): JSX.Element {
  // A shared link can drop the code straight in.
  const { code: initialCode } = useLocalSearchParams<{ code?: string }>();

  const [code, setCode] = useState((initialCode ?? '').toUpperCase());
  const [sender, setSender] = useState<InviteSender | null>(null);
  const [looking, setLooking] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = code.length === CODE_LENGTH;

  /** Resolves the typed code to whoever sent it. */
  const check = useCallback(async (value: string) => {
    setLooking(true);
    setError(null);
    try {
      const found = await lookupInvite(value);
      setSender(found);
      if (!found) {
        setError('That code is not valid, or the invite has expired.');
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not check that code.'));
    } finally {
      setLooking(false);
    }
  }, []);

  // Look the code up as soon as it is long enough, rather than behind a button.
  useEffect(() => {
    if (code.length !== CODE_LENGTH) {
      setSender(null);
      setError(null);
      return;
    }
    void check(code);
  }, [code, check]);

  /** Creates the link, giving the sender access to this account's medicines. */
  const handleAccept = async () => {
    setAccepting(true);
    try {
      await acceptInvite(code);
      Alert.alert(
        'Connected',
        `${sender?.caregiverName ?? 'They'} can now see your medicine reminders and whether each dose was taken.`
      );
      router.back();
    } catch (err) {
      Alert.alert(
        'Could not connect',
        errorMessage(err, 'Something went wrong')
      );
    } finally {
      setAccepting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Join a family" />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.caption}>
            Enter the {CODE_LENGTH}-character code from the person who invited
            you.
          </Text>

          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={(next) =>
              setCode(
                next
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, CODE_LENGTH)
              )
            }
            placeholder="ABC123"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={CODE_LENGTH}
            returnKeyType="done"
            accessibilityLabel="Invite code"
          />

          {looking && <LoadingState />}
          {!looking && <ErrorNotice message={error} />}

          {!!sender && !looking && (
            <View style={styles.card}>
              <View style={styles.senderRow}>
                <MemberInitials name={sender.caregiverName} />
                <View style={styles.senderBody}>
                  <Text style={styles.senderName} numberOfLines={1}>
                    {sender.caregiverName}
                  </Text>
                  <Text style={styles.senderMeta}>
                    {sender.relationship
                      ? `wants to add you as their ${sender.relationship.toLowerCase()}`
                      : 'wants to add you to their family'}
                  </Text>
                </View>
              </View>

              <View style={styles.hair} />

              <Text style={styles.shareLabel}>
                If you accept, {sender.caregiverName} can see
              </Text>
              <View style={styles.shares}>
                {[
                  'Your medicine names and reminder times',
                  'Whether you took or missed each dose',
                  'Your name, photo and age',
                ].map((line) => (
                  <View key={line} style={styles.share}>
                    <Check
                      size={15}
                      color={Colors.success}
                      strokeWidth={3}
                      style={styles.shareTick}
                    />
                    <Text style={styles.shareText}>{line}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.hair} />

              <View style={styles.share}>
                <Eye
                  size={16}
                  color={Colors.textMuted}
                  strokeWidth={2}
                  style={styles.shareTick}
                />
                <Text style={styles.privacy}>
                  Never your meals, weight, planner or women&apos;s health
                  entries. You can disconnect whenever you like.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {!!sender && !looking && (
          <View style={styles.footer}>
            <PrimaryButton
              label={accepting ? 'Connecting…' : 'Accept and connect'}
              hideArrow
              disabled={accepting || !complete}
              onPress={() => void handleAccept()}
            />
            <TouchableOpacity
              style={styles.decline}
              onPress={() => router.back()}
              accessibilityRole="button">
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  fill: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  caption: { ...Typography.secondary, color: Colors.textSecondary },

  codeInput: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    textAlign: 'center',
    ...Typography.screenTitle,
    fontSize: 26,
    letterSpacing: 8,
    color: Colors.textPrimary,
  },

  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.lg,
    ...Shadow.card,
  },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  senderBody: { flex: 1, minWidth: 0 },
  senderName: { ...Typography.optionLabel, color: Colors.textPrimary },
  senderMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  hair: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  shareLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  shares: { gap: Spacing.md, marginTop: -Spacing.sm },
  share: { flexDirection: 'row', gap: Spacing.md },
  shareTick: { marginTop: 3 },
  shareText: {
    ...Typography.secondary,
    fontSize: 14,
    flex: 1,
    color: Colors.textPrimary,
  },
  privacy: { ...Typography.caption, flex: 1, color: Colors.textMuted },

  footer: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  decline: { alignItems: 'center', paddingVertical: Spacing.md },
  declineText: { ...Typography.button, color: Colors.textSecondary },
});
