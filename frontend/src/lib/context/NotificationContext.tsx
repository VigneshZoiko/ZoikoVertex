"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

export type NotificationCategory = 'SYSTEM' | 'WORKFLOW' | 'SECURITY' | 'SOCIAL';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface NotificationAction {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  category: NotificationCategory;
  priority: NotificationPriority;
  read: boolean;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
}

interface NotificationState {
  notifications: Notification[];
  loading: boolean;
}

type NotificationEvent =
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD'; payload: Notification }
  | { type: 'REMOVE'; payload: string }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_LOADING'; payload: boolean };

const NotificationContext = createContext<{
  state: NotificationState;
  dispatch: React.Dispatch<NotificationEvent>;
  addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
} | undefined>(undefined);

function notificationReducer(state: NotificationState, action: NotificationEvent): NotificationState {
  switch (action.type) {
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'ADD':
      return { ...state, notifications: [action.payload, ...state.notifications].slice(0, 50) };
    case 'REMOVE':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
    case 'MARK_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };
    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };
    case 'CLEAR_ALL':
      return { ...state, notifications: [] };
    default:
      return state;
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, { notifications: [], loading: true });

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/api/v1/notifications');
      if (response.success) {
        const formatted = response.data.map((n: any) => ({
          ...n,
          timestamp: new Date(n.created_at || n.timestamp),
          // Ensure category and priority are correctly typed
          category: n.category || 'SYSTEM',
          priority: n.priority || 'MEDIUM',
        }));
        dispatch({ type: 'SET_NOTIFICATIONS', payload: formatted });
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const addNotification = useCallback((notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      read: false,
    };
    dispatch({ type: 'ADD', payload: newNotif });
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    dispatch({ type: 'MARK_READ', payload: id });
    try {
      await api.patch(`/api/v1/notifications/${id}/read`, {});
    } catch (err) {
      console.warn("Failed to mark notification as read in backend:", err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    dispatch({ type: 'MARK_ALL_READ' });
    try {
      await api.post('/api/v1/notifications/mark-all-read', {});
    } catch (err) {
      console.warn("Failed to mark all notifications as read in backend:", err);
    }
  }, []);

  const clearAll = useCallback(async () => {
    dispatch({ type: 'CLEAR_ALL' });
    try {
      await api.delete('/api/v1/notifications');
    } catch (err) {
      console.warn("Failed to clear notifications in backend:", err);
    }
  }, []);

  // Sync with Supabase Realtime (centralized — single channel for both in-app and OS notifications)
  useEffect(() => {
    const channel = supabase
      .channel('central_notifications')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'publish_intents' },
        async (payload) => {
          const { new: newRow, old: oldRow } = payload;
          if (newRow.status !== oldRow.status) {
            // getSession() reads from localStorage — no network round-trip to Supabase Auth
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (user && newRow.creator_id === user.id) {
              addNotification({
                title: `Workflow Update: ${newRow.status}`,
                message: `Your post "${newRow.title || 'Untitled'}" was moved to ${newRow.status}.`,
                category: 'WORKFLOW',
                priority: newRow.status === 'RETURNED' ? 'HIGH' : 'MEDIUM',
                actions: [
                  { label: 'View Details', href: `/publish/${newRow.id}`, primary: true }
                ]
              });

              // OS browser notification (requires permission granted by useRealtimeNotifications)
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                const title = `Post ${newRow.status}`;
                const body = newRow.status === 'RETURNED'
                  ? `Revision requested: "${newRow.feedback || 'Please check comments'}"`
                  : `Your post has been ${newRow.status.toLowerCase()}.`;
                new Notification(title, { body, icon: '/favicon.ico' });
              }
            }

            // Notify for admin-level actions even when not the creator
            if (newRow.status === 'PENDING_MANAGER' || newRow.status === 'PENDING_ADMIN') {
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('New Action Required', {
                  body: `A post is now ${newRow.status.replace('_', ' ')}.`,
                  icon: '/favicon.ico',
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{ state, dispatch, addNotification, markAsRead, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
