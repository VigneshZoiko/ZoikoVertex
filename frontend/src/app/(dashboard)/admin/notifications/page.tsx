"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCheck, Trash2, Loader2, AlertCircle, Info, Shield, Workflow, MessageSquare, ExternalLink, X, Clock, Filter } from "lucide-react";
import { useNotifications } from "@/lib/context/NotificationContext";
import type { NotificationCategory } from "@/lib/context/NotificationContext";

const CATEGORY_CONFIG: Record<NotificationCategory, { label: string; icon: typeof Bell; color: string }> = {
  SYSTEM:   { label: "System",   icon: Info,          color: "text-blue-500" },
  WORKFLOW: { label: "Workflow", icon: Workflow,      color: "text-purple-500" },
  SECURITY: { label: "Security", icon: Shield,        color: "text-amber-500" },
  SOCIAL:   { label: "Social",   icon: MessageSquare, color: "text-emerald-500" },
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW:    "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  MEDIUM: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  HIGH:   "bg-amber-500/10 text-amber-500 border-amber-500/20",
  URGENT: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function NotificationsPage() {
  const { state, dispatch, markAsRead, markAllRead, clearAll } = useNotifications();
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | "ALL">("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { api } = await import("@/lib/api");
        const res = await api.get("/api/v1/notifications");
        if (res.success) {
          dispatch({ type: "SET_NOTIFICATIONS", payload: (res.data || []).map((n: any) => ({
            ...n,
            timestamp: new Date(n.created_at || n.timestamp),
          })) });
        }
      } catch { /* silent */ }
      finally { setLoading(false) }
    };
    fetch();
  }, [dispatch]);

  const notifications = state.notifications;
  const filtered = activeCategory === "ALL"
    ? notifications
    : notifications.filter(n => n.category === activeCategory);
  const unread = notifications.filter(n => !n.read);

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    await clearAll();
  };

  const categoryCounts = notifications.reduce((acc, n) => {
    acc[n.category] = (acc[n.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-0 sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-surface-hover rounded-xl border border-border mt-0.5 shrink-0">
            <Bell className="w-5 h-5 text-foreground-muted" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Notifications</h1>
            <p className="text-sm text-foreground-muted mt-0.5">
              {unread.length > 0
                ? `${unread.length} unread notification${unread.length !== 1 ? "s" : ""}`
                : "All caught up"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleMarkAllRead}
            disabled={unread.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-hover hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed text-foreground-muted rounded-xl text-xs font-medium transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mark All Read</span>
            <span className="sm:hidden">Read All</span>
          </button>
          <button
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-hover hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed text-foreground-muted rounded-xl text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear All</span>
            <span className="sm:hidden">Clear</span>
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setActiveCategory("ALL")}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            activeCategory === "ALL"
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-foreground-muted border-border hover:border-border"
          }`}
        >
          All ({notifications.length})
        </button>
        {(Object.entries(CATEGORY_CONFIG) as [NotificationCategory, typeof CATEGORY_CONFIG[NotificationCategory]][]).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              activeCategory === key
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-foreground-muted border-border hover:border-border"
            }`}
          >
            <config.icon className="w-3.5 h-3.5" />
            {config.label}
            {categoryCounts[key] > 0 && <span className="opacity-60">({categoryCounts[key]})</span>}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-foreground-muted">
          <Loader2 className="w-6 h-6 animate-spin mb-3" />
          <p className="text-sm">Loading notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-foreground-muted">
          <Bell className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No notifications</p>
          <p className="text-xs mt-1">
            {activeCategory === "ALL"
              ? "You're all caught up!"
              : `No ${CATEGORY_CONFIG[activeCategory]?.label.toLowerCase()} notifications`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => {
            const config = CATEGORY_CONFIG[notif.category] || CATEGORY_CONFIG.SYSTEM;
            const Icon = config.icon;
            return (
              <div
                key={notif.id}
                className={`group flex items-start gap-3 sm:gap-4 p-4 rounded-xl border transition-all ${
                  notif.read
                    ? "bg-card border-border"
                    : "bg-surface border-border ring-1 ring-border/40"
                }`}
              >
                {/* Icon */}
                <div className={`p-2 rounded-lg shrink-0 border border-border/50 ${
                  notif.read ? "bg-surface-hover" : "bg-surface"
                }`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm leading-snug ${notif.read ? "text-foreground-muted" : "text-foreground font-medium"}`}>
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="text-xs text-foreground-muted mt-1 leading-relaxed line-clamp-2">{notif.message}</p>
                      )}
                    </div>
                    {!notif.read && (
                      <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[notif.priority] || PRIORITY_COLORS.LOW}`}>
                      {notif.priority}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-foreground-muted">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.timestamp).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                        ...(new Date(notif.timestamp).getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
                      })}
                      {" "}
                      {new Date(notif.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                    {notif.actions?.map((action, i) => (
                      <a
                        key={i}
                        href={action.href || "#"}
                        onClick={(e) => { if (action.onClick) { e.preventDefault(); action.onClick(); } }}
                        className={`text-[10px] font-medium flex items-center gap-1 transition-colors ${
                          action.primary
                            ? "text-blue-500 hover:text-blue-400"
                            : "text-foreground-muted hover:text-foreground"
                        }`}
                      >
                        {action.label} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="p-1.5 text-foreground-muted hover:text-blue-500 transition-colors rounded-lg hover:bg-surface-hover"
                      title="Mark as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
