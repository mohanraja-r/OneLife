import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import { Colors, Spacing, Typography } from '../../constants/theme';
export default function PlannerScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Planner" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    height: 52,
    justifyContent: 'center',
  },
  title: { ...Typography.heading, color: Colors.textPrimary },
  content: { flex: 1, padding: Spacing.md },
  placeholder: { color: Colors.textMuted, fontSize: 14 },
});
