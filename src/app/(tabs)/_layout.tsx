import { Tabs } from 'expo-router';

// Tab navigator for the main destinations. The built-in tab bar is hidden
// because navigation is rendered by the shared <FloatingNav /> pill inside
// each screen — keeping both would show two footer menus. The Tabs navigator
// itself stays so switching destinations swaps screens instead of pushing them
// onto a stack.
//
// `women` is registered for everyone: FloatingNav only offers it to users whose
// profile gender is `woman`, and the screen itself redirects anyone else who
// reaches the route directly.
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="medicine" />
      <Tabs.Screen name="health" />
      <Tabs.Screen name="planner" />
      <Tabs.Screen name="women" />
    </Tabs>
  );
}
