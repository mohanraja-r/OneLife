import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';

import AnimatedPressable from '../../components/AnimatedPressable';
import Avatar from '../../components/Avatar';
import FloatingNav from '../../components/FloatingNav';
import {
  Colors,
  Gradients,
  Spacing,
  Radius,
  Typography,
  Shadow,
} from '../../constants/theme';
import { firstNameOf, useProfileSummary } from '../../services/profile';


// TODO: replace with the real score once it is computed from logged data.
const PLACEHOLDER_HEALTH_SCORE = 82;

export default function HomeScreen() {
  const router = useRouter();
  // One cached read for both the photo and the name the user set on the
  // Personal Information screen.
  const profile = useProfileSummary();
  const healthScore = PLACEHOLDER_HEALTH_SCORE;
  const greetingName = profile ? firstNameOf(profile.name) : '';

  const metrics = [
    { label: 'Steps', value: '7842', unit: 'Steps' },
    { label: 'Sleep', value: '7h', unit: 'Hours' },
    { label: 'BPM', value: '72', unit: 'Heart Rate' },
    { label: 'Calories', value: '392', unit: 'Kcal' },
  ];

  const todaysPlan = [
    {
      id: '1',
      icon: '💊',
      title: 'Morning Medication',
      subtitle: '2 Medicines',
      time: '8:00 AM',
      completed: true,
    },
    {
      id: '2',
      icon: '🍎',
      title: 'Breakfast',
      subtitle: 'Oatmeal with fruits',
      time: 'Completed',
      completed: true,
    },
    {
      id: '3',
      icon: '💧',
      title: 'Drink Water',
      subtitle: '6 of 8 glasses',
      time: '75%',
      completed: false,
    },
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
            <Avatar uri={profile?.avatarUrl ?? null} name={profile?.name} />
            <View>
              <Text style={styles.greetingSubtext}>Good morning,</Text>
              <Text style={styles.greetingName} numberOfLines={1}>
                {greetingName}! 👋
              </Text>
            </View>
          </View>
          {/* Profile lives in the bottom bar now, so the header keeps only
              notifications. */}
          <View style={styles.headerActions}>
            <View style={styles.headerIconButton}>
              <Bell size={18} color={Colors.textSecondary} />
            </View>
          </View>
        </MotiView>

        {/* Health Score Card */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 320, delay: 60 }}
          style={styles.healthScoreCard}>
          <LinearGradient
            colors={Gradients.primary}
            start={Gradients.diagonal.start}
            end={Gradients.diagonal.end}
            style={styles.healthScoreGradient}>
            {/* Score dial. A true arc needs react-native-svg, which isn't a
                dependency yet — this is the ring track plus the numeral. */}
            <View style={styles.ringContainer}>
              <Text style={styles.ringValue}>{healthScore}</Text>
            </View>
            <View style={styles.healthScoreText}>
              <Text style={styles.healthScoreLabel}>Health Score</Text>
              <Text style={styles.healthScoreTitle}>⭐ Excellent</Text>
              <Text style={styles.healthScoreSubtitle}>
                You&apos;re doing great! Keep tracking to maintain your streak.
              </Text>
            </View>
          </LinearGradient>
        </MotiView>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {metrics.map((metric, index) => (
            <MotiView
              key={index}
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'timing',
                duration: 280,
                delay: 120 + index * 40,
              }}
              style={styles.metricCard}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
            </MotiView>
          ))}
        </View>

        {/* Today's Plan */}
        <View style={styles.todaysPlanContainer}>
          <View style={styles.todaysPlanHeader}>
            <Text style={styles.todaysPlanTitle}>Today&apos;s Plan</Text>
            <AnimatedPressable onPress={() => router.push('/(tabs)/planner')}>
              <Text style={styles.viewAllLink}>View all</Text>
            </AnimatedPressable>
          </View>

          {todaysPlan.map((item, index) => (
            <MotiView
              key={item.id}
              from={{ opacity: 0, translateX: -12 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: 'timing',
                duration: 260,
                delay: 160 + index * 50,
              }}
              style={styles.planItem}>
              <View style={styles.planItemIconContainer}>
                <Text style={styles.planItemIcon}>{item.icon}</Text>
              </View>
              <View style={styles.planItemContent}>
                <Text style={styles.planItemTitle}>{item.title}</Text>
                <Text style={styles.planItemSubtitle}>{item.subtitle}</Text>
              </View>
              <Text
                style={[
                  styles.planItemTime,
                  item.completed && styles.planItemTimeDone,
                ]}>
                {item.time}
              </Text>
              {item.completed && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </MotiView>
          ))}
        </View>

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
    marginBottom: Spacing.xxl,
  },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  greetingSubtext: {
    ...Typography.secondary,
    color: Colors.textSecondary,
  },
  greetingName: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthScoreCard: {
    marginBottom: Spacing.xl,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.glow,
  },
  healthScoreGradient: {
    flexDirection: 'row',
    gap: Spacing.lg,
    padding: Spacing.xl,
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
  ringValue: {
    ...Typography.scoreValue,
    color: Colors.onPrimary,
  },
  healthScoreText: {
    flex: 1,
    justifyContent: 'center',
  },
  healthScoreLabel: {
    ...Typography.label,
    color: Colors.onPrimaryMuted,
    marginBottom: Spacing.xs,
  },
  healthScoreTitle: {
    ...Typography.cardTitle,
    color: Colors.onPrimary,
    marginBottom: Spacing.sm,
  },
  healthScoreSubtitle: {
    ...Typography.secondary,
    color: Colors.onPrimaryMuted,
    lineHeight: 22,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.card,
  },
  metricLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  metricValue: {
    ...Typography.largeNumber,
    color: Colors.textPrimary,
  },
  todaysPlanContainer: {
    marginBottom: Spacing.xl,
  },
  todaysPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  todaysPlanTitle: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
  },
  viewAllLink: {
    ...Typography.secondary,
    color: Colors.primary,
    fontWeight: '600',
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  planItemIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.tile,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planItemIcon: {
    fontSize: 22,
  },
  planItemContent: {
    flex: 1,
  },
  planItemTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  planItemSubtitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  planItemTime: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  planItemTimeDone: {
    color: Colors.success,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
});
