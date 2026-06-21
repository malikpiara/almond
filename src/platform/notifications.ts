import { isNative } from './index';

/** A daily reflection reminder time, in the device's local timezone. */
export interface ReminderTime {
  hour: number; // 0–23
  minute: number; // 0–59
}

export interface NotificationsProvider {
  /** Ask the OS for notification permission. Returns whether it was granted. */
  requestPermission(): Promise<boolean>;
  /** Schedule (or replace) the single daily reflection reminder. */
  scheduleDailyReminder(time: ReminderTime): Promise<void>;
  /** Cancel the daily reflection reminder if one is scheduled. */
  cancelDailyReminder(): Promise<void>;
  /** TEMP (spike): fire a one-off notification a few seconds out, to verify
   *  delivery on-device without waiting for the daily time. Remove before ship. */
  sendTestNotification(): Promise<void>;
}

// One stable id for the daily reminder, so scheduling again replaces it rather
// than stacking duplicates.
const DAILY_REMINDER_ID = 1;
const TEST_NOTIFICATION_ID = 999;

// Web has no reliable scheduled-local-notification primitive, and the whole
// point of the native spike is to validate reminders on Android — so on web
// this is a deliberate no-op rather than a half-working Notification API path.
const webNotifications: NotificationsProvider = {
  async requestPermission() {
    return false;
  },
  async scheduleDailyReminder() {
    /* no-op on web */
  },
  async cancelDailyReminder() {
    /* no-op on web */
  },
  async sendTestNotification() {
    /* no-op on web */
  },
};

// Native impl. The Capacitor plugin is imported lazily so it never lands in the
// web bundle (the import only runs when isNative() is true).
const nativeNotifications: NotificationsProvider = {
  async requestPermission() {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const res = await LocalNotifications.requestPermissions();
    return res.display === 'granted';
  },
  async scheduleDailyReminder(time) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_REMINDER_ID,
          title: 'A moment to reflect',
          body: 'Take a minute to write down a thought.',
          // `on` + repeats fires daily at this local time.
          schedule: {
            on: { hour: time.hour, minute: time.minute },
            repeats: true,
            allowWhileIdle: true,
          },
        },
      ],
    });
  },
  async cancelDailyReminder() {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({
      notifications: [{ id: DAILY_REMINDER_ID }],
    });
  },
  async sendTestNotification() {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({
      notifications: [
        {
          id: TEST_NOTIFICATION_ID,
          title: 'A moment to reflect',
          body: 'This is a test — your daily reminder will look like this.',
          schedule: { at: new Date(Date.now() + 3000) },
        },
      ],
    });
  },
};

export function getNotifications(): NotificationsProvider {
  return isNative() ? nativeNotifications : webNotifications;
}
