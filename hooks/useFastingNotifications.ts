import { useEffect, useRef, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Notification definitions with fixed identifiers
const FASTING_NOTIFICATIONS = [
  {
    id: 'fast-almost',
    hour: 10,
    minute: 0,
    title: 'Almost there!',
    body: '2 hours left in your fast',
  },
  {
    id: 'fast-complete',
    hour: 12,
    minute: 0,
    title: 'Fast complete!',
    body: '18 hours done. Time to fuel up!',
  },
  {
    id: 'feeding-mid',
    hour: 15,
    minute: 0,
    title: 'Mid-feeding check',
    body: 'Log your food and take supplements',
  },
  {
    id: 'feeding-closed',
    hour: 18,
    minute: 0,
    title: 'Feeding window closed',
    body: 'Stay strong until noon tomorrow',
  },
] as const;

const CHANNEL_ID = 'fasting-reminders';

async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Fasting Reminders',
      description: 'Daily notifications for your fasting schedule',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }
}

async function cancelExistingFastingNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (FASTING_NOTIFICATIONS.some((n) => n.id === notification.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

async function scheduleAllNotifications() {
  for (const notification of FASTING_NOTIFICATIONS) {
    await Notifications.scheduleNotificationAsync({
      identifier: notification.id,
      content: {
        title: notification.title,
        body: notification.body,
        data: { type: 'fasting', notificationId: notification.id },
        ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: notification.hour,
        minute: notification.minute,
      },
    });
  }
}

export function FastingNotificationProvider({ children }: { children: ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const setup = async () => {
      try {
        await setupNotificationChannel();
        await cancelExistingFastingNotifications();
        await scheduleAllNotifications();
      } catch (error) {
        console.warn('Failed to setup fasting notifications:', error);
      }
    };

    setup();
  }, []);

  return children;
}
