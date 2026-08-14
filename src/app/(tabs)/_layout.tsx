import { Tabs } from 'expo-router';

// Tab navigator for the main destinations. The built-in tab bar is hidden
// because navigation is rendered by the shared <FloatingNav /> pill inside
// each screen — keeping both would show two footer menus. The Tabs navigator
// itself stays so switching destinations swaps screens instead of pushing them
// onto a stack.
//
// `women` is registered but is not in the bottom bar: it is reached from the
// Women's Health row on the Profile screen, which only users whose profile
// gender is `woman` see. The screen itself redirects anyone else who reaches
// the route directly.
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="health" />
      <Tabs.Screen name="medicine" />
      <Tabs.Screen name="planner" />
      <Tabs.Screen name="women" />
    </Tabs>
  );
}
