import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight, NotebookPen, ScanLine } from 'lucide-react-native';
import { MotiView } from 'moti';
import type { JSX } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

import AnimatedPressable from './AnimatedPressable';
import { BottomSheet, sheetStyles } from './ui';

/** How long the sheet takes to leave, before the chosen screen is presented. */
const DISMISS_MS = 260;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Chosen "Scan prescription" — open the camera flow. */
  onScan: () => void;
  /** Chosen "Add manually" — open the medicine form. */
  onManual: () => void;
}

interface Option {
  key: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  /** The scan route is the recommended path, so its tile carries the gradient. */
  featured?: boolean;
}

const OPTIONS: Option[] = [
  {
    key: 'scan',
    title: 'Scan prescription',
    subtitle: "Photograph the paper — we'll read the medicines off it",
    icon: ScanLine,
    featured: true,
  },
  {
    key: 'manual',
    title: 'Add manually',
    subtitle: 'Type the name, dose and reminder times yourself',
    icon: NotebookPen,
  },
];

/**
 * Bottom sheet offering the two ways to add a medicine — scanning a
 * prescription or filling the form in by hand.
 */
export default function AddMedicineSheet({
  visible,
  onClose,
  onScan,
  onManual,
}: Props): JSX.Element {
  /** Closes the sheet, then runs the picked option's action. */
  const choose = (key: string) => {
    onClose();
    // iOS will not present the next modal screen while this one is still
    // dismissing, so let the sheet finish leaving first.
    setTimeout(() => {
      if (key === 'scan') onScan();
      else onManual();
    }, DISMISS_MS);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={sheetStyles.title}>Add Medicine</Text>
      <Text style={styles.subtitle}>How would you like to add it?</Text>

      {OPTIONS.map((option, index) => {
        const Icon = option.icon;
        return (
          <MotiView
            key={option.key}
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'timing',
              duration: Motion.fast,
              delay: Motion.enterDelay + index * Motion.stagger,
            }}>
            <AnimatedPressable
              onPress={() => choose(option.key)}
              style={styles.option}>
              {option.featured ? (
                <LinearGradient
                  colors={Gradients.primary}
                  start={Gradients.diagonal.start}
                  end={Gradients.diagonal.end}
                  style={styles.tile}>
                  <Icon size={22} color={Colors.onPrimary} strokeWidth={2} />
                </LinearGradient>
              ) : (
                <View style={[styles.tile, styles.tileMuted]}>
                  <Icon size={22} color={Accents.violet.main} strokeWidth={2} />
                </View>
              )}

              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>

              <ChevronRight size={20} color={Colors.textMuted} />
            </AnimatedPressable>
          </MotiView>
        );
      })}

      <TouchableOpacity
        onPress={onClose}
        style={styles.cancel}
        accessibilityRole="button"
        activeOpacity={0.6}>
        <Text style={sheetStyles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // The only divergence from `sheetStyles.subtitle`: this sheet's options need
  // a full gap under the intro line.
  subtitle: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  tile: {
    width: 48,
    height: 48,
    borderRadius: Radius.tile,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileMuted: {
    backgroundColor: Colors.primaryTint,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    ...Typography.optionLabel,
    color: Colors.textPrimary,
  },
  optionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xs,
  },
});
