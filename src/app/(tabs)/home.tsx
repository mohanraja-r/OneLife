import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import { getTodaysMeals, getFrequentMeals, saveMeal, calculateMealTotals, Meal } from '../../services/meals';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';

// Visual refresh only — all data logic below is unchanged from the prior
// version. Only styling changed: glass cards, circular score ring, floating
// nav means extra bottom padding, purple palette via theme.ts.
export default function HomeScreen() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [frequentMeals, setFrequentMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [todaysMeals, frequent] = await Promise.all([getTodaysMeals(), getFrequentMeals()]);
      setMeals(todaysMeals);
      setFrequentMeals(frequent);
    } catch (err) {
      console.warn('Failed to load nutrition data:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const totals = meals.reduce(
    (acc, meal) => {
      const t = calculateMealTotals(meal);
      return {
        calories: acc.calories + t.calories,
        protein: acc.protein + t.protein,
        carbs: acc.carbs + t.carbs,
        fat: acc.fat + t.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const dailyTarget = 1800; // TODO: pull from profiles.daily_calorie_target
  const progress = Math.min(totals.calories / dailyTarget, 1);
  const scoreOutOf100 = Math.round(progress * 100);

  const handleQuickAdd = async (meal: Meal) => {
    try {
      await saveMeal({
        source: 'quickadd',
        items: meal.items,
        aiSuggestion: meal.ai_suggestion,
      });
      loadData();
    } catch (err) {
      console.warn('Quick add failed:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.chatBar} onPress={() => router.push('/ai-assistant')}>
          <Text style={styles.chatBarText}>Ask OneLife anything...</Text>
        </TouchableOpacity>

        {/* Health score card — circular ring replaces the flat bar */}
        <View style={[styles.scoreCard, Shadows.card]}>
          <View style={styles.scoreRing}>
            <Text style={styles.scoreValue}>{scoreOutOf100}</Text>
            <Text style={styles.scoreOutOf}>/100</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Today's intake</Text>
            <Text style={styles.calorieText}>
              {totals.calories} <Text style={styles.calorieTarget}>/ {dailyTarget} kcal</Text>
            </Text>
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{totals.protein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{totals.carbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{totals.fat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Logged today</Text>
        {loading && <Text style={styles.placeholderNote}>Loading...</Text>}
        {!loading && meals.length === 0 && (
          <Text style={styles.placeholderNote}>No meals logged yet today.</Text>
        )}
        {meals.map((meal) => {
          const t = calculateMealTotals(meal);
          const time = new Date(meal.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return (
            <View key={meal.id} style={[styles.mealRow, Shadows.card]}>
              <View style={styles.mealIcon}>
                <Text style={{ fontSize: 14 }}>🍛</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealName}>{meal.items.map((i) => i.name).join(', ')}</Text>
                <Text style={styles.mealTime}>{time}</Text>
              </View>
              <Text style={styles.mealCalories}>{t.calories} kcal</Text>
            </View>
          );
        })}

        {frequentMeals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Quick add — your usual meals</Text>
            {frequentMeals.map((meal) => {
              const t = calculateMealTotals(meal);
              return (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.quickAddRow}
                  onPress={() => handleQuickAdd(meal)}
                >
                  <Text style={styles.quickAddName}>{meal.items.map((i) => i.name).join(', ')}</Text>
                  <Text style={styles.quickAddCalories}>~{t.calories} kcal</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, Shadows.floating]} onPress={() => router.push('/log-meal')}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: 120 }, // extra room for floating nav
  chatBar: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chatBarText: { color: Colors.textMuted, ...Typography.body },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  scoreRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 6,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.accentLight,
  },
  scoreValue: { fontSize: 20, fontWeight: '800', color: Colors.accent, lineHeight: 22 },
  scoreOutOf: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  cardLabel: { color: Colors.textSecondary, ...Typography.caption },
  calorieText: { ...Typography.title, color: Colors.textPrimary, marginTop: Spacing.xs, marginBottom: Spacing.sm },
  calorieTarget: { fontSize: 13, color: Colors.textSecondary, fontWeight: '400' },
  macroRow: { flexDirection: 'row', gap: Spacing.md },
  macroItem: { alignItems: 'flex-start' },
  macroValue: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  macroLabel: { fontSize: 10, color: Colors.textMuted },
  sectionTitle: { ...Typography.heading, fontSize: 13, color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.md },
  placeholderNote: { color: Colors.textMuted, fontSize: 13 },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm + 2,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  mealIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: Colors.medicineBg, justifyContent: 'center', alignItems: 'center' },
  mealName: { fontSize: 12.5, fontWeight: '600', color: Colors.textPrimary },
  mealTime: { fontSize: 10, color: Colors.textMuted },
  mealCalories: { fontSize: 11, color: Colors.textSecondary },
  quickAddRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm + 2,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.sm,
  },
  quickAddName: { fontSize: 12.5, color: Colors.textPrimary, flex: 1 },
  quickAddCalories: { fontSize: 10.5, color: Colors.textMuted },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: { color: 'white', fontSize: 28, lineHeight: 28 },
});
