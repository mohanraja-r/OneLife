import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { LucideIcon } from 'lucide-react-native';
import {
  ChevronRight,
  Clock,
  Droplet,
  Fish,
  Leaf,
  PauseCircle,
  Pill,
  Plus,
  Search,
  Shield,
  Sun,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AddMedicineSheet from '../components/AddMedicineSheet';
import AnimatedPressable from '../components/AnimatedPressable';
import AppHeader from '../components/AppHeader';
import {
  ChipOption,
  ChipRow,
  EmptyState,
  ErrorNotice,
  LoadingState,
} from '../components/ui';
import {
  Accent,
  Accents,
  Colors,
  Gradients,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
  accentShadow,
} from '../constants/theme';
import { errorMessage } from '../services/errors';
import {
  Medicine,
  formatTimeLabel,
  getAllMedicines,
} from '../services/medicine';

type Filter = 'all' | 'active' | 'paused';

const FILTERS: ChipOption<Filter>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
];

/** Name fragments that earn a medicine its own icon and accent in the list. */
const GLYPHS: { match: string[]; icon: LucideIcon; accent: Accent }[] = [
  { match: ['vitamin d', 'vitamin-d', 'd3'], icon: Sun, accent: Accents.amber },
  { match: ['omega', 'fish oil'], icon: Fish, accent: Accents.blue },
  { match: ['probiotic', 'herbal'], icon: Leaf, accent: Accents.green },
  { match: ['multivitamin', 'multi'], icon: Shield, accent: Accents.violet },
  { match: ['iron', 'folic', 'b12'], icon: Droplet, accent: Accents.rose },
];

const FALLBACK_ACCENTS: Accent[] = [
  Accents.violet,
  Accents.blue,
  Accents.green,
  Accents.orange,
  Accents.pink,
];

/** Picks the icon and accent a medicine is drawn with, from its name. */
function glyphFor(
  name: string,
  index: number
): { icon: LucideIcon; accent: Accent } {
  const lower = name.toLowerCase();
  const hit = GLYPHS.find((glyph) =>
    glyph.match.some((term) => lower.includes(term))
  );
  if (hit) return { icon: hit.icon, accent: hit.accent };

  return {
    icon: Pill,
    accent: FALLBACK_ACCENTS[index % FALLBACK_ACCENTS.length],
  };
}

export default function MedicinesScreen() {
  const insets = useSafeAreaInsets();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  /** Loads every medicine the user owns, active or paused. */
  const load = useCallback(async () => {
    try {
      setError(null);
      setMedicines(await getAllMedicines());
    } catch (err) {
      setError(
        errorMessage(err, 'Could not load your medicines.')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Reloading on focus keeps the list correct after an edit or a delete.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return medicines.filter((med) => {
      if (filter === 'active' && !med.active) return false;
      if (filter === 'paused' && med.active) return false;
      if (!term) return true;
      return (
        med.name.toLowerCase().includes(term) ||
        med.dosage.toLowerCase().includes(term)
      );
    });
  }, [medicines, query, filter]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* This screen draws under the status bar, so the inset lands here
          rather than on a SafeAreaView. */}
      <View style={{ paddingTop: insets.top }}>
        <AppHeader title="My Medicines" />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.searchField}>
          <Search size={18} color={Colors.textMuted} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
        </View>

        <ChipRow
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          style={styles.chipRow}
        />

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorNotice message={error} onRetry={() => void load()} />
        ) : visible.length > 0 ? (
          visible.map((med, index) => {
            const { icon: Icon, accent } = glyphFor(med.name, index);
            return (
              <MotiView
                key={med.id}
                from={{ opacity: 0, translateX: -12 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{
                  type: 'timing',
                  duration: Motion.fast,
                  delay: Motion.enterDelay + index * Motion.stagger,
                }}>
                <AnimatedPressable
                  onPress={() =>
                    router.push({
                      pathname: '/add-medicine',
                      params: { medicineId: med.id },
                    })
                  }
                  style={styles.row}>
                  <View style={[styles.tile, { backgroundColor: accent.tint }]}>
                    <Icon size={20} color={accent.main} strokeWidth={2} />
                  </View>

                  <View style={styles.rowText}>
                    <View style={styles.rowTitleLine}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {med.name}
                      </Text>
                      {!med.active && (
                        <View style={styles.pausedBadge}>
                          <PauseCircle
                            size={11}
                            color={Colors.textSecondary}
                            strokeWidth={2.4}
                          />
                          <Text style={styles.pausedText}>Paused</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rowSubtitle} numberOfLines={1}>
                      {[med.dosage, med.frequency].filter(Boolean).join(' · ')}
                    </Text>
                    <View style={styles.rowTimes}>
                      <Clock
                        size={12}
                        color={Colors.primary}
                        strokeWidth={2.2}
                      />
                      <Text style={styles.rowTimesText} numberOfLines={1}>
                        {med.times.length
                          ? med.times.map(formatTimeLabel).join(', ')
                          : 'No reminders set'}
                      </Text>
                    </View>
                  </View>

                  <ChevronRight size={20} color={Colors.textMuted} />
                </AnimatedPressable>
              </MotiView>
            );
          })
        ) : (
          <EmptyState
            icon={Pill}
            title={medicines.length ? 'Nothing matches' : 'No medicines yet'}
            subtitle={
              medicines.length
                ? 'Try a different search or filter.'
                : 'Scan a prescription or add one by hand to get started.'
            }
          />
        )}

        <Text style={styles.hint}>
          Tap a medicine to edit its dose, reminders or duration — or to delete
          it.
        </Text>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <AnimatedPressable
          onPress={() => setSheetOpen(true)}
          style={styles.addButton}>
          <LinearGradient
            colors={Gradients.primary}
            start={Gradients.horizontal.start}
            end={Gradients.horizontal.end}
            style={styles.addButtonFill}>
            <Plus size={20} color={Colors.textInverse} strokeWidth={2.4} />
            <Text style={styles.addButtonText}>Add Medicine</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>

      <AddMedicineSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onScan={() => router.push('/scan-prescription')}
        onManual={() => router.push('/add-medicine')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  searchInput: {
    ...Typography.body,
    fontSize: 15,
    flex: 1,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  chipRow: { marginBottom: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: Radius.tile,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { flex: 1 },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowTitle: {
    ...Typography.optionLabel,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.round,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  pausedText: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  rowSubtitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rowTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginTop: Spacing.xs + 2,
  },
  rowTimesText: {
    ...Typography.label,
    color: Colors.primary,
    flex: 1,
  },
  hint: {
    ...Typography.label,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  footer: {
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
    ...Shadow.floating,
  },
  addButton: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...accentShadow(Accents.violet.main),
  },
  addButtonFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg + 2,
  },
  addButtonText: {
    ...Typography.button,
    color: Colors.textInverse,
  },
});
