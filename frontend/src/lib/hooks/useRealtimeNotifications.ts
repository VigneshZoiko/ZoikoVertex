import { useEffect } from 'react';

// NotificationContext already opens the realtime channel and handles both
// in-app and OS notifications. This hook's only job is to request browser
// notification permission so the OS popups work when the user first arrives.
export function useRealtimeNotifications() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission !== 'granted' &&
      Notification.permission !== 'denied'
    ) {
      Notification.requestPermission();
    }
  }, []);
}
