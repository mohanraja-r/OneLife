import { MotiView } from 'moti';
import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /**
   * Wrap the sheet in a KeyboardAvoidingView. Turn on for sheets holding text
   * inputs so the keyboard lifts the content instead of covering it.
   */
  avoidKeyboard?: boolean;
  /** Gap between the last child and the home indicator. */
  bottomGap?: number;
  /** Gap under the grabber — the picker sheets sit a little tighter. */
  grabberGap?: number;
  children: ReactNode;
}

/**
 * The app's bottom sheet chrome: a dimmed backdrop that closes on tap, the
 * rounded white panel rising from the bottom edge, and the grabber above the
 * content — so every sheet in the app enters and dismisses identically.
 */
export default function BottomSheet({
  visible,
  onClose,
  avoidKeyboard = false,
  bottomGap = Spacing.xl,
  grabberGap = Spacing.xl,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  const body = (
    <Pressable
      style={styles.overlay}
      onPress={onClose}
      accessibilityRole="button"
      accessibilityLabel="Dismiss">
      {/* Swallows taps on the sheet itself so they do not close it. */}
      <Pressable onPress={() => {}}>
        <MotiView
          from={{ opacity: 0, translateY: 32 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: Motion.base }}
          style={[styles.sheet, { paddingBottom: insets.bottom + bottomGap }]}>
          <View style={[styles.grabber, { marginBottom: grabberGap }]} />
          {children}
        </MotiView>
      </Pressable>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </Modal>
  );
}

/**
 * Text and action styles shared by the sheets' bodies. Kept next to the chrome
 * so a sheet only reaches for a local StyleSheet when it has genuinely bespoke
 * content.
 */
export const sheetStyles = StyleSheet.create({
  title: { ...Typography.sectionTitle, color: Colors.textPrimary },
  subtitle: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  /** Centered title used by the wheel-picker sheets. */
  pickerTitle: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Typography.body,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  /** Filled confirm action — pass the accent's `main` as backgroundColor. */
  save: {
    borderRadius: Radius.xl,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
  },
  saveLabel: { ...Typography.button, color: Colors.textInverse },
  /** Quiet trailing action — "Cancel", "Clear today's entry". */
  cancel: { alignItems: 'center', paddingVertical: Spacing.lg },
  cancelText: {
    ...Typography.button,
    fontSize: 15,
    color: Colors.textSecondary,
  },
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    ...Shadow.floating,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: Radius.round,
    backgroundColor: Colors.borderStrong,
  },
});
