import { useFocusEffect } from 'expo-router';
import { Check, ChevronDown, ChevronRight, Share2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AnimatedPressable from '../../components/AnimatedPressable';
import AppHeader from '../../components/AppHeader';
import GradientRing from '../../components/GradientRing';
import { ErrorNotice, LoadingState } from '../../components/ui';
import {
  BagSide,
  categoriesFor,
  totalItemsFor,
} from '../../constants/hospitalBag';
import {
  Accents,
  Colors,
  Gradients,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import { errorMessage } from '../../services/errors';
import {
  PregnancyRecord,
  getPregnancy,
  savePackedItems,
} from '../../services/women';

/**
 * Hospital Bag — two bags, categories inside each, and a shopping list of
 * whatever is still unpacked.
 *
 * The catalogue lives in `constants/hospitalBag`; only the ticks are stored,
 * as a set of ids on the pregnancy row.
 */
export default function HospitalBagScreen() {
  const [record, setRecord] = useState<PregnancyRecord | null>(null);
  const [side, setSide] = useState<BagSide>('mom');
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Held locally so a tick responds instantly rather than after a round trip.
  const [packed, setPacked] = useState<string[]>([]);
  // The synchronous copy each tap derives its change from.
  const packedRef = useRef<string[]>([]);
  // Serialises the writes so they can never land out of order.
  const writeChain = useRef<Promise<void>>(Promise.resolve());

  /** Loads the pregnancy record and the packed set stored on it. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const pregnancy = await getPregnancy();
      setRecord(pregnancy);
      const stored = pregnancy?.bag.packed ?? [];
      packedRef.current = stored;
      setPacked(stored);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your hospital bag.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const packedSet = useMemo(() => new Set(packed), [packed]);
  const categories = categoriesFor(side);

  const momTotal = totalItemsFor('mom');
  const babyTotal = totalItemsFor('baby');
  const total = momTotal + babyTotal;

  /** How many of one bag's items are ticked. */
  const packedIn = (bag: BagSide) =>
    categoriesFor(bag).reduce(
      (count, category) =>
        count +
        category.items.filter((item) => packedSet.has(item.id)).length,
      0
    );

  const overall = total === 0 ? 0 : packed.length / total;

  /**
   * Ticks an item, writing the whole packed set through to the record.
   *
   * The next state is derived from a ref rather than from React state: state
   * updates are batched, so two quick taps would both compute their change from
   * the same stale array and the second would drop the first.
   *
   * Writes are chained end to end for the same reason — two overlapping updates
   * can otherwise land out of order, leaving the row holding the earlier set.
   */
  const toggle = (itemId: string) => {
    const current = packedRef.current;
    const next = current.includes(itemId)
      ? current.filter((id) => id !== itemId)
      : [...current, itemId];

    packedRef.current = next;
    setPacked(next);

    writeChain.current = writeChain.current
      .then(() => savePackedItems(next))
      .catch((err: unknown) => {
        // Revert to whatever the server last accepted, not to this tap's
        // predecessor — by now several taps may have queued behind it.
        packedRef.current = current;
        setPacked(current);
        setError(errorMessage(err, 'Could not save that change.'));
      });
  };

  /** Shares everything still unpacked, as plain text. */
  const shareList = async () => {
    const lines: string[] = ['Hospital bag — still to pack', ''];

    (['mom', 'baby'] as BagSide[]).forEach((bag) => {
      const remaining = categoriesFor(bag)
        .map((category) => ({
          title: category.title,
          items: category.items.filter((item) => !packedSet.has(item.id)),
        }))
        .filter((group) => group.items.length > 0);

      if (remaining.length === 0) return;

      lines.push(bag === 'mom' ? "MOM'S BAG" : "BABY'S BAG");
      remaining.forEach((group) => {
        lines.push(`  ${group.title}`);
        group.items.forEach((item) => {
          lines.push(
            `    - ${item.name}${item.quantity ? ` (${item.quantity})` : ''}`
          );
        });
      });
      lines.push('');
    });

    if (lines.length <= 2) {
      lines.push('Everything is packed.');
    }

    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // A dismissed share sheet is not an error worth reporting.
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Hospital Bag"
        action={
          <AnimatedPressable onPress={() => void shareList()} haptic={false}>
            <Share2 size={19} color={Colors.textSecondary} />
          </AnimatedPressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ErrorNotice message={error} onRetry={() => void load()} />

        {loading || !record ? (
          <LoadingState color={Accents.orange.main} />
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            <View style={styles.progressCard}>
              <GradientRing
                size={64}
                thickness={7}
                progress={overall}
                colors={Gradients.activity}>
                <Text style={styles.progressValue}>
                  {Math.round(overall * 100)}%
                </Text>
              </GradientRing>
              <View style={styles.progressText}>
                <Text style={styles.progressTitle}>
                  {packed.length} of {total} packed
                </Text>
                <Text style={styles.progressBody}>
                  {overall === 1
                    ? 'Everything is ready. Keep the bag by the door.'
                    : 'Aim to have this done by around week 34.'}
                </Text>
              </View>
            </View>

            <View style={styles.bagRow}>
              {(['baby', 'mom'] as BagSide[]).map((bag) => {
                const selected = side === bag;
                const count = packedIn(bag);
                const bagTotal = bag === 'mom' ? momTotal : babyTotal;

                return (
                  <AnimatedPressable
                    key={bag}
                    onPress={() => {
                      setSide(bag);
                      setOpenCategory(null);
                    }}
                    style={[styles.bagCard, selected && styles.bagCardActive]}>
                    <Text
                      style={[
                        styles.bagTitle,
                        selected && styles.bagTitleActive,
                      ]}>
                      {bag === 'mom' ? "Mom's bag" : "Baby's bag"}
                    </Text>
                    <Text style={styles.bagCount}>
                      {count} / {bagTotal} packed
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            {categories.map((category) => {
              const open = openCategory === category.id;
              const done = category.items.filter((item) =>
                packedSet.has(item.id)
              ).length;

              return (
                <View key={category.id} style={styles.category}>
                  <AnimatedPressable
                    onPress={() => setOpenCategory(open ? null : category.id)}
                    style={styles.categoryHeader}>
                    <Text style={styles.categoryTitle}>{category.title}</Text>
                    <Text style={styles.categoryCount}>
                      {done} of {category.items.length} packed
                    </Text>
                    {open ? (
                      <ChevronDown size={18} color={Colors.textMuted} />
                    ) : (
                      <ChevronRight size={18} color={Colors.textMuted} />
                    )}
                  </AnimatedPressable>

                  {open && (
                    <MotiView
                      from={{ opacity: 0, translateY: -6 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ type: 'timing', duration: Motion.fast }}
                      style={styles.categoryBody}>
                      {category.items.map((item) => {
                        const isPacked = packedSet.has(item.id);
                        return (
                          <AnimatedPressable
                            key={item.id}
                            onPress={() => toggle(item.id)}
                            style={styles.item}>
                            <View
                              style={[
                                styles.checkbox,
                                isPacked && styles.checkboxOn,
                              ]}>
                              {isPacked && (
                                <Check
                                  size={13}
                                  color={Colors.textInverse}
                                  strokeWidth={3}
                                />
                              )}
                            </View>
                            <View style={styles.itemText}>
                              <View style={styles.itemHead}>
                                <Text
                                  style={[
                                    styles.itemName,
                                    isPacked && styles.itemNameDone,
                                  ]}>
                                  {item.name}
                                </Text>
                                {!!item.quantity && (
                                  <Text style={styles.itemQuantity}>
                                    {item.quantity}
                                  </Text>
                                )}
                              </View>
                              <Text style={styles.itemNote}>{item.note}</Text>
                            </View>
                          </AnimatedPressable>
                        );
                      })}
                    </MotiView>
                  )}
                </View>
              );
            })}

            <AnimatedPressable onPress={() => void shareList()} style={styles.shareCta}>
              <Share2 size={17} color={Accents.orange.dark} strokeWidth={2.2} />
              <Text style={styles.shareText}>Share what&apos;s left to buy</Text>
            </AnimatedPressable>
          </MotiView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.navClearance,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  progressValue: {
    ...Typography.metricValue,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  progressText: { flex: 1 },
  progressTitle: {
    ...Typography.cardTitle,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  progressBody: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  bagRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  bagCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  bagCardActive: {
    borderColor: Accents.orange.main,
    backgroundColor: Accents.orange.tint,
  },
  bagTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bagTitleActive: { color: Accents.orange.dark },
  bagCount: { ...Typography.label, color: Colors.textSecondary, marginTop: 2 },
  category: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.card,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  categoryTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  categoryCount: { ...Typography.label, color: Colors.textSecondary },
  categoryBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
  },
  checkbox: {
    width: 21,
    height: 21,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: Accents.green.main,
    borderColor: Accents.green.main,
  },
  itemText: { flex: 1 },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  itemName: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  itemNameDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  itemQuantity: { ...Typography.label, color: Accents.orange.dark },
  itemNote: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  shareCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Accents.orange.tint,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  shareText: {
    ...Typography.button,
    fontSize: 15,
    color: Accents.orange.dark,
  },
});
