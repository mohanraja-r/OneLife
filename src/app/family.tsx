import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader';
import { Colors, Spacing } from '../constants/theme';

// Full Family/caregiver mode is built in Phase E. This placeholder keeps
// navigation working from the header menu in the meantime.
export default function FamilyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Family" showBack />
      <View style={styles.content}>
        <Text style={styles.placeholder}>Family &amp; caregiver mode — coming in Phase E.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.md, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
});
