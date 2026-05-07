import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeNotifications() {
  useEffect(() => {
    // Request permission for browser notifications
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    const channel = supabase
      .channel('publish_intents_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'publish_intents',
        },
        async (payload) => {
          console.log('[Realtime] Change received!', payload);
          
          const { new: newRow, old: oldRow } = payload;

          // Only notify if status changed
          if (newRow.status !== oldRow.status) {
            const { data: { user } } = await supabase.auth.getUser();
            
            // 1. Notify Creator if their post was returned, approved or rejected
            if (user && newRow.creator_id === user.id) {
              const title = `Post ${newRow.status}`;
              const body = newRow.status === 'RETURNED' 
                ? `Revision requested: "${newRow.feedback || 'Please check comments'}"`
                : `Your post has been ${newRow.status.toLowerCase()}.`;
              
              showNotification(title, body);
            }
            
            // 2. Notify Admins/Managers if a new post is pending their review
            // (Note: This would usually be on INSERT, but for status updates like PENDING_MANAGER)
            if (newRow.status === 'PENDING_MANAGER' || newRow.status === 'PENDING_ADMIN') {
               // Logic to check user role could be added here
               showNotification('New Action Required', `A post is now ${newRow.status.replace('_', ' ')}.`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const showNotification = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };
}
