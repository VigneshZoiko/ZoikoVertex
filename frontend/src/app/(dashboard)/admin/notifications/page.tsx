"use client";

import { useNotifications, NotificationPriority, NotificationCategory } from "@/lib/context/NotificationContext";
import { Bell, Check, Clock, AlertCircle, ShieldAlert, ArrowRight, X, Trash2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function NotificationsPage() {
  const { state, dispatch } = useNotifications();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const notifications = filter === 'UNREAD' 
    ? state.notifications.filter(n => !n.read) 
    : state.notifications;

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'URGENT': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'HIGH': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'MEDIUM': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'LOW': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default: return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
    }
  };

  const getCategoryIcon = (category: NotificationCategory, priority: NotificationPriority) => {
    if (priority === 'URGENT' || priority === 'HIGH') return <ShieldAlert className="w-5 h-5" />;
    switch (category) {
      case 'WORKFLOW': return <Check className="w-5 h-5" />;
      case 'SECURITY': return <AlertCircle className="w-5 h-5" />;
      case 'SYSTEM':
      default: return <Clock className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Notification History</h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">Manage and review all system and workflow alerts.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => dispatch({ type: 'MARK_ALL_READ' })}
            disabled={state.notifications.filter(n => !n.read).length === 0}
            className="flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark all read
          </button>
          <button 
            onClick={() => dispatch({ type: 'CLEAR_ALL' })}
            disabled={state.notifications.length === 0}
            className="flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear all
          </button>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-4 bg-[var(--surface-hover)]/30">
          <button 
            onClick={() => setFilter('ALL')}
            className={`text-sm font-semibold px-3 py-1.5 rounded-md transition-colors ${filter === 'ALL' ? 'bg-[var(--foreground)] text-[var(--background)]' : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'}`}
          >
            All Notifications
          </button>
          <button 
            onClick={() => setFilter('UNREAD')}
            className={`text-sm font-semibold px-3 py-1.5 rounded-md transition-colors flex items-center ${filter === 'UNREAD' ? 'bg-[var(--foreground)] text-[var(--background)]' : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'}`}
          >
            Unread
            {state.notifications.filter(n => !n.read).length > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${filter === 'UNREAD' ? 'bg-[var(--background)] text-[var(--foreground)]' : 'bg-indigo-500 text-white'}`}>
                {state.notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-24 px-6 text-center h-full flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/10">
                <Bell className="w-10 h-10 text-indigo-500/40" />
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">You&apos;re all caught up!</h3>
              <p className="text-sm text-[var(--foreground-muted)] max-w-sm mx-auto">
                No notifications to display. Any new updates, alerts, or workflow requests will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-6 transition-colors group relative flex gap-6 hover:bg-[var(--surface-hover)]/40 ${!notif.read ? 'bg-indigo-500/[0.02]' : ''}`}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${getPriorityColor(notif.priority)}`}>
                    {getCategoryIcon(notif.category, notif.priority)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <h4 className={`text-base font-bold tracking-tight ${!notif.read ? 'text-[var(--foreground)]' : 'text-[var(--foreground-muted)]'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-xs text-[var(--foreground-muted)] font-medium whitespace-nowrap bg-[var(--background)] px-2 py-1 rounded-md border border-[var(--border)]">
                        {notif.timestamp.toLocaleString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-[var(--foreground-muted)] leading-relaxed font-medium mb-4 max-w-3xl">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between">
                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        {notif.actions?.map((action, i) => (
                          action.href ? (
                            <Link 
                              key={i} 
                              href={action.href}
                              className={`text-sm px-4 py-2 rounded-xl font-bold flex items-center transition-colors ${
                                action.primary 
                                  ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' 
                                  : 'bg-[var(--background)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)]'
                              }`}
                            >
                              {action.label}
                              {action.primary && <ArrowRight className="w-4 h-4 ml-2" />}
                            </Link>
                          ) : (
                            <button 
                              key={i}
                              onClick={(e) => { e.stopPropagation(); action.onClick?.(); }}
                              className={`text-sm px-4 py-2 rounded-xl font-bold flex items-center transition-colors ${
                                action.primary 
                                  ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' 
                                  : 'bg-[var(--background)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)]'
                              }`}
                            >
                              {action.label}
                            </button>
                          )
                        ))}
                      </div>

                      {/* Utilities */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.read && (
                          <button
                            onClick={() => dispatch({ type: 'MARK_READ', payload: notif.id })}
                            className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-colors tooltip-trigger"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => dispatch({ type: 'REMOVE', payload: notif.id })}
                          className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove notification"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Unread indicator bar */}
                  {!notif.read && (
                    <div className="absolute left-0 top-6 bottom-6 w-1 bg-indigo-500 rounded-r-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
