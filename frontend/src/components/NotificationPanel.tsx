"use client";

import { useState, useMemo } from "react";
import { Bell, X, Check, Clock, AlertCircle, ShieldAlert, ArrowRight } from "lucide-react";
import { useNotifications, NotificationCategory, NotificationPriority } from "@/lib/context/NotificationContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Tab = 'ALL' | 'UNREAD' | 'WORKFLOW';

export default function NotificationPanel() {
  const { state, removeNotification, markAsRead, markAllRead, clearAll } = useNotifications();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('ALL');

  const unreadCount = state.notifications.filter(n => !n.read).length;

  const filteredNotifications = useMemo(() => {
    let filtered = state.notifications;
    if (activeTab === 'UNREAD') filtered = filtered.filter(n => !n.read);
    if (activeTab === 'WORKFLOW') filtered = filtered.filter(n => n.category === 'WORKFLOW');
    return filtered;
  }, [state.notifications, activeTab]);

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'URGENT': return 'bg-[var(--error-text)]';
      case 'HIGH': return 'bg-[var(--warning-text)]';
      case 'MEDIUM': return 'bg-[var(--info-text)]';
      case 'LOW': return 'bg-[var(--foreground-muted)]';
      default: return 'bg-[var(--info-text)]';
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
    <div className="relative">
      <button
        onClick={togglePanel}
        aria-label="Notifications"
        className="relative text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors p-2 rounded-full hover:bg-[var(--surface-hover)]"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[var(--accent)] text-[var(--accent-foreground)] text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[var(--header-bg)] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-3 w-96 bg-[var(--surface)]/95 backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ease-out flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-hover)]/40 backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-[var(--foreground)] tracking-tight">Notifications</h3>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-[var(--info-text)] hover:brightness-110 font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                    disabled={unreadCount === 0}
                  >
                    Mark all read
                  </button>
                  <div className="w-px h-3 bg-[var(--border)]" />
                  <button
                    onClick={clearAll}
                    className="text-[10px] text-[var(--error-text)] hover:brightness-110 font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                    disabled={state.notifications.length === 0}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex space-x-1 bg-[var(--background)] p-1 rounded-lg">
                {(['ALL', 'UNREAD', 'WORKFLOW'] as Tab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      activeTab === tab
                        ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
                        : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {tab.charAt(0) + tab.slice(1).toLowerCase()}
                    {tab === 'UNREAD' && unreadCount > 0 && (
                      <span className="ml-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] px-1.5 py-0.5 rounded-full text-[9px]">{unreadCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredNotifications.length === 0 ? (
                <div className="py-20 px-6 text-center">
                  <div className="w-16 h-16 bg-[var(--info-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4 border-[var(--info-border)]">
                    <Bell className="w-8 h-8 text-[var(--info-text)]/40" />
                  </div>
                  <p className="text-base font-semibold text-[var(--foreground)] mb-1">All caught up!</p>
                  <p className="text-xs text-[var(--foreground-muted)]">No notifications in this category.</p>
                </div>
              ) : (
                filteredNotifications.map((notif, index) => {
                  const navHref = notif.actions?.find(a => a.href)?.href;
                  // Rejection notifications render as a red card: red heading + white reason.
                  const isRejection = notif.metadata?.kind === 'POST_REJECTED';
                  const cardContent = (
                    <div className="flex gap-4">
                      {/* Priority Indicator & Icon */}
                      <div className="relative mt-0.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)]`}>
                          {getCategoryIcon(notif.category, notif.priority)}
                        </div>
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[var(--surface)] ${getPriorityColor(notif.priority)}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className={`text-sm font-bold truncate tracking-tight ${isRejection ? 'text-[var(--error-text)]' : !notif.read ? 'text-[var(--foreground)]' : 'text-[var(--foreground-muted)]'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-[var(--foreground-muted)] font-medium whitespace-nowrap">
                            {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className={`text-xs leading-relaxed font-medium mb-3 ${isRejection ? 'text-white' : 'text-[var(--foreground-muted)]'}`}>
                          {notif.message}
                        </p>

                        {/* Action Buttons */}
                        {notif.actions && notif.actions.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {notif.actions.map((action, i) => (
                              action.href ? (
                                <Link
                                  key={i}
                                  href={action.href}
                                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center transition-colors ${
                                    action.primary
                                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--info-border)]'
                                      : 'bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                                  }`}
                                >
                                  {action.label}
                                  {action.primary && <ArrowRight className="w-3 h-3 ml-1.5" />}
                                </Link>
                              ) : (
                                <button
                                  key={i}
                                  onClick={(e) => { e.stopPropagation(); action.onClick?.(); }}
                                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center transition-colors ${
                                    action.primary
                                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--info-border)]'
                                      : 'bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                                  }`}
                                >
                                  {action.label}
                                </button>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );

                  const handleCardClick = () => {
                    if (!notif.read) markAsRead(notif.id);
                    setIsOpen(false);
                    if (navHref) router.push(navHref);
                  };

                  return (
                    <div
                      key={notif.id}
                      style={{ animationDelay: `${index * 30}ms` }}
                      className={`px-5 py-4 border-b border-[var(--border)] last:border-0 transition-all relative group animate-in slide-in-from-right-4 duration-300 fill-mode-both cursor-pointer ${isRejection ? 'bg-[var(--error-bg)] border-l-4 border-l-[var(--error-text)] hover:bg-[var(--error-bg)]/80' : `hover:bg-[var(--surface-hover)]/60 ${!notif.read ? 'bg-[var(--accent)]/[0.02]' : ''}`}`}
                      onClick={handleCardClick}
                    >
                      {cardContent}

                      {/* Unread dot indicator on the side */}
                      {!notif.read && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--accent)] rounded-r-md" />
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notif.id);
                        }}
                        className="absolute top-4 right-4 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--error-bg)] text-[var(--foreground-muted)] hover:text-[var(--error-text)] transition-all shadow-sm bg-[var(--surface)]"
                        aria-label="Remove notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[var(--border)] text-center bg-[var(--surface-hover)]/40 backdrop-blur-md">
              <Link href="/admin/notifications" onClick={() => setIsOpen(false)} className="text-[11px] text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors font-bold uppercase tracking-widest flex items-center justify-center gap-1 group">
                View full history
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
