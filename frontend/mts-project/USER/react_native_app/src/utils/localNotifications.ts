import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type * as ExpoNotifications from 'expo-notifications';

export const DEFAULT_NOTIFICATION_CHANNEL_ID = 'mts-default';

const SHOWN_NOTIFICATION_IDS_KEY = 'mts_shown_local_notification_ids';
const VIBRATION_PATTERN = [0, 250, 250, 250];
let hasRequestedNotificationPermission = false;
let notificationHandlerConfigured = false;
let notificationsModule: typeof ExpoNotifications | null | undefined;

type NotificationTarget = {
  screen?: string;
  params?: Record<string, unknown>;
};

type LocalNotificationInput = NotificationTarget & {
  title: string;
  message: string;
  seconds?: number;
  date?: Date;
  data?: Record<string, unknown>;
};

function isNotificationRuntimeSupported() {
  return Platform.OS !== 'web' && Constants.appOwnership !== 'expo';
}

function getNotificationsModule() {
  if (!isNotificationRuntimeSupported()) {
    return null;
  }

  if (notificationsModule !== undefined) {
    return notificationsModule;
  }

  try {
    // Lazy-load so Expo Go does not initialize the unsupported Android notification module.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    notificationsModule = require('expo-notifications') as typeof ExpoNotifications;

    if (!notificationHandlerConfigured) {
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      notificationHandlerConfigured = true;
    }
  } catch (error) {
    console.warn('Notifications are unavailable in this runtime:', error);
    notificationsModule = null;
  }

  return notificationsModule;
}

export async function configureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) {
      return;
    }

    await Notifications.setNotificationChannelAsync(DEFAULT_NOTIFICATION_CHANNEL_ID, {
      name: 'MTS Notifications',
      description: 'Booking updates, account alerts, and service notifications.',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: VIBRATION_PATTERN,
      enableVibrate: true,
      sound: 'default',
      lightColor: '#007BFF',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
  } catch (error) {
    console.warn('Unable to configure Android notification channel:', error);
  }
}

export async function initializeLocalNotifications() {
  if (!isNotificationRuntimeSupported()) {
    return { granted: false, status: 'unsupported' };
  }

  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) {
      return { granted: false, status: 'unavailable' };
    }

    await configureAndroidNotificationChannel();

    const existingPermission = await Notifications.getPermissionsAsync();
    let finalStatus = existingPermission.status;

    if (finalStatus !== 'granted' && !hasRequestedNotificationPermission) {
      hasRequestedNotificationPermission = true;
      const requestedPermission = await Notifications.requestPermissionsAsync();
      finalStatus = requestedPermission.status;
    }

    return {
      granted: finalStatus === 'granted',
      status: finalStatus,
    };
  } catch (error) {
    console.warn('Unable to initialize local notifications:', error);
    return { granted: false, status: 'error' };
  }
}

function buildTrigger(Notifications: typeof ExpoNotifications, seconds?: number, date?: Date) {
  if (date) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: DEFAULT_NOTIFICATION_CHANNEL_ID,
    };
  }

  if (seconds && seconds > 0) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: DEFAULT_NOTIFICATION_CHANNEL_ID,
    };
  }

  return null;
}

export async function scheduleLocalNotification({
  title,
  message,
  screen = 'Notifications',
  params,
  seconds,
  date,
  data = {},
}: LocalNotificationInput) {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) {
      return null;
    }

    const permission = await initializeLocalNotifications();
    if (!permission.granted) {
      return null;
    }

    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        color: '#007BFF',
        vibrate: VIBRATION_PATTERN,
        autoDismiss: true,
        data: {
          ...data,
          screen,
          params,
          timestamp: new Date().toISOString(),
        },
      },
      trigger: buildTrigger(Notifications, seconds, date),
    });
  } catch (error) {
    console.warn('Unable to schedule local notification:', error);
    return null;
  }
}

async function getShownNotificationIds() {
  try {
    const rawValue = await AsyncStorage.getItem(SHOWN_NOTIFICATION_IDS_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function saveShownNotificationIds(ids: string[]) {
  try {
    await AsyncStorage.setItem(SHOWN_NOTIFICATION_IDS_KEY, JSON.stringify(ids.slice(-80)));
  } catch {
    // Notification de-duplication should never affect app behavior.
  }
}

export async function showUnreadAppNotifications(notifications: any[] = []) {
  try {
    const unreadNotifications = notifications.filter((item) => item && !item.is_read);
    if (unreadNotifications.length === 0) {
      return;
    }

    const shownIds = await getShownNotificationIds();
    const shownSet = new Set(shownIds);
    const nextShownIds = [...shownIds];
    const pendingNotifications = unreadNotifications
      .filter((item) => {
        const id = String(item.notification_id || item.id || `${item.title}-${item.created_at}`);
        return !shownSet.has(id);
      })
      .slice(0, 3);

    for (const item of pendingNotifications) {
      const id = String(item.notification_id || item.id || `${item.title}-${item.created_at}`);
      await scheduleLocalNotification({
        title: item.title || 'MTS India',
        message: item.message || 'You have a new notification.',
        screen: 'Notifications',
        data: {
          notificationId: id,
          createdAt: item.created_at || null,
        },
      });
      nextShownIds.push(id);
    }

    if (pendingNotifications.length > 0) {
      await saveShownNotificationIds(nextShownIds);
    }
  } catch (error) {
    console.warn('Unable to show unread app notifications:', error);
  }
}

export function addLocalNotificationResponseListener(callback: (data: Record<string, unknown>) => void) {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return { remove: () => null };
  }

  return Notifications.addNotificationResponseReceivedListener((response) => {
    callback(response.notification.request.content.data || {});
  });
}

export function getInitialNotificationData() {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) {
      return null;
    }

    const response = Notifications.getLastNotificationResponse();
    return response?.notification.request.content.data || null;
  } catch {
    return null;
  }
}
