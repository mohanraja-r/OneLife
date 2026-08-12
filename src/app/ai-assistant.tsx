import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '../constants/theme';

// Full chat interface is built in its own phase (Phase G). Placeholder for
// now so the header's AI icon has somewhere to go.
export default function AIAssistantScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.placeholder}>AI Assistant chat — coming in Phase G.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.md, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
});
