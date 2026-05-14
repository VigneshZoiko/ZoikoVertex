"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
}

type NotificationEvent =
  | { type: 'ADD'; payload: Notification }
  | { type: 'REMOVE'; payload: string }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'CLEAR_ALL' };

const NotificationContext = createContext<{
  state: NotificationState;
  dispatch: React.Dispatch<NotificationEvent>;
  addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
} | undefined>(undefined);

function notificationReducer(state: NotificationState, action: NotificationEvent): NotificationState {
  switch (action.type) {
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
  const [state, dispatch] = useReducer(notificationReducer, { notifications: [] });

  const addNotification = useCallback((notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      read: false,
    };
    dispatch({ type: 'ADD', payload: newNotif });
  }, []);

  // Sync with Supabase Realtime (centralized)
  useEffect(() => {
    const channel = supabase
      .channel('central_notifications')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'publish_intents' },
        async (payload) => {
          const { new: newRow, old: oldRow } = payload;
          if (newRow.status !== oldRow.status) {
            const { data: { user } } = await supabase.auth.getUser();
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
    <NotificationContext.Provider value={{ state, dispatch, addNotification }}>
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
