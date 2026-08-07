import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Check, Plus } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getMedicinesForToday, markDoseTaken } from '../../services/medicine';
import AnimatedPressable from '../../components/AnimatedPressable';
import FloatingNav from '../../components/FloatingNav';
import {
  Colors,
  Gradients,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  icon: string;
}

export default function MedicineScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('Alex');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [nextMedicine, setNextMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadMedicines();
    }, [])
  );

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const data = await getMedicinesForToday();
      if (data.length > 0) {
        setMedicines(data);
        // Find next medicine (first untaken or first if all taken)
        const next = data.find((m) => !m.taken) || data[0];
        setNextMedicine(next);
      }
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeMedicine = async (id: string) => {
    try {
      await markDoseTaken(id, true);
      await loadMedicines();
    } catch (err) {
      console.error('Failed to mark medicine taken:', err);
    }
  };

  const handleAddMedicine = () => {
    router.push('/add-medicine');
  };

  const stats = [
    { label: 'On Track', value: '85%' },
    { label: 'Medicines', value: medicines.length.toString() },
    { label: 'This Week', value: (medicines.length * 7).toString() },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={styles.header}>
          <View style={styles.greeting}>
            <LinearGradient
              colors={Gradients.avatar}
              start={Gradients.diagonal.start}
              end={Gradients.diagonal.end}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.greetingSubtext}>Good morning,</Text>
              <Text style={styles.greetingName}>{userName}!</Text>
            </View>
          </View>
          <View style={styles.notificationBell}>
            <Bell size={18} color={Colors.textSecondary} />
          </View>
        </MotiView>

        {/* Next Medicine Card */}
        {nextMedicine && (
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 320, delay: 60 }}
            style={styles.nextMedicineCard}>
            <LinearGradient
              colors={Gradients.primary}
              start={Gradients.diagonal.start}
              end={Gradients.diagonal.end}
              style={styles.nextMedicineGradient}>
              <View style={styles.nextMedicineContent}>
                <Text style={styles.nextMedicineLabel}>Next Medicine</Text>
                <Text style={styles.nextMedicineTime}>{nextMedicine.time}</Text>
                <Text style={styles.nextMedicineName}>{nextMedicine.name}</Text>
                <TouchableOpacity
                  style={styles.takeNowButton}
                  onPress={() => handleTakeMedicine(nextMedicine.id)}>
                  <Text style={styles.takeNowButtonText}>Take Now</Text>
                </TouchableOpacity>
              </View>
              {/* Dose dial. A true arc needs react-native-svg, which isn't a
                  dependency yet — this is the ring track plus the glyph. */}
              <View style={styles.ringContainer}>
                <Text style={styles.ringGlyph}>💊</Text>
              </View>
            </LinearGradient>
          </MotiView>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <MotiView
              key={index}
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'timing',
                duration: 280,
                delay: 120 + index * 40,
              }}
              style={styles.statCard}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </MotiView>
          ))}
        </View>

        {/* Today's Schedule */}
        <View style={styles.scheduleContainer}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTitle}>Today's Schedule</Text>
            <Text style={styles.viewAllLink}>View all</Text>
          </View>

          {medicines.length > 0 ? (
            <View>
              {medicines.map((medicine, index) => (
                <MotiView
                  key={medicine.id}
                  from={{ opacity: 0, translateX: -12 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{
                    type: 'timing',
                    duration: 260,
                    delay: 160 + index * 50,
                  }}
                  style={styles.medicineItem}>
                  <Text style={styles.medicineTime}>{medicine.time}</Text>
                  <View style={styles.medicineIconContainer}>
                    <Text style={styles.medicineIcon}>{medicine.icon}</Text>
                  </View>
                  <View style={styles.medicineContent}>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                    <Text style={styles.medicineDosage}>{medicine.dosage}</Text>
                  </View>
                  <AnimatedPressable
                    onPress={() => handleTakeMedicine(medicine.id)}
                    style={[
                      styles.medicineCheckbox,
                      medicine.taken && styles.medicineCheckboxDone,
                    ]}>
                    {medicine.taken && (
                      <Check size={13} color="white" strokeWidth={3} />
                    )}
                  </AnimatedPressable>
                </MotiView>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No medicines scheduled for today
              </Text>
            </View>
          )}
        </View>

        {/* Add Medicine Button */}
        <AnimatedPressable
          onPress={handleAddMedicine}
          style={styles.addMedicineButton}>
          <Plus size={20} color="white" strokeWidth={2} />
          <Text style={styles.addMedicineButtonText}>Add Medicine</Text>
        </AnimatedPressable>

        {/* Spacer for floating nav */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Nav */}
      <FloatingNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  greetingSubtext: {
    ...Typography.secondary,
    color: Colors.textSecondary,
  },
  greetingName: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
  },
  notificationBell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextMedicineCard: {
    marginBottom: Spacing.xl,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  nextMedicineGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  nextMedicineContent: {
    flex: 1,
  },
  nextMedicineLabel: {
    ...Typography.label,
    color: Colors.onPrimaryMuted,
    marginBottom: Spacing.xs,
  },
  nextMedicineTime: {
    ...Typography.largeHero,
    color: Colors.onPrimary,
    marginBottom: Spacing.xs,
  },
  nextMedicineName: {
    ...Typography.secondary,
    color: Colors.onPrimaryMuted,
    marginBottom: Spacing.md,
  },
  takeNowButton: {
    backgroundColor: Colors.onPrimary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignSelf: 'flex-start',
  },
  takeNowButtonText: {
    ...Typography.button,
    color: Colors.primary,
  },
  ringContainer: {
    width: 70,
    height: 70,
    borderRadius: Radius.round,
    borderWidth: 6,
    borderColor: Colors.onPrimaryFaint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringGlyph: {
    fontSize: 26,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.card,
  },
  statLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  statValue: {
    ...Typography.largeNumber,
    color: Colors.textPrimary,
    fontSize: 28,
  },
  scheduleContainer: {
    marginBottom: Spacing.xl,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  scheduleTitle: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
  },
  viewAllLink: {
    ...Typography.secondary,
    color: Colors.primary,
    fontWeight: '600',
  },
  medicineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  medicineTime: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '600',
    minWidth: 60,
  },
  medicineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.tile,
    backgroundColor: Colors.medicationTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicineIcon: {
    fontSize: 18,
  },
  medicineContent: {
    flex: 1,
  },
  medicineName: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  medicineDosage: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  medicineCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicineCheckboxDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  addMedicineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    ...Shadow.card,
  },
  addMedicineButtonText: {
    ...Typography.button,
    color: 'white',
  },
});
