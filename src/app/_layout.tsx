import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
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
