import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request permission once, typically on app start or right before the first
// medicine is added. Safe to call repeatedly — it's a no-op if already granted.
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Schedules a repeating daily local notification for one medicine time.
// This is the "Option 3" approach from our tech-stack discussion — personal
// reminders live entirely on-device, no server round-trip needed. Family/
// caregiver missed-dose alerts are a separate, server-side path (Phase E).
export async function scheduleMedicineReminder(
  medicineName: string,
  dosage: string,
  time: string // "HH:MM"
): Promise<string> {
  const [hour, minute] = time.split(':').map(Number);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Time for ${medicineName}`,
      body: `${dosage} · Tap to mark as taken`,
      data: { type: 'medicine_reminder', medicineName },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
      channelId: Platform.OS === 'android' ? 'medicine-reminders' : undefined,
    },
  });

  return identifier; // store this alongside the medicine if you want to cancel/edit it later
}

export async function cancelReminder(identifier: string) {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

// Android requires an explicit notification channel for reminders to behave
// well (sound, importance level). Call once on app start.
export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medicine-reminders', {
      name: 'Medicine Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}
