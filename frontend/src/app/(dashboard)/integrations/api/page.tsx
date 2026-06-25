"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key, Webhook, Plus, Trash2, Eye, EyeOff, Copy, Check,
  ToggleLeft, ToggleRight, RefreshCw, ChevronDown, ChevronUp,
  Zap, CheckCircle2, XCircle, Shield,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  full_key?: string;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_triggered_at: string | null;
  failure_count: number;
  secret?: string;
}

interface DeliveryLog {
  id: string;
  event_type: string;
  status: "success" | "failed" | "pending";
  response_status: number | null;
  duration_ms: number | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_SCOPES = [
  { value: "read:content",    label: "Read Content" },
  { value: "write:content",   label: "Write Content" },
  { value: "read:analytics",  label: "Read Analytics" },
  { value: "write:publish",   label: "Publish Posts" },
  { value: "read:agents",     label: "Read Agents" },
  { value: "write:agents",    label: "Manage Agents" },
  { value: "read:governance", label: "Read Governance" },
  { value: "*",               label: "Full Access" },
];

const ALL_EVENTS = [
  { value: "post.published",       label: "Post Published" },
  { value: "post.failed",          label: "Post Failed" },
  { value: "post.scheduled",       label: "Post Scheduled" },
  { value: "agent.action",         label: "Agent Action" },
  { value: "approval.requested",   label: "Approval Requested" },
  { value: "approval.completed",   label: "Approval Completed" },
  { value: "account.connected",    label: "Account Connected" },
  { value: "account.disconnected", label: "Account Disconnected" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-surface text-foreground-muted hover:text-foreground transition-colors">
      {copied ? <Check size={13} className="text-success-text" /> : <Copy size={13} />}
    </button>
  );
}

function StatusBadge({ active, failCount }: { active: boolean; failCount?: number }) {
  if (!active) return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-[#2a1a1a] text-error-text border border-error-border">Disabled</span>
  );
  if (failCount && failCount > 0) return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-[#2a1f10] text-warning-text border border-warning-border">
      {failCount} fail{failCount > 1 ? "s" : ""}
    </span>
  );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-success-bg text-success-text border border-success-border">Active</span>
  );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

let keysCache: ApiKey[] | null = null;

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>(keysCache ?? []);
  const [loading, setLoading] = useState(keysCache === null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>(["read:content"]);
  const [newExpiry, setNewExpiry] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await api.get("/api/v1/integrations/api-keys");
    if (res.success) { keysCache = res.data; setKeys(res.data); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) { setError("Key name is required"); return; }
    if (newScopes.length === 0) { setError("Select at least one scope"); return; }
    setCreating(true);
    setError("");
    const res = await api.post("/api/v1/integrations/api-keys", {
      name: newName,
      scopes: newScopes,
      expires_at: newExpiry || undefined,
    });
    if (res.success) {
      setCreatedKey(res.data);
      setShowFull(true);
      setShowCreate(false);
      setNewName("");
      setNewScopes(["read:content"]);
      setNewExpiry("");
      load();
    } else {
      setError(res.error?.message || "Failed to create key");
    }
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    await api.patch(`/api/v1/integrations/api-keys/${id}/revoke`, {});
    setRevoking(null);
    load();
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await api.delete(`/api/v1/integrations/api-keys/${id}`);
    setDeleting(null);
    load();
  };

  const toggleScope = (scope: string) => {
    if (scope === "*") { setNewScopes(["*"]); return; }
    setNewScopes(prev =>
      prev.includes(scope)
        ? prev.filter(s => s !== scope)
        : [...prev.filter(s => s !== "*"), scope]
    );
  };

