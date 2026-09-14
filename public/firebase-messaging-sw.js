// Service worker untuk menerima push notifikasi dari Firebase Cloud Messaging (FCM)
// FCM akan mendaftarkan file ini secara otomatis dengan scope /firebase-cloud-messaging-push-scope

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { notification: { title: 'Pesan Baru', body: event.data ? event.data.text() : '' } };
  }

  const notification = payload.notification || {};
  const title = notification.title || 'Pesan Baru';
  const body = notification.body || 'Pasanganmu mengirim sesuatu untukmu 💕';
  const icon = notification.icon || '/logo.png';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      tag: 'love-notes-chat',
      data: payload.data || {}
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
