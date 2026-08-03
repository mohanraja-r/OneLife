import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// SDK 53+ removed remote push notification support from Expo Go entirely on
// Android (local/scheduled notifications are also flaky there). Rather than
// crash, we detect Expo Go and no-op notification calls with a console
// warning — the app stays usable, and a real dev build (see Phase J /
// EAS build setup) will get full notification support without code changes.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGo && Platform.OS === 'android') {
    console.warn(
      'Notifications unavailable in Expo Go on Android (SDK 53+). Use a dev build.',
    );
    return false;
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Notification permission request failed:', err);
    return false;
  }
}

export async function scheduleMedicineReminder(
  medicineName: string,
  dosage: string,
  time: string,
): Promise<string | null> {
  if (isExpoGo && Platform.OS === 'android') {
    console.warn(
      `Skipped scheduling reminder for ${medicineName} — unavailable in Expo Go on Android.`,
    );
    return null;
  }

  try {
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

    return identifier;
  } catch (err) {
    console.warn('Failed to schedule reminder:', err);
    return null;
  }
}

export async function cancelReminder(identifier: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (err) {
    console.warn('Failed to cancel reminder:', err);
  }
}

export async function setupNotificationChannel() {
  if (Platform.OS === 'android' && !isExpoGo) {
    try {
      await Notifications.setNotificationChannelAsync('medicine-reminders', {
        name: 'Medicine Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    } catch (err) {
      console.warn('Failed to set up notification channel:', err);
    }
  }
}