  return (
    <div className="space-y-4">
      {createdKey && (
        <div className="border border-success-border bg-success-bg rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-success-text mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-success-text mb-1">API key created — copy it now</p>
              <p className="text-xs text-foreground-muted mb-3">This is the only time the full key will be shown.</p>
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                <code className="text-xs text-success-text flex-1 truncate font-mono">
                  {showFull
                    ? createdKey.full_key
                    : createdKey.full_key?.replace(/^(.{16})(.+)(.{4})$/, "$1••••••••••••$3")}
                </code>
                <button onClick={() => setShowFull(v => !v)} className="text-foreground-muted hover:text-foreground transition-colors">
                  {showFull ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                {createdKey.full_key && <CopyButton text={createdKey.full_key} />}
              </div>
            </div>
            <button onClick={() => setCreatedKey(null)} className="text-foreground-muted hover:text-foreground text-xs mt-0.5">✕</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">{keys.length} key{keys.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => { setShowCreate(v => !v); setError(""); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#e0e0e0] transition-colors"
        >
          <Plus size={14} />
          New Key
        </button>
      </div>

      {showCreate && (
        <div className="border border-border rounded-xl p-4 bg-background space-y-4">
          <p className="text-sm font-medium text-foreground">Create API Key</p>
          {error && <p className="text-xs text-error-text">{error}</p>}
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Key Name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Production CMS Integration"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-foreground-muted focus:outline-none focus:border-border"
            />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-2 block">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SCOPES.map(s => (
                <button
                  key={s.value}
                  onClick={() => toggleScope(s.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    newScopes.includes(s.value)
                      ? "bg-surface border-white/30 text-foreground"
                      : "border-border text-foreground-muted hover:border-border hover:text-foreground-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Expiry Date (optional)</label>
            <input
              type="date"
              value={newExpiry}
              onChange={e => setNewExpiry(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-border"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#e0e0e0] disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating..." : "Create Key"}
            </button>
            <button onClick={() => { setShowCreate(false); setError(""); }} className="px-4 py-2 text-foreground-muted text-sm hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Key size={32} className="mx-auto text-foreground-muted mb-3" />
          <p className="text-sm text-foreground-muted">No API keys yet</p>
          <p className="text-xs text-foreground-muted mt-1">Create a key to authenticate external integrations</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(key => (
            <div key={key.id} className="border border-border rounded-xl p-4 bg-background flex items-center gap-4">
              <div className="p-2 rounded-lg bg-surface border border-border">
                <Key size={14} className="text-foreground-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{key.name}</span>
                  <StatusBadge active={key.is_active} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-muted">
                  <code className="font-mono text-foreground-muted">{key.key_prefix}••••••••••••</code>
                  <CopyButton text={key.key_prefix} />
                  <span>Created {fmtDate(key.created_at)}</span>
                  <span>Last used {timeAgo(key.last_used_at)}</span>
                  {key.expires_at && <span className="text-warning-text">Expires {fmtDate(key.expires_at)}</span>}
                </div>
                <div className="flex gap-1 mt-2">
                  {key.scopes.map(s => (
                    <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-surface border border-border text-foreground-muted">{s}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {key.is_active && (
                  <button
                    onClick={() => handleRevoke(key.id)}
                    disabled={revoking === key.id}
                    className="px-3 py-1.5 text-xs border border-border rounded-lg text-foreground-muted hover:text-warning-text hover:border-warning-border transition-colors disabled:opacity-50"
                  >
                    {revoking === key.id ? "..." : "Revoke"}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(key.id)}
                  disabled={deleting === key.id}
                  className="p-1.5 rounded-lg text-foreground-muted hover:text-error-text hover:brightness-110 transition-colors disabled:opacity-50"
                >
                  {deleting === key.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Webhooks Tab ─────────────────────────────────────────────────────────────

let webhooksCache: WebhookEndpoint[] | null = null;

function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(webhooksCache ?? []);
  const [loading, setLoading] = useState(webhooksCache === null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createdWebhook, setCreatedWebhook] = useState<WebhookEndpoint | null>(null);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; status: string; code: number | null; ms: number | null } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, DeliveryLog[]>>({});
  const [logsLoading, setLogsLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get("/api/v1/integrations/webhooks");
    if (res.success) { webhooksCache = res.data; setWebhooks(res.data); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) { setError("Webhook name is required"); return; }
    if (!newUrl.trim()) { setError("URL is required"); return; }
    if (newEvents.length === 0) { setError("Select at least one event"); return; }
    setCreating(true);
    setError("");
    const res = await api.post("/api/v1/integrations/webhooks", { name: newName, url: newUrl, events: newEvents });
    if (res.success) {
      setCreatedWebhook(res.data);
      setShowCreate(false);
      setNewName("");
      setNewUrl("");
      setNewEvents([]);
      load();
    } else {
      setError(res.error?.message || "Failed to create webhook");
    }
    setCreating(false);
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    const res = await api.post(`/api/v1/integrations/webhooks/${id}/test`, {});
    if (res.success && res.data) {
      setTestResult({ id, status: res.data.status, code: res.data.response_status, ms: res.data.duration_ms });
    } else {
      setTestResult({ id, status: "failed", code: null, ms: null });
    }
    setTesting(null);
  };

  const handleToggle = async (wh: WebhookEndpoint) => {
    await api.patch(`/api/v1/integrations/webhooks/${wh.id}`, { is_active: !wh.is_active });
    load();
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await api.delete(`/api/v1/integrations/webhooks/${id}`);
    setDeleting(null);
    load();
  };

  const toggleLogs = async (id: string) => {
    if (expandedLogs === id) { setExpandedLogs(null); return; }
    setExpandedLogs(id);
    if (logs[id]) return;
    setLogsLoading(true);
    const res = await api.get(`/api/v1/integrations/webhooks/${id}/logs`);
    if (res.success) setLogs(prev => ({ ...prev, [id]: res.data }));
    setLogsLoading(false);
  };

  const toggleEvent = (ev: string) => {
    setNewEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  };

  return (
    <div className="space-y-4">
      {createdWebhook && (
        <div className="border border-success-border bg-success-bg rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-success-text mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-success-text mb-1">Webhook created — save the signing secret</p>
              <p className="text-xs text-foreground-muted mb-3">
                Use this to verify <code className="text-foreground-muted">X-ZV-Signature</code> on incoming requests. Not shown again.
              </p>
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                <code className="text-xs text-success-text flex-1 truncate font-mono">{createdWebhook.secret}</code>
                {createdWebhook.secret && <CopyButton text={createdWebhook.secret} />}
              </div>
            </div>
            <button onClick={() => setCreatedWebhook(null)} className="text-foreground-muted hover:text-foreground text-xs mt-0.5">✕</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">{webhooks.length} endpoint{webhooks.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => { setShowCreate(v => !v); setError(""); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#e0e0e0] transition-colors"
        >
          <Plus size={14} />
          Add Endpoint
        </button>
      </div>

      {showCreate && (
        <div className="border border-border rounded-xl p-4 bg-background space-y-4">
          <p className="text-sm font-medium text-foreground">Register Webhook Endpoint</p>
          {error && <p className="text-xs text-error-text">{error}</p>}
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Slack Notifications"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-foreground-muted focus:outline-none focus:border-border"
            />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Endpoint URL</label>
            <input
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-foreground-muted focus:outline-none focus:border-border font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-2 block">Events to subscribe</label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(e => (
                <button
                  key={e.value}
                  onClick={() => toggleEvent(e.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    newEvents.includes(e.value)
                      ? "bg-surface border-white/30 text-foreground"
                      : "border-border text-foreground-muted hover:border-border hover:text-foreground-muted"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-[#e0e0e0] disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating..." : "Create Webhook"}
            </button>
            <button onClick={() => { setShowCreate(false); setError(""); }} className="px-4 py-2 text-foreground-muted text-sm hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Webhook size={32} className="mx-auto text-foreground-muted mb-3" />
          <p className="text-sm text-foreground-muted">No webhook endpoints yet</p>
          <p className="text-xs text-foreground-muted mt-1">Add an endpoint to receive real-time event notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map(wh => (
            <div key={wh.id} className="border border-border rounded-xl bg-background overflow-hidden">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-surface border border-border shrink-0 mt-0.5">
                    <Webhook size={14} className="text-foreground-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{wh.name}</span>
                      <StatusBadge active={wh.is_active} failCount={wh.failure_count} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground-muted mb-2">
                      <code className="font-mono text-foreground-muted truncate max-w-[200px] sm:max-w-[280px]">{wh.url}</code>
                      <span>· Last triggered {timeAgo(wh.last_triggered_at)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {wh.events.map(ev => (
                        <span key={ev} className="px-1.5 py-0.5 rounded text-[10px] bg-surface border border-border text-foreground-muted">{ev}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {testResult?.id === wh.id && (
                    <span className={`text-xs flex items-center gap-1 ${testResult.status === "success" ? "text-success-text" : "text-error-text"}`}>
                      {testResult.status === "success"
                        ? <CheckCircle2 size={12} />
                        : <XCircle size={12} />}
                      {testResult.status === "success" ? `${testResult.code} · ${testResult.ms}ms` : "Failed"}
                    </span>
                  )}
                  <button
                    onClick={() => handleTest(wh.id)}
                    disabled={testing === wh.id || !wh.is_active}
                    className="px-3 py-1.5 text-xs border border-border rounded-lg text-foreground-muted hover:text-foreground hover:border-border transition-colors disabled:opacity-40"
                  >
                    {testing === wh.id ? <RefreshCw size={11} className="animate-spin" /> : "Test"}
                  </button>
                  <button
                    onClick={() => handleToggle(wh)}
                    className={`p-1.5 rounded-lg transition-colors ${wh.is_active ? "text-success-text hover:text-foreground-muted" : "text-foreground-muted hover:text-success-text"}`}
                    title={wh.is_active ? "Disable" : "Enable"}
                  >
                    {wh.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                  <button
                    onClick={() => toggleLogs(wh.id)}
                    className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground transition-colors"
                    title="View delivery logs"
                  >
                    {expandedLogs === wh.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    disabled={deleting === wh.id}
                    className="p-1.5 rounded-lg text-foreground-muted hover:text-error-text hover:brightness-110 transition-colors disabled:opacity-50"
                  >
                    {deleting === wh.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>

              {expandedLogs === wh.id && (
                <div className="border-t border-border bg-background px-4 py-3">
                  <p className="text-xs text-foreground-muted mb-2 font-medium">Recent Deliveries</p>
                  {logsLoading ? (
                    <div className="h-8 bg-surface rounded animate-pulse" />
                  ) : !logs[wh.id] || logs[wh.id].length === 0 ? (
                    <p className="text-xs text-foreground-muted">No deliveries yet — send a test ping above</p>
                  ) : (
                    <div className="space-y-1">
                      {logs[wh.id].map(log => (
                        <div key={log.id} className="flex items-center gap-3 text-xs">
                          {log.status === "success"
                            ? <CheckCircle2 size={11} className="text-success-text shrink-0" />
                            : <XCircle size={11} className="text-error-text shrink-0" />}
                          <span className="text-foreground-muted w-36 shrink-0">{log.event_type}</span>
                          <span className={log.response_status && log.response_status < 300 ? "text-success-text" : "text-foreground-muted"}>
                            {log.response_status ?? "—"}
                          </span>
                          <span className="text-foreground-muted">{log.duration_ms != null ? `${log.duration_ms}ms` : "—"}</span>
                          <span className="text-foreground-muted ml-auto">{timeAgo(log.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApiWebhooksPage() {
  const [tab, setTab] = useState<"keys" | "webhooks">("keys");

  return (
    <div className="px-4 sm:p-6 max-w-4xl mx-auto pb-24">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-surface border border-border">
            <Zap size={18} className="text-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">API & Webhooks</h1>
        </div>
        <p className="text-sm text-foreground-muted ml-11">
          Generate API keys for programmatic access and configure webhooks to receive real-time event notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="border border-border rounded-xl p-3 bg-background">
          <div className="flex items-center gap-2 mb-0.5">
            <Key size={13} className="text-foreground-muted" />
            <span className="text-xs text-foreground-muted font-medium">API Keys</span>
          </div>
          <p className="text-xs text-foreground-muted">Authenticate external systems via <code className="text-foreground-muted">Authorization: Bearer &lt;key&gt;</code></p>
        </div>
        <div className="border border-border rounded-xl p-3 bg-background">
          <div className="flex items-center gap-2 mb-0.5">
            <Webhook size={13} className="text-foreground-muted" />
            <span className="text-xs text-foreground-muted font-medium">Webhooks</span>
          </div>
          <p className="text-xs text-foreground-muted">Receive events via POST. Verify with <code className="text-foreground-muted">X-ZV-Signature: sha256=...</code></p>
        </div>
        <div className="border border-border rounded-xl p-3 bg-background">
          <div className="flex items-center gap-2 mb-0.5">
            <Shield size={13} className="text-foreground-muted" />
            <span className="text-xs text-foreground-muted font-medium">Security</span>
          </div>
          <p className="text-xs text-foreground-muted">Keys hashed at rest. Secrets shown once only. HMAC-SHA256 signing.</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-background border border-border rounded-xl mb-6 w-full sm:w-fit">
        {(["keys", "webhooks"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-black" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {t === "keys" ? <Key size={13} /> : <Webhook size={13} />}
            {t === "keys" ? "API Keys" : "Webhooks"}
          </button>
        ))}
      </div>

      {tab === "keys" ? <ApiKeysTab /> : <WebhooksTab />}
    </div>
  );
}
