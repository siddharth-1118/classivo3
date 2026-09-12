import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://nancey-pandemoniacal-candra.ngrok-free.dev";

/**
 * Sync a user's timetable and attendance to the server so the cron job can
 * send targeted push notifications (class reminders + low attendance alerts).
 * Called after login and after every data refresh.
 */
export const syncNotificationData = async (userData: any): Promise<void> => {
  try {
    if (typeof window === "undefined") return;

    // Only sync if the user has an active push subscription
    const notifEnabled = localStorage.getItem("notifs_enabled") === "true";
    if (!notifEnabled) return;

    const regNo = userData?.profile?.regNo || "unknown";
    const timetable =
      userData?.timetable ||
      userData?.schedule ||
      userData?.time_table ||
      userData?.effectiveSchedule ||
      null;

    // Slim down attendance to just what the cron needs
    const attendance = (userData?.attendance || []).map((s: any) => ({
      title: s.title || s.courseTitle || s.name || s.code || "Unknown",
      percentage: s.percentage || s.percent || "0",
      code: s.code || "",
    }));

    // Get the current push subscription from the service worker
    let subscription: any = null;
    if ("serviceWorker" in navigator && "PushManager" in window) {
      const reg = await navigator.serviceWorker.ready;
      subscription = await reg.pushManager.getSubscription();
    }
    if (!subscription) return;

    await fetch(`/api/notifications/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription,
        user_email: regNo,
        timetable,
        attendance,
      }),
    });
  } catch (e) {
    // Non-critical — don't throw
    console.warn("syncNotificationData failed:", e);
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    const status = await LocalNotifications.requestPermissions();
    if (status.display === 'granted') {
      // Create a high-priority channel for lockscreen/home screen visibility
      await LocalNotifications.createChannel({
        id: 'updates',
        name: 'App Updates',
        description: 'Notifications for attendance and marks',
        importance: 5, // High importance for banners/lockscreen
        visibility: 1, // Public visibility for lockscreen
        vibration: true,
      });
      return true;
    }
    return false;
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  const notification = (window as any).Notification;

  if (notification.permission === "granted") {
    subscribeToPushNotifications().catch(() => {});
    return true;
  }
  if (notification.permission === "denied") return false;

  const permission = await notification.requestPermission();
  if (permission === "granted") {
    subscribeToPushNotifications().catch(() => {});
    return true;
  }
  return false;
};

export const sendNotification = async (
  title: string,
  body: string,
  tag?: string,
): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: Math.floor(Math.random() * 1000000),
            schedule: { at: new Date(Date.now() + 100) },
            channelId: 'updates',
            extra: { tag: tag },
            smallIcon: 'ic_launcher_round',
            actionTypeId: '',
          }
        ]
      });
      return;
    } catch (e) {
      console.error('Native notification error:', e);
    }
  }

  if (typeof window === "undefined") {
    return;
  }

  const notification = (window as any).Notification;
  if (!notification || notification.permission !== "granted") {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    const options = {
      body: body,
      icon: "/icons/icon-192.png",
      vibrate: [200, 100, 200],
      tag: tag || "class-alert",
      renotify: true,
      badge: "/icons/icon-192.png",
    } as any;

    if (registration && registration.active) {
      await registration.showNotification(title, options);
    } else {
      try {
        new notification(title, options);
      } catch (err) {
        console.warn("Desktop Notification constructor notice:", err);
      }
    }
  } catch (e) {
    console.error("sendNotification error:", e);
  }
};
export const subscribeToPushNotifications = async (): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    registerNativePushInBackground();
    return true; 
  }

  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return false;
    }

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register("/sw.js");
    }

    const swReg = await navigator.serviceWorker.ready;
    let subscription = await swReg.pushManager.getSubscription();
    
    if (!subscription) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BLi4cPx6XEPRQ2BOhvjJO--dUXL7WK9Me0mRlGH3oTFKQL5cxeH2zvwD1rJPEiwJHfY_Ta0-7eGe3T3OeHHPIYE";
      subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    }

    const userDataStr = localStorage.getItem('classivo_data');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    const userEmail = userData?.profile?.regNo || 'unknown';

    const res = await fetch(`/api/notifications/subscribe`, {
      method: 'POST',
      body: JSON.stringify({
        subscription: subscription,
        user_email: userEmail
      }),
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true'
      }
    });

    const data = await res.json();
    console.log("Push subscription sync status:", data);
    return true;
  } catch (error) {
    console.error('Push Subscription Error:', error);
    return Capacitor.isNativePlatform();
  }
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerNativePushInBackground() {
  const fcmEnabled = process.env.NEXT_PUBLIC_FCM_ENABLED === "true";
  if (!fcmEnabled) {
    console.warn("FCM is disabled because google-services.json is missing. Skipping native push registration.");
    return;
  }

  setTimeout(async () => {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      if (!PushNotifications) return;

      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive !== 'granted') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') return;

      await PushNotifications.register();
      
      PushNotifications.addListener('registration', async (token) => {
        const userDataStr = localStorage.getItem('classivo_data');
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        const userRegNo = userData?.profile?.regNo || 'unknown';

        await fetch(`${BACKEND_URL}/api/notifications/subscribe`, {
          method: 'POST',
          body: JSON.stringify({
            subscription: { endpoint: token.value, keys: {} },
            user_email: userRegNo,
            type: 'native'
          }),
          headers: {
            'Content-Type': 'application/json',
            'bypass-tunnel-reminder': 'true'
          }
        });
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed', notification);
        // This prevents the app from losing context on click
      });
    } catch (err) {
      console.warn("Background push registration failed quietly:", err);
    }
  }, 100);
}

/**
 * Schedules local background notifications for upcoming timetable slots.
 * Works 100% offline and without running the server once registered on device.
 */
export const scheduleLocalTimetableNotifications = async (userData: any): Promise<void> => {
  if (typeof window === "undefined") return;
  
  try {
    const notifPermission = await requestNotificationPermission();
    if (!notifPermission) return;

    const timetable = userData?.timetable || userData?.schedule || userData?.effectiveSchedule;
    if (!timetable || typeof timetable !== "object") return;

    // Clear previous scheduled timetable alerts to avoid duplicates
    if (Capacitor.isNativePlatform()) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel(pending);
        }
      } catch {}
    }

    const today = new Date();
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDayName = daysOfWeek[today.getDay()];

    const todaySlots = timetable[currentDayName] || [];
    if (Array.isArray(todaySlots)) {
      todaySlots.forEach(async (slot: any, idx: number) => {
        const timeStr = slot.time || slot.slotTime || "";
        if (!timeStr) return;

        const startTimePart = timeStr.split("-")[0]?.trim();
        if (!startTimePart) return;

        const parts = startTimePart.split(":");
        if (parts.length < 2) return;
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(minutes)) return;

        const classTime = new Date();
        classTime.setHours(hours, minutes, 0, 0);

        // Alert 10 minutes before class
        const alertTime = new Date(classTime.getTime() - 10 * 60 * 1000);
        if (alertTime > new Date()) {
          const courseName = slot.course || slot.name || slot.title || "Class";
          const room = slot.room ? `📍 Room: ${slot.room}` : "";
          const title = `🔔 Upcoming Class: ${courseName}`;
          const body = `Class starts in 10 mins (${startTimePart}). ${room}`;

          if (Capacitor.isNativePlatform()) {
            try {
              await LocalNotifications.schedule({
                notifications: [
                  {
                    id: 1000 + idx,
                    title,
                    body,
                    schedule: { at: alertTime },
                    channelId: "updates",
                  },
                ],
              });
            } catch {}
          } else if ("serviceWorker" in navigator) {
            const delayMs = alertTime.getTime() - Date.now();
            if (delayMs > 0 && delayMs < 24 * 60 * 60 * 1000) {
              setTimeout(() => {
                sendNotification(title, body, `class-slot-${idx}`);
              }, delayMs);
            }
          }
        }
      });
    }
  } catch (e) {
    console.warn("scheduleLocalTimetableNotifications failed silently:", e);
  }
};
