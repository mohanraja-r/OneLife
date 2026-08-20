import { Stack } from 'expo-router';
import type { JSX } from 'react';

// `index` must stay the stack's initial route: it is the boot screen that
// decides between onboarding and the tabs. Without this the first
// <Stack.Screen> declared below would become the initial route and the app
// would launch into that screen instead.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout(): JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="add-medicine" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="scan-prescription"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="ai-assistant" options={{ presentation: 'modal' }} />
      <Stack.Screen name="log-meal" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="log-meal-manual"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="confirm-meal" options={{ presentation: 'modal' }} />
      {/* <Stack.Screen name="add-task" options={{ presentation: 'modal' }} /> */}
      <Stack.Screen name="medicines" />
      <Stack.Screen name="personal-information" />
      <Stack.Screen name="medical-information" />
      <Stack.Screen name="add-allergy" options={{ presentation: 'modal' }} />
      <Stack.Screen name="medical-entry" options={{ presentation: 'modal' }} />
      <Stack.Screen name="family" />
      <Stack.Screen name="family-members" />
      <Stack.Screen name="family-member" />
      <Stack.Screen name="add-family-member" />
      <Stack.Screen name="join-family" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="pregnancy" />
    </Stack>
  );
}
