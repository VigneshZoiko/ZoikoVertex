"use client";

import { useState, useEffect } from "react";
import {
  Sliders, Building2, Users, Link2, Calendar,
  Save, Loader2, CheckCircle2, AlertCircle, RefreshCw, PanelLeftClose,
} from "lucide-react";
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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/v1/workspace/settings");
      if (res.success) {
        setSettings(res.data);
        setName(res.data.name);
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
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Sliders className="w-8 h-8 text-indigo-500" />
            Workspace Settings
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Manage your workspace configuration and identity.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
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
          { label: "Created",  value: settings?.created_at ? new Date(settings.created_at).toLocaleDateString() : "—", icon: Calendar,  color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <div className={`inline-flex p-2 rounded-lg border ${color} mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
            <p className="text-lg font-bold text-white mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Workspace Name */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Workspace Identity</h2>
          <p className="text-zinc-500 text-sm mt-0.5">Update your workspace display name.</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Workspace Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Your workspace name"
              minLength={2}
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Organization</label>
            <input
              type="text"
              value={settings?.org_name || "Not available"}
              disabled
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-600 cursor-not-allowed"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || name.trim() === settings?.name}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
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

      {/* Interface Preferences */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PanelLeftClose className="w-5 h-5 text-indigo-400" />
            Interface Preferences
          </h2>
          <p className="text-zinc-500 text-sm mt-0.5">Customise your workspace layout and display behaviour.</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-semibold">Auto-collapse sidebar</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                Collapses the sidebar to icons only. Hover over it to expand temporarily.
              </p>
            </div>
            <button
              onClick={() => setCollapse(!collapseEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                collapseEnabled ? "bg-indigo-500" : "bg-zinc-700"
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
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Workspace Details</h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {[
            { label: "Workspace ID",        value: settings?.id },
            { label: "Organization ID",     value: settings?.org_id },
            { label: "Organization Status", value: settings?.org_status },
            { label: "Created At",          value: settings?.created_at ? new Date(settings.created_at).toLocaleString() : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="px-6 py-4 flex items-center justify-between">
              <span className="text-zinc-500 text-sm">{label}</span>
              <span className="text-zinc-300 text-sm font-mono break-all max-w-[60%] text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
