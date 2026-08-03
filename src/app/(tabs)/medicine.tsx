import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import {
  DoseLogEntry,
  getAllMedicines,
  getTodaysDoses,
  markDoseTaken,
  Medicine,
} from '../../services/medicine';
export default function MedicineScreen() {
  const [doses, setDoses] = useState<DoseLogEntry[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [todaysDoses, allMedicines] = await Promise.all([
        getTodaysDoses(),
        getAllMedicines(),
      ]);
      setDoses(todaysDoses);
      setMedicines(allMedicines);
    } catch (err: any) {
      Alert.alert(
        'Error loading medicines',
        err.message ?? 'Something went wrong',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload every time this tab gains focus, so a medicine added elsewhere
  // (or a dose marked taken) is always reflected.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const handleMarkTaken = async (doseId: string) => {
    try {
      await markDoseTaken(doseId);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not mark as taken');
    }
  };

  const showAddOptions = () => {
    Alert.alert('Add medicine', 'How would you like to add it?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Scan prescription',
        onPress: () => router.push('/scan-prescription'),
      },
      { text: 'Add manually', onPress: () => router.push('/add-medicine') },
    ]);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

  const doseStatusLabel = (dose: DoseLogEntry) => {
    if (dose.status === 'taken')
      return `Taken at ${formatTime(dose.taken_at!)}`;
    if (dose.status === 'missed')
      return `Missed · was due ${formatTime(dose.scheduled_for)}`;
    return `Due ${formatTime(dose.scheduled_for)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Medicine" />
      <View style={styles.header}>
        <Text style={styles.title}>Medicines</Text>
        <TouchableOpacity style={styles.addButton} onPress={showAddOptions}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
          />
        }
      >
        <Text style={styles.sectionTitle}>Today</Text>
        {loading && <Text style={styles.placeholder}>Loading...</Text>}
        {!loading && doses.length === 0 && (
          <Text style={styles.placeholder}>No doses scheduled today.</Text>
        )}
        {doses.map((dose) => (
          <View
            key={dose.id}
            style={[
              styles.doseCard,
              dose.status === 'taken' && styles.doseCardTaken,
              dose.status === 'missed' && styles.doseCardMissed,
            ]}
          >
            <View style={styles.doseIcon}>
              <Text style={{ fontSize: 16 }}>💊</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.doseName}>
                {dose.medicines?.name} — {dose.medicines?.dosage}
              </Text>
              <Text style={styles.doseSubtext}>{doseStatusLabel(dose)}</Text>
            </View>
            {dose.status === 'pending' && (
              <TouchableOpacity
                style={styles.markTakenButton}
                onPress={() => handleMarkTaken(dose.id)}
              >
                <Text style={styles.markTakenText}>Mark taken</Text>
              </TouchableOpacity>
            )}
            {dose.status === 'taken' && <Text style={styles.checkmark}>✓</Text>}
          </View>
        ))}

        <Text style={styles.sectionTitle}>
          All medicines ({medicines.length})
        </Text>
        {medicines.map((med) => (
          <TouchableOpacity
            key={med.id}
            style={[
              styles.medicineCard,
              !med.active && styles.medicineCardInactive,
            ]}
            onPress={() =>
              router.push({
                pathname: '/add-medicine',
                params: { medicineId: med.id },
              })
            }
          >
            <View style={styles.medicineHeader}>
              <Text style={styles.medicineName}>{med.name}</Text>
              <View
                style={[
                  styles.statusBadge,
                  med.active
                    ? styles.statusBadgeActive
                    : styles.statusBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    med.active
                      ? styles.statusBadgeTextActive
                      : styles.statusBadgeTextInactive,
                  ]}
                >
                  {med.active ? 'Active' : 'Completed'}
                </Text>
              </View>
            </View>
            <Text style={styles.medicineDetail}>
              {med.dosage} · {med.frequency}
            </Text>
            <Text style={styles.medicineDetail}>
              {med.times.join(', ')} ·{' '}
              {med.food_relation === 'any'
                ? 'Any time'
                : `${med.food_relation} food`}
            </Text>
            <Text style={styles.medicineDetailMuted}>
              {med.duration_type === 'ongoing'
                ? 'Ongoing'
                : `Ends ${med.duration_end_date}`}
            </Text>
          </TouchableOpacity>
        ))}
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
  title: { ...Typography.heading, color: Colors.textPrimary },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: { color: 'white', fontSize: 18, lineHeight: 20 },
  content: { padding: Spacing.md },
  sectionTitle: {
    ...Typography.heading,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  placeholder: { color: Colors.textMuted, fontSize: 13 },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  doseCardTaken: { backgroundColor: '#F0F9F4' },
  doseCardMissed: { backgroundColor: Colors.warningBg },
  doseIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.medicineAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doseName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  doseSubtext: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  markTakenButton: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
  },
  markTakenText: { color: 'white', fontSize: 11, fontWeight: '600' },
  checkmark: { color: Colors.accent, fontSize: 16, fontWeight: '700' },
  medicineCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  medicineCardInactive: { opacity: 0.55 },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  medicineName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  statusBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  statusBadgeActive: { backgroundColor: Colors.accentLight },
  statusBadgeInactive: { backgroundColor: '#EFEEE8' },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },
  statusBadgeTextActive: { color: '#0F6E56' },
  statusBadgeTextInactive: { color: Colors.textSecondary },
  medicineDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  medicineDetailMuted: { fontSize: 12, color: Colors.textMuted },
});
