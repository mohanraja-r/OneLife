import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronRight, Plus, Sparkles, UtensilsCrossed } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EditMealItemSheet from '../components/EditMealItemSheet';
import PrimaryButton from '../components/PrimaryButton';
import ProgressRing from '../components/ProgressRing';
import {
  Accents,
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { errorMessage } from '../services/errors';
import {
  MealItem,
  calculateMealTotals,
  mealTitle,
  saveMeal,
  servingLabel,
} from '../services/meals';

/** A fresh row for the "Add Item" action — every field empty and editable. */
const blankItem: MealItem = { name: '', calories: 0, protein: 0, carbs: 0, fat: 0 };

/** Calories per gram, used to turn macro grams into their share of the meal. */
const CALORIES_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

const RING_SIZE = 92;
const RING_THICKNESS = 10;

const macroColors = {
  protein: Accents.violet.main,
  fat: Accents.amber.main,
  carbs: Accents.blue.main,
} as const;

interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * The calorie donut: three stacked rings, each drawn to the running total of
 * the segments beneath it, so the topmost arc reads as the first slice. The
 * project has no react-native-svg, so this is the only way to get more than one
 * colour into a single ring.
 */
function MacroDonut({ totals }: { totals: Totals }) {
  const proteinKcal = totals.protein * CALORIES_PER_GRAM.protein;
  const fatKcal = totals.fat * CALORIES_PER_GRAM.fat;
  const carbsKcal = totals.carbs * CALORIES_PER_GRAM.carbs;
  const macroKcal = proteinKcal + fatKcal + carbsKcal;

  // With no macros logged the donut would divide by zero — show an empty track.
  const proteinShare = macroKcal ? proteinKcal / macroKcal : 0;
  const fatShare = macroKcal ? fatKcal / macroKcal : 0;

  return (
    <View style={styles.donut}>
      {/* Carbs sits underneath and fills the remainder of the circle. */}
      <ProgressRing
        size={RING_SIZE}
        thickness={RING_THICKNESS}
        progress={macroKcal ? 1 : 0}
        color={macroColors.carbs}
      />
      <View style={styles.donutLayer}>
        <ProgressRing
          size={RING_SIZE}
          thickness={RING_THICKNESS}
          progress={proteinShare + fatShare}
          color={macroColors.fat}
          trackColor="transparent"
        />
      </View>
      <View style={styles.donutLayer}>
        <ProgressRing
          size={RING_SIZE}
          thickness={RING_THICKNESS}
          progress={proteinShare}
          color={macroColors.protein}
          trackColor="transparent"
        />
      </View>
      <View style={styles.donutCenter}>
        <Text style={styles.donutValue}>{Math.round(totals.calories)}</Text>
        <Text style={styles.donutUnit}>Calories</Text>
      </View>
    </View>
  );
}

export default function ConfirmMealScreen() {
  const params = useLocalSearchParams<{
    photoUri?: string;
    items: string;
    suggestion: string;
    source: 'photo' | 'manual';
  }>();

  const [items, setItems] = useState<MealItem[]>(() => {
    try {
      return JSON.parse(params.items ?? '[]') as MealItem[];
    } catch {
      return [];
    }
  });
  const [editing, setEditing] = useState<{ index: number; item: MealItem } | null>(null);
  const [saving, setSaving] = useState(false);

  const totals = calculateMealTotals({ items });
  const macroKcal =
    totals.protein * CALORIES_PER_GRAM.protein +
    totals.fat * CALORIES_PER_GRAM.fat +
    totals.carbs * CALORIES_PER_GRAM.carbs;

  // Pinned on mount so the timestamp does not drift while the user edits.
  const loggedAt = useMemo(() => new Date(), []);
  const timeLabel = `Today, ${loggedAt.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;

  /** Writes the sheet's edited row back into the list, appending when the row
   *  came from "Add Item". */
  const handleItemSave = (updated: MealItem) => {
    if (!editing) return;
    const next = [...items];
    next[editing.index] = updated;
    setItems(next);
    setEditing(null);
  };

  /** Drops the row the sheet is editing. */
  const handleItemDelete = () => {
    if (!editing) return;
    setItems(items.filter((_, i) => i !== editing.index));
    setEditing(null);
  };

  const handleSave = async () => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      await saveMeal({
        source: params.source ?? 'manual',
        photoUrl: params.photoUri,
        items,
        aiSuggestion: params.suggestion ?? '',
      });
      router.replace('/(tabs)/home');
    } catch (err) {
      Alert.alert('Error saving meal', errorMessage(err, 'Something went wrong'));
      setSaving(false);
    }
  };

  const macroLegend = [
    {
      key: 'protein' as const,
      label: 'Protein',
      grams: totals.protein,
      kcal: totals.protein * CALORIES_PER_GRAM.protein,
    },
    {
      key: 'fat' as const,
      label: 'Fat',
      grams: totals.fat,
      kcal: totals.fat * CALORIES_PER_GRAM.fat,
    },
    {
      key: 'carbs' as const,
      label: 'Carbs',
      grams: totals.carbs,
      kcal: totals.carbs * CALORIES_PER_GRAM.carbs,
    },
  ];

  const totalStats = [
    { label: 'Calories', value: `${Math.round(totals.calories)}` },
    { label: 'Protein', value: `${Math.round(totals.protein)} g` },
    { label: 'Fat', value: `${Math.round(totals.fat)} g` },
    { label: 'Carbs', value: `${Math.round(totals.carbs)} g` },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Meal</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Meal identity */}
        <View style={styles.mealCard}>
          {params.photoUri ? (
            <Image source={{ uri: params.photoUri }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <UtensilsCrossed size={22} color={Colors.primary} strokeWidth={1.8} />
            </View>
          )}
          <View style={styles.mealCardText}>
            <Text style={styles.mealName} numberOfLines={1}>
              {mealTitle(items)}
            </Text>
            <Text style={styles.mealTime}>{timeLabel}</Text>
          </View>
        </View>

        {/* Nutrition summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nutrition Summary</Text>
          <View style={styles.summaryRow}>
            <MacroDonut totals={totals} />
            <View style={styles.legend}>
              {macroLegend.map((macro) => (
                <View key={macro.key} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: macroColors[macro.key] }]} />
                  <Text style={styles.legendLabel}>{macro.label}</Text>
                  <Text style={styles.legendValue}>
                    {Math.round(macro.grams)} g
                    {macroKcal > 0 && ` (${Math.round((macro.kcal / macroKcal) * 100)}%)`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Detected items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {params.source === 'manual' ? 'Items' : 'Detected Items'}
          </Text>

          {items.length === 0 && (
            <Text style={styles.emptyText}>
              Nothing here yet — add an item to save this meal.
            </Text>
          )}

          {items.map((item, index) => {
            const serving = servingLabel(item);
            return (
              <MotiView
                key={`${item.name}-${index}`}
                from={{ opacity: 0, translateX: -8 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{
                  type: 'timing',
                  duration: Motion.fast,
                  delay: index * Motion.stagger,
                }}>
                <TouchableOpacity
                  style={styles.itemRow}
                  activeOpacity={0.7}
                  onPress={() => setEditing({ index, item })}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.name}`}>
                  <View style={styles.itemTile}>
                    <UtensilsCrossed size={18} color={Colors.primary} strokeWidth={1.8} />
                  </View>
                  <View style={styles.itemText}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {!!serving && <Text style={styles.itemServing}>{serving}</Text>}
                  </View>
                  <Text style={styles.itemCalories}>{Math.round(item.calories)} kcal</Text>
                  <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2} />
                </TouchableOpacity>
              </MotiView>
            );
          })}

          <TouchableOpacity
            style={styles.addItem}
            activeOpacity={0.7}
            onPress={() => setEditing({ index: items.length, item: { ...blankItem } })}
            accessibilityRole="button"
            accessibilityLabel="Add item">
            <Plus size={18} color={Colors.primary} strokeWidth={2.2} />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total (Estimated)</Text>
          <View style={styles.totalsRow}>
            {totalStats.map((stat) => (
              <View key={stat.label} style={styles.totalStat}>
                <Text style={styles.totalValue}>{stat.value}</Text>
                <Text style={styles.totalLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {!!params.suggestion && (
          <View style={styles.suggestion}>
            <Sparkles size={18} color={Colors.primaryDark} strokeWidth={2} />
            <Text style={styles.suggestionText}>{params.suggestion}</Text>
          </View>
        )}

        {saving ? (
          <View style={styles.savingRow}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.savingText}>Saving…</Text>
          </View>
        ) : (
          <PrimaryButton
            label="Save to Log"
            hideArrow
            disabled={items.length === 0}
            onPress={() => void handleSave()}
          />
        )}

        <Text style={styles.disclaimer}>
          Estimates only — not medical advice. For managed conditions, consult your doctor or
          dietitian.
        </Text>
      </ScrollView>

      <EditMealItemSheet
        item={editing?.item ?? null}
        onSave={handleItemSave}
        onDelete={handleItemDelete}
        onClose={() => setEditing(null)}
      />
    </SafeAreaView>
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
  headerTitle: { ...Typography.cardTitle, color: Colors.textPrimary },
  headerSpacer: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },

  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.card,
  },
  thumb: { width: 52, height: 52, borderRadius: Radius.tile },
  thumbPlaceholder: {
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealCardText: { flex: 1 },
  mealName: { ...Typography.optionLabel, color: Colors.textPrimary },
  mealTime: { ...Typography.label, color: Colors.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  cardTitle: { ...Typography.cardTitle, color: Colors.textPrimary, marginBottom: Spacing.md },

  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  donut: { width: RING_SIZE, height: RING_SIZE },
  donutLayer: { position: 'absolute', top: 0, left: 0 },
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutValue: { ...Typography.scoreValue, fontSize: 24, color: Colors.textPrimary },
  donutUnit: { ...Typography.label, fontSize: 10, color: Colors.textSecondary },
  legend: { flex: 1, gap: Spacing.md },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legendDot: { width: 8, height: 8, borderRadius: Radius.round },
  legendLabel: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  legendValue: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600' },

  emptyText: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    paddingVertical: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  itemTile: {
    width: 36,
    height: 36,
    borderRadius: Radius.tile,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: { flex: 1 },
  itemName: { ...Typography.caption, fontSize: 14, color: Colors.textPrimary },
  itemServing: { ...Typography.label, color: Colors.textMuted, marginTop: 2 },
  itemCalories: { ...Typography.caption, color: Colors.textSecondary },
  addItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.borderStrong,
  },
  addItemText: { ...Typography.caption, fontSize: 14, color: Colors.primary, fontWeight: '700' },

  totalsRow: { flexDirection: 'row', gap: Spacing.sm },
  totalStat: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSunken,
    paddingVertical: Spacing.md,
  },
  totalValue: { ...Typography.metricValue, color: Colors.textPrimary },
  totalLabel: { ...Typography.label, fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  suggestion: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  suggestionText: { ...Typography.caption, fontSize: 13.5, color: Colors.primaryDark, flex: 1 },

  savingRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  savingText: { ...Typography.secondary, color: Colors.textSecondary },
  disclaimer: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
