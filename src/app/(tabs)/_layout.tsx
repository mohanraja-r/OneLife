import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { Colors, Radius, Shadows } from '../../constants/theme';

// Bottom tab bar — same 4 destinations as before (Home, Medicine, Planner,
// Health), restyled as a floating rounded pill matching the reference
// design instead of the standard edge-to-edge bar. Women's Health is added
// conditionally elsewhere once wired to the user's profile. Family and
// Profile stay reachable via the header, not this bar.
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
        tabBarShowLabel: true,
        tabBarStyle: [styles.floatingBar, Shadows.floating],
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveBackgroundColor: 'transparent',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Text style={{ fontSize: 18 }}>🏠</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="medicine"
        options={{
          title: 'Medicine',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Text style={{ fontSize: 18 }}>💊</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Text style={{ fontSize: 18 }}>❤️</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planner',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Text style={{ fontSize: 18 }}>📅</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    height: 66,
    borderRadius: Radius.pill,
    backgroundColor: Colors.navFloatingBg,
    borderTopWidth: 0,
    paddingBottom: 0,
    paddingTop: 0,
  },
  tabItem: {
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});
