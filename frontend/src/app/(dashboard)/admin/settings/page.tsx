"use client";

import { useState, useEffect } from "react";
import {
  Sliders, Building2, Users, Link2, Calendar,
  Save, Loader2, CheckCircle2, AlertCircle, RefreshCw, PanelLeftClose,
  Bell,
} from "lucide-react";

const NOTIF_PREF_KEY = 'zv_notification_prefs';

interface NotificationPrefs {
  approvalAlerts: boolean;
  riskAlerts: boolean;
  publishingReminders: boolean;
  systemNotifications: boolean;
  escalationAlerts: boolean;
  integrationAlerts: boolean;
  emailDigest: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  approvalAlerts: true,
  riskAlerts: true,
  publishingReminders: true,
  systemNotifications: true,
  escalationAlerts: true,
  integrationAlerts: true,
  emailDigest: false,
};

function loadPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(NOTIF_PREF_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: NotificationPrefs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIF_PREF_KEY, JSON.stringify(prefs));
}
import { api } from "@/lib/api";
import { useSidebarCollapse } from "@/lib/hooks/useSidebarCollapse";

interface WorkspaceSettings {
  id: string;
  name: string;
  org_id: string;
  org_name: string | null;
  plan_type: string;
  org_status: string;
  created_at: string;
  member_count: number;
  account_count: number;
}

