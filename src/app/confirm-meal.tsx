import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { saveMeal, MealItem, calculateMealTotals } from '../services/meals';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

export default function ConfirmMealScreen() {
  const params = useLocalSearchParams<{
    photoUri?: string;
    items: string;
    suggestion: string;
    source: 'photo' | 'manual';
  }>();

  const [items, setItems] = useState<MealItem[]>(() => {
    try {
      return JSON.parse(params.items ?? '[]');
    } catch {
      return [];
    }
  });
  const [saving, setSaving] = useState(false);

  const totals = calculateMealTotals({ items } as any);

  const updateItemName = (index: number, name: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], name };
    setItems(updated);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

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
    } catch (err: any) {
      Alert.alert('Error saving meal', err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm meal</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {params.photoUri ? (
          <Image source={{ uri: params.photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={{ fontSize: 40 }}>🍽️</Text>
          </View>
        )}

        <Text style={styles.label}>We think this is</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <TextInput
              style={styles.itemNameInput}
              value={item.name}
              onChangeText={(v) => updateItemName(index, v)}
            />
            <Text style={styles.itemCalories}>{item.calories} kcal</Text>
            <TouchableOpacity onPress={() => removeItem(index)}>
              <Text style={styles.removeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.macrosRow}>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{totals.calories}</Text>
            <Text style={styles.macroLabel}>kcal</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{totals.protein}g</Text>
            <Text style={styles.macroLabel}>protein</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{totals.carbs}g</Text>
            <Text style={styles.macroLabel}>carbs</Text>
          </View>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>{totals.fat}g</Text>
            <Text style={styles.macroLabel}>fat</Text>
          </View>
        </View>

        {params.suggestion && (
          <View style={styles.suggestionBox}>
            <Text style={styles.suggestionText}>✓ {params.suggestion}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, (items.length === 0 || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={items.length === 0 || saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save to log'}</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Estimates only — not medical advice. For managed conditions, consult your doctor or dietitian.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  headerTitle: { ...Typography.heading, color: Colors.textPrimary },
  back: { fontSize: 28, color: Colors.textPrimary, lineHeight: 28 },
  content: { padding: Spacing.md },
  photo: { width: '100%', height: 160, borderRadius: Radius.lg, marginBottom: Spacing.md },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  label: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.sm },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm + 4,
    marginBottom: Spacing.sm,
  },
  itemNameInput: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  itemCalories: { fontSize: 12, color: Colors.textSecondary },
  removeIcon: { color: Colors.textMuted, fontSize: 14, paddingHorizontal: Spacing.xs },
  macrosRow: { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.md },
  macroBox: { flex: 1, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, padding: Spacing.sm + 2, alignItems: 'center' },
  macroValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  macroLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  suggestionBox: { backgroundColor: Colors.accentLight, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.md },
  suggestionText: { fontSize: 12.5, color: '#0F6E56', fontWeight: '600' },
  saveButton: { backgroundColor: Colors.textPrimary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { color: 'white', fontSize: 15, fontWeight: '600' },
  disclaimer: { fontSize: 10.5, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },
});
