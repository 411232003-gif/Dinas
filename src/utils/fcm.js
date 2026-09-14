import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { messaging, db } from '../firebase/config';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export async function requestFcmToken(userId) {
  if (!VAPID_KEY) {
    console.warn('VITE_FIREBASE_VAPID_KEY belum diatur di .env');
    return null;
  }
  if (!('serviceWorker' in navigator)) {
    console.warn('Browser tidak mendukung service worker');
    return null;
  }
  if (!('Notification' in window)) {
    console.warn('Browser tidak mendukung notifikasi');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Izin notifikasi ditolak');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (token && userId) {
      // Save token to the user document so the backend can send pushes
      await updateDoc(doc(db, 'users', userId), {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date().toISOString()
      });
    }

    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

export function listenForegroundMessages(callback) {
  if (!VAPID_KEY) return () => {};
  return onMessage(messaging, (payload) => {
    console.log('Foreground FCM message:', payload);
    if (callback) callback(payload);
  });
}

export function showFcmNotification(title, body, icon = '/logo.png') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon,
      badge: icon,
      tag: 'love-notes-fcm'
    });
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}
