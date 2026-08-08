import { Info } from 'lucide-react-native';
import { MotiView } from 'moti';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import AnimatedPressable from '../AnimatedPressable';

import { LOG_CONFIG, LogKind } from './LogSheet';

/** Pieces both Women's Health tabs draw the same way. */

interface SectionHeaderProps {
  title: string;
  /** Right-hand link, e.g. "See all". Omit for a plain heading. */
  actionLabel?: string;
  onAction?: () => void;
}

/** A section title with an optional link on the right. */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!actionLabel && (
        <AnimatedPressable onPress={onAction}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </AnimatedPressable>
      )}
    </View>
  );
}

interface LogRowProps {
  /** Measurements to offer, in order. */
  kinds: LogKind[];
  /** Which of them already have a value for today. */
  logged: Set<LogKind>;
  onPick: (kind: LogKind) => void;
}

/** The horizontal "Log today" strip of circular shortcut tiles. */
export function LogRow({ kinds, logged, onPick }: LogRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.logRow}>
      {kinds.map((kind, index) => {
        const config = LOG_CONFIG[kind];
        const Icon = config.icon;
        const done = logged.has(kind);

        return (
          <MotiView
            key={kind}
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'timing',
              duration: Motion.fast,
              delay: Motion.enterDelay + index * Motion.stagger,
            }}>
            <AnimatedPressable
              onPress={() => onPick(kind)}
              style={styles.logItem}>
              <View
                style={[
                  styles.logTile,
                  done && {
                    backgroundColor: config.accent.tint,
                    borderColor: config.accent.main,
                  },
                ]}>
                <Icon
                  size={22}
                  color={config.accent.main}
                  strokeWidth={done ? 2.4 : 1.9}
                />
              </View>
              <Text style={styles.logLabel} numberOfLines={1}>
                {config.label}
              </Text>
            </AnimatedPressable>
          </MotiView>
        );
      })}
    </ScrollView>
  );
}

/** The footnote reminding the user that predictions are not medical advice. */
export function Disclaimer({ text }: { text: string }) {
  return (
    <View style={styles.disclaimer}>
      <Info size={17} color={Colors.info} strokeWidth={2} />
      <Text style={styles.disclaimerText}>{text}</Text>
    </View>
  );
}

/** One label/value line inside the small summary cards. */
export function StatLine({
  label,
  value,
  children,
}: {
  label: string;
  /** Right-hand text; omit when `children` renders the value instead. */
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.statLine}>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      {children ?? (
        <Text style={styles.statValue} numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );
}

export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cardAction: { ...Typography.label, color: Colors.accent },
  row: { flexDirection: 'row', gap: Spacing.md },
  column: { flex: 1 },
});

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  sectionTitle: { ...Typography.cardTitle, color: Colors.textPrimary },
  sectionAction: { ...Typography.caption, color: Colors.accent },
  logRow: { gap: Spacing.md, paddingRight: Spacing.screen },
  logItem: { alignItems: 'center', width: 68, gap: Spacing.sm },
  logTile: {
    width: 56,
    height: 56,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },
  logLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  disclaimer: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    backgroundColor: Colors.infoTint,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xxl,
  },
  disclaimerText: {
    ...Typography.caption,
    flex: 1,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  statLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  statLabel: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  statValue: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