const PLAN_COLORS: Record<string, string> = {
  FREE:       "text-slate-400 bg-slate-400/10 border-slate-400/20",
  STARTER:    "text-slate-400 bg-slate-400/10 border-slate-400/20",
  GROWTH:     "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  ENTERPRISE: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

export default function WorkspaceSettingsPage() {
  const { enabled: collapseEnabled, setCollapse } = useSidebarCollapse();
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [name, setName]           = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError]         = useState<string | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [notifSaved, setNotifSaved] = useState(false);

  useEffect(() => {
    setNotifPrefs(loadPrefs());
  }, []);

  const handleNotifToggle = (key: keyof NotificationPrefs) => {
    setNotifPrefs(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      savePrefs(updated);
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
      return updated;
    });
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/v1/workspace/settings");
      if (res.success) {
        setSettings(res.data);
        setName(res.data.name ?? "");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load workspace settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!name.trim() || name.trim() === settings?.name) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      await api.patch("/api/v1/workspace/settings", { name: name.trim() });
      setSettings(prev => prev ? { ...prev, name: name.trim() } : prev);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: unknown) {
      setSaveStatus("error");
      setError(err instanceof Error ? err.message : "Failed to update workspace name");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const planKey = (settings?.plan_type || "FREE").toUpperCase();
  const planColor = PLAN_COLORS[planKey] || PLAN_COLORS.FREE;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Sliders className="w-8 h-8 text-indigo-500" />
            Workspace Settings
          </h1>
          <p className="text-foreground-muted mt-1 text-sm">Manage your workspace configuration and identity.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-surface-hover hover:bg-surface-hover text-foreground-muted rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Plan",     value: planKey,                                                            icon: Building2, color: planColor },
          { label: "Members",  value: settings?.member_count ?? 0,                                        icon: Users,     color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20" },
          { label: "Accounts", value: settings?.account_count ?? 0,                                       icon: Link2,     color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
          { label: "Created",  value: settings?.created_at ? new Date(settings.created_at).toLocaleDateString() : "—", icon: Calendar,  color: "text-foreground-muted bg-zinc-400/10 border-zinc-400/20" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 bg-card border border-border rounded-2xl">
            <div className={`inline-flex p-2 rounded-lg border ${color} mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-foreground-muted font-medium uppercase tracking-wider">{label}</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Workspace Name */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Workspace Identity</h2>
          <p className="text-foreground-muted text-sm mt-0.5">Update your workspace display name.</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-foreground-muted uppercase tracking-widest mb-2">Workspace Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Your workspace name"
              minLength={2}
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground-muted uppercase tracking-widest mb-2">Organization</label>
            <input
              type="text"
              value={settings?.org_name || "Not available"}
              disabled
              className="w-full bg-card/50 border border-border rounded-xl px-4 py-3 text-foreground-muted cursor-not-allowed"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !(name ?? "").trim() || (name ?? "").trim() === (settings?.name ?? "")}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-foreground font-bold rounded-xl transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
            {saveStatus === "success" && (
              <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium animate-in fade-in duration-300">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-rose-400 text-sm font-medium">
                <AlertCircle className="w-4 h-4" /> Failed to save
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            Notification Preferences
          </h2>
          <p className="text-foreground-muted text-sm mt-0.5">Control which alerts you receive in-app.</p>
        </div>
        <div className="divide-y divide-border">
          {([
            { key: 'approvalAlerts',       label: 'Approval Alerts',        desc: 'Notified when content requires your approval or is approved/rejected.' },
            { key: 'riskAlerts',           label: 'Risk Alerts',            desc: 'Notified when workspace risk posture becomes Elevated or Critical.' },
            { key: 'publishingReminders',  label: 'Publishing Reminders',   desc: 'Notified when your post status changes in the publishing workflow.' },
            { key: 'systemNotifications',  label: 'System Notifications',   desc: 'Platform-level alerts such as maintenance, usage limits, and updates.' },
            { key: 'escalationAlerts',     label: 'Escalation Alerts',      desc: 'Notified when a review item is escalated to admin for urgent action.' },
            { key: 'integrationAlerts',    label: 'Integration Alerts',     desc: 'Notified when a data connector sync fails or an integration disconnects.' },
            { key: 'emailDigest',          label: 'Email Digest',           desc: 'Receive a daily summary of unread notifications by email.' },
          ] as { key: keyof NotificationPrefs; label: string; desc: string }[]).map(({ key, label, desc }) => (
            <div key={key} className="px-6 py-4 flex items-center justify-between gap-6">
              <div>
                <p className="text-foreground text-sm font-semibold">{label}</p>
                <p className="text-foreground-muted text-xs mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => handleNotifToggle(key)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                  notifPrefs[key] ? "bg-indigo-500" : "bg-surface-hover"
                }`}
                role="switch"
                aria-checked={notifPrefs[key]}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    notifPrefs[key] ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
        {notifSaved && (
          <div className="px-6 py-3 border-t border-border flex items-center gap-1.5 text-emerald-400 text-sm font-medium animate-in fade-in duration-300">
            <CheckCircle2 className="w-4 h-4" /> Preferences saved
          </div>
        )}
      </div>

      {/* Interface Preferences */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <PanelLeftClose className="w-5 h-5 text-indigo-400" />
            Interface Preferences
          </h2>
          <p className="text-foreground-muted text-sm mt-0.5">Customise your workspace layout and display behaviour.</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm font-semibold">Auto-collapse sidebar</p>
              <p className="text-foreground-muted text-xs mt-0.5">
                Collapses the sidebar to icons only. Hover over it to expand temporarily.
              </p>
            </div>
            <button
              onClick={() => setCollapse(!collapseEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                collapseEnabled ? "bg-indigo-500" : "bg-surface-hover"
              }`}
              role="switch"
              aria-checked={collapseEnabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  collapseEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Workspace Details */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Workspace Details</h2>
        </div>
        <div className="divide-y divide-border">
          {[
            { label: "Workspace ID",        value: settings?.id },
            { label: "Organization ID",     value: settings?.org_id },
            { label: "Organization Status", value: settings?.org_status },
            { label: "Created At",          value: settings?.created_at ? new Date(settings.created_at).toLocaleString() : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="px-6 py-4 flex items-center justify-between">
              <span className="text-foreground-muted text-sm">{label}</span>
              <span className="text-foreground-muted text-sm font-mono break-all max-w-[60%] text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
