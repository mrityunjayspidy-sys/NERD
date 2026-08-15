import { Platform } from 'react-native';
import { Task } from '../types';

let Calendar: typeof import('expo-calendar') | null = null;
if (Platform.OS !== 'web') {
  try {
    Calendar = require('expo-calendar');
  } catch (e) {
    console.warn('expo-calendar not available:', e);
  }
}

export async function requestCalendarPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !Calendar) return true;

  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') return false;

    if (Platform.OS === 'ios') {
      const remindersStatus = await Calendar.requestRemindersPermissionsAsync();
      return remindersStatus.status === 'granted';
    }

    return true;
  } catch (error) {
    console.warn('Error requesting calendar permissions:', error);
    return false;
  }
}

export async function getOrCreatePartnerCalendar(): Promise<string | null> {
  if (Platform.OS === 'web' || !Calendar) return 'web-calendar-id';

  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) return null;

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const existing = calendars.find((c) => c.title === 'Nerd Tasks');
    if (existing) return existing.id;

    let defaultCalendarSource: any = undefined;
    if (Platform.OS === 'ios') {
      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      defaultCalendarSource = defaultCalendar.source;
    } else {
      defaultCalendarSource = {
        isLocalAccount: true,
        name: 'Nerd',
        type: Calendar.SourceType.LOCAL,
      };
    }

    const newCalendarId = await Calendar.createCalendarAsync({
      title: 'Nerd Tasks',
      color: '#808080',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendarSource?.id,
      source: defaultCalendarSource,
      name: 'nerd_internal_tasks',
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    return newCalendarId;
  } catch (error) {
    console.warn('Error creating/getting Nerd calendar:', error);
    return null;
  }
}

export async function syncTaskToCalendar(task: Task): Promise<string | null> {
  if (Platform.OS === 'web' || !Calendar) {
    console.log(`[Web Calendar Sync] Synced task: "${task.title}" to device calendar.`);
    return `web-cal-event-${task.id}`;
  }

  try {
    const calendarId = await getOrCreatePartnerCalendar();
    if (!calendarId) return null;

    const startDate = new Date(task.due_date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `Nerd: ${task.title}`,
      startDate,
      endDate,
      notes: task.description || undefined,
      alarms: task.reminder_time
        ? [{ relativeOffset: -Math.floor((startDate.getTime() - new Date(task.reminder_time).getTime()) / 60000) }]
        : [{ relativeOffset: -15 }],
    });

    return eventId;
  } catch (error) {
    console.warn('Error syncing task to calendar:', error);
    return null;
  }
}

export async function removeTaskFromCalendar(eventId: string): Promise<boolean> {
  if (Platform.OS === 'web' || !Calendar || !eventId || eventId.startsWith('web-cal-event')) return true;

  try {
    await Calendar.deleteEventAsync(eventId);
    return true;
  } catch (error) {
    console.warn('Error removing event from calendar:', error);
    return false;
  }
}
