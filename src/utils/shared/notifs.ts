import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URLS || "https://srm-nest-bridge.loca.lt";

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

  if (notification.permission === "granted") return true;
  if (notification.permission === "denied") return false;

  const permission = await notification.requestPermission();
  return permission === "granted";
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
      new notification(title, options);
    }
  } catch (e) {
    console.error(e);
  }
};
export const subscribeToPushNotifications = async (): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    // RUN IN BACKGROUND - DO NOT WAIT
    registerNativePushInBackground();
    return true; 
  }

  try {
    // Web Logic remains
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return false;
    }
    // ... rest of web logic ...

    // Web Browser Logic
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) return false;

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    }

    const userDataStr = localStorage.getItem('classivo_data');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    const userEmail = userData?.profile?.regNo || 'unknown';

    await fetch(`${BACKEND_URL}/api/notifications/subscribe`, {
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

    return true;
  } catch (error) {
    console.error('Push Subscription Error:', error);
    // On native, we still return true if permissions are granted so the toggle works
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
