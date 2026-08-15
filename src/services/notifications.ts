import { Platform } from 'react-native';

let Notifications: typeof import('expo-notifications') | null = null;

if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn('expo-notifications not available:', e);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications) {
    return true; // Web notification fallback
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('nerd-reminders', {
        name: 'Nerd Task Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#808080',
        sound: 'default',
      });
    }

    return true;
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Notifications) return null;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (error) {
    console.warn('Could not retrieve push token:', error);
    return null;
  }
}

export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  reminderTime: string | Date
): Promise<string | null> {
  try {
    const targetDate = new Date(reminderTime);
    const now = new Date();

    if (targetDate.getTime() <= now.getTime()) {
      return null;
    }

    if (Platform.OS === 'web' || !Notifications) {
      console.log(`[Web Notification Scheduled] Task: "${title}" for ${targetDate.toLocaleTimeString()}`);
      return `web-notif-${taskId}-${Date.now()}`;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nerd: Reminder',
        body: title,
        data: { taskId, screen: 'TaskDetail' },
        sound: 'default',
        color: '#808080',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
        channelId: Platform.OS === 'android' ? 'nerd-reminders' : undefined,
      },
    });

    return identifier;
  } catch (error) {
    console.warn('Error scheduling notification:', error);
    return null;
  }
}

export async function cancelTaskReminder(notificationId: string): Promise<void> {
  if (!notificationId || notificationId.startsWith('web-notif') || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Error cancelling notification:', error);
  }
}
