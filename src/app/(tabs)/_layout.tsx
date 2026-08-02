import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../../constants/theme';

// Bottom tab bar — exactly 5 items per the approved UX: Home, Medicine,
// Planner, Health. Women's Health is added conditionally later once we wire
// up the user's profile (only shown if gender === 'woman'). Family and
// Profile live in a top-header menu, not here — see home.tsx.
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="medicine"
        options={{
          title: 'Medicine',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💊</Text>,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planner',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>❤️</Text>,
        }}
      />
    </Tabs>
  );
}
