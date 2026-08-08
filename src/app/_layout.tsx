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
      <Stack.Screen name="profile" />
      <Stack.Screen name="personal-information" />
      <Stack.Screen name="family" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
