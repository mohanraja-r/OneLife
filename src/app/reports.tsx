import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import { Colors, Spacing } from '../constants/theme';

export default function ReportsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Reports & exports" showBack />
      <View style={styles.content}>
        <Text style={styles.placeholder}>Health report exports — coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.md, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
});
