"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import {
  Archive, Shield, AlertTriangle, CheckCircle2, Clock, Plus, Search, Filter,
  X, ChevronRight, Hash, FileText, Gavel, Eye, RefreshCw, Lock, Unlock,
  BarChart3, HardDrive, Activity, Package, Share2, Scan,
} from "lucide-react";

type TabId = "items" | "packages" | "shares" | "scans";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "items", label: "Evidence Items", icon: Archive },
  { id: "packages", label: "Packages", icon: Package },
  { id: "shares", label: "External Shares", icon: Share2 },
  { id: "scans", label: "DLP Scans", icon: Scan },
];

interface VaultItem {
  id: string;
  item_id: string;
  source_type: string;
  source_id: string;
  source_system: string;
  vault_state: string;
  retention_class: string;
  legal_hold: boolean;
  risk_level: string;
  sensitivity: string;
  preserved_by_actor_id: string;
  preservation_reason: string;
  evidence_type: string | null;
  verification_count: number;
  created_at: string;
}

interface VaultPackage {
  id: string;
  package_id: string;
  package_type: string;
  title: string;
  status: string;
  item_count: number;
  created_by: string;
  created_at: string;
}

interface VaultShare {
  id: string;
  share_id: string;
  package_id: string;
  recipient_email: string;
  disclosure_mode: string;
  expires_at: string;
  current_views: number;
  max_views: number;
  revoked: boolean;
  created_by: string;
  created_at: string;
}

interface VaultScan {
  id: string;
  package_id: string;
  scan_status: string;
  detection_category: string | null;
  findings: any[];
  scan_report: string | null;
  completed_at: string | null;
  created_at: string;
}

interface VaultHealth {
  total_items: number;
  by_state: Record<string, number>;
  failed_verifications: number;
  quarantined: number;
  legal_hold_count: number;
}

const STATE_LABELS: Record<string, string> = {
  requested: "Requested", capturing: "Capturing", preserved: "Preserved",
  sealed: "Sealed", legal_hold: "Legal Hold", archived: "Archived",
  quarantined: "Quarantined", failed: "Failed",
};

const STATE_COLORS: Record<string, string> = {
  preserved: "text-success-text bg-success-bg border-success-border",
  sealed: "text-info-text bg-info-bg border-info-border",
  legal_hold: "text-error-text bg-error-bg border-error-border",
  archived: "text-info-text bg-info-bg border-info-border",
  quarantined: "text-warning-text bg-warning-bg border-warning-border",
  failed: "text-error-text bg-error-bg border-error-border",
  capturing: "text-info-text bg-info-bg border-info-border",
  requested: "text-info-text bg-info-bg border-info-border",
};

const RETENTION_COLORS: Record<string, string> = {
  standard: "text-info-text", extended: "text-info-text",
  regulated: "text-warning-text", legal_hold: "text-error-text",
  contractual_custom: "text-info-text",
};

const SCAN_STATUS_COLORS: Record<string, string> = {
  pending: "text-info-text bg-info-bg",
  scanning: "text-info-text bg-info-bg",
  passed: "text-success-text bg-success-bg",
  flagged: "text-warning-text bg-warning-bg",
  failed: "text-error-text bg-error-bg",
};

function fmt(ts: string) {
  try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "Invalid date"; }
}

function fmtDate(ts: string) {
  try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "Invalid date"; }
}

function StatCard({ label, value, color, onClick }: { label: string; value: number; color: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`bg-surface border border-border rounded-xl p-4 ${onClick ? 'cursor-pointer hover:border-border' : ''}`}>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-foreground-muted mt-1">{label}</div>
    </div>
  );
}

export default function EvidenceVaultPage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("items");
  const [health, setHealth] = useState<VaultHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Items state
  const [items, setItems] = useState<VaultItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [sourceType, setSourceType] = useState("");
  const [vaultState, setVaultState] = useState("");
  const [retentionClass, setRetentionClass] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Packages state
  const [packages, setPackages] = useState<VaultPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [pkgTotal, setPkgTotal] = useState(0);
  const [pkgTypeFilter, setPkgTypeFilter] = useState("");
  const [pkgStatusFilter, setPkgStatusFilter] = useState("");
  const [showCreatePackage, setShowCreatePackage] = useState(false);

  // Shares state
  const [shares, setShares] = useState<VaultShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [sharesTotal, setSharesTotal] = useState(0);
  const [showCreateShare, setShowCreateShare] = useState(false);

  // DLP Scans state
  const [scans, setScans] = useState<VaultScan[]>([]);
  const [scansLoading, setScansLoading] = useState(false);
  const [scansTotal, setScansTotal] = useState(0);
  const [showRunScan, setShowRunScan] = useState(false);

  const fetchItems = useCallback(async (cursorVal?: string) => {
    setItemsLoading(true);
    try {
      const params = new URLSearchParams();
      if (sourceType) params.set("source_type", sourceType);
      if (vaultState) params.set("vault_state", vaultState);
      if (retentionClass) params.set("retention_class", retentionClass);
      if (cursorVal) params.set("cursor", cursorVal);
      params.set("limit", "20");
      const res = await api.get(`/api/evidence-vault/items?${params.toString()}`);
      if (res.success) {
        setItems(prev => cursorVal ? [...prev, ...res.data] : res.data);
        setCursor(res.next_cursor);
        setTotal(res.total || 0);
      }
    } catch (e: any) { setError(e.message); }
    finally { setItemsLoading(false); }
  }, [sourceType, vaultState, retentionClass]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await api.get("/api/evidence-vault/health");
      if (res.success) setHealth(res.data);
    } catch (e: any) { console.warn("Health check failed:", e?.message); }
  }, []);

  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      const params = new URLSearchParams();
      if (pkgTypeFilter) params.set("package_type", pkgTypeFilter);
      if (pkgStatusFilter) params.set("status", pkgStatusFilter);
      const res = await api.get(`/api/evidence-vault/packages?${params.toString()}`);
      if (res.success) {
        setPackages(res.data || []);
        setPkgTotal(res.total || 0);
      }
    } catch (e: any) { setError(e.message); }
    finally { setPackagesLoading(false); }
  }, [pkgTypeFilter, pkgStatusFilter]);

  const fetchShares = useCallback(async () => {
    setSharesLoading(true);
    try {
      const res = await api.get("/api/evidence-vault/shares");
      if (res.success) {
        setShares(res.data || []);
        setSharesTotal(res.total || 0);
      }
    } catch (e: any) { setError(e.message); }
    finally { setSharesLoading(false); }
  }, []);

  const fetchScans = useCallback(async () => {
    setScansLoading(true);
    try {
      const res = await api.get("/api/evidence-vault/dlp-scans");
      if (res.success) {
        setScans(res.data || []);
        setScansTotal(res.total || 0);
      }
    } catch (e: any) { setError(e.message); }
    finally { setScansLoading(false); }
  }, []);

  useEffect(() => {
    if (rolesLoading) return;
    if (!hasRole(["ADMIN"]) && !hasRole(["WORKSPACE_OWNER"]) && !hasRole(["GOVERNANCE_ADMIN"]) && !hasRole(["AUDITOR"])) {
      setError("Unauthorized. You do not have access to the Evidence Vault.");
      return;
    }
    fetchHealth();
  }, [rolesLoading, fetchHealth, hasRole]);

  useEffect(() => {
    if (activeTab === "items") fetchItems();
    else if (activeTab === "packages") fetchPackages();
    else if (activeTab === "shares") fetchShares();
    else if (activeTab === "scans") fetchScans();
  }, [activeTab, fetchItems, fetchPackages, fetchShares, fetchScans]);

  const TabIcon = TABS.find(t => t.id === activeTab)?.icon || Archive;

  if (rolesLoading) return <div className="p-8 text-foreground-muted">Loading...</div>;
  if (error) return <div className="p-8 text-error-text">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Archive className="w-5 h-5 text-foreground-muted" /> Evidence Vault
          </h1>
          <p className="text-xs text-foreground-muted mt-1">Preserved evidence, integrity verification, and legal-grade export</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { if (activeTab === "items") fetchItems(); else if (activeTab === "packages") fetchPackages(); else if (activeTab === "shares") fetchShares(); else fetchScans(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface text-xs text-foreground/70 rounded-lg hover:bg-surface-hover">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {activeTab === "items" && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-info-text text-xs text-foreground rounded-lg hover:brightness-110">
              <Plus className="w-3.5 h-3.5" /> Preserve
            </button>
          )}
          {activeTab === "packages" && (
            <button onClick={() => setShowCreatePackage(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-info-text text-xs text-foreground rounded-lg hover:brightness-110">
              <Plus className="w-3.5 h-3.5" /> Create Package
            </button>
          )}
          {activeTab === "shares" && (
            <button onClick={() => setShowCreateShare(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-info-text text-xs text-foreground rounded-lg hover:brightness-110">
              <Plus className="w-3.5 h-3.5" /> New Share
            </button>
          )}
          {activeTab === "scans" && (
            <button onClick={() => setShowRunScan(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-info-text text-xs text-foreground rounded-lg hover:brightness-110">
              <Scan className="w-3.5 h-3.5" /> Run Scan
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      {activeTab === "items" && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard label="Total Preserved" value={health?.total_items || 0} color="text-foreground" />
          <StatCard label="Legal Holds" value={health?.legal_hold_count || 0} color="text-error-text" />
          <StatCard label="Needs Verify" value={health?.failed_verifications || 0} color={health?.failed_verifications ? "text-warning-text" : "text-success-text"} />
          <StatCard label="Quarantined" value={health?.quarantined || 0} color="text-warning-text" />
          <StatCard label="Preserved" value={health?.by_state?.preserved || 0} color="text-success-text" />
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors ${
              activeTab === tab.id ? "text-warning-text border-warning-border" : "text-foreground-muted border-transparent hover:text-foreground hover:border-border"
            }`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Items Tab ──────────────────────────────────────── */}
      {activeTab === "items" && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
              <Filter className="w-3 h-3" /> Filters:
            </div>
            <select value={sourceType} onChange={e => { setSourceType(e.target.value); setCursor(null); }}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
              <option value="">All Sources</option>
              <option value="audit_event">Audit Event</option>
              <option value="forensic_case">Forensic Case</option>
              <option value="social_payload">Social Payload</option>
              <option value="ai_output">AI Output</option>
              <option value="policy_snapshot">Policy Snapshot</option>
              <option value="identity_proof">Identity Proof</option>
            </select>
            <select value={vaultState} onChange={e => { setVaultState(e.target.value); setCursor(null); }}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
              <option value="">All States</option>
              <option value="preserved">Preserved</option>
              <option value="sealed">Sealed</option>
              <option value="legal_hold">Legal Hold</option>
              <option value="archived">Archived</option>
              <option value="quarantined">Quarantined</option>
              <option value="failed">Failed</option>
            </select>
            <select value={retentionClass} onChange={e => { setRetentionClass(e.target.value); setCursor(null); }}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
              <option value="">All Retention</option>
              <option value="standard">Standard</option>
              <option value="extended">Extended</option>
              <option value="regulated">Regulated</option>
              <option value="legal_hold">Legal Hold</option>
            </select>
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-foreground-muted">
                    <th className="text-left p-3 font-medium">Item ID</th>
                    <th className="text-left p-3 font-medium">Source</th>
                    <th className="text-left p-3 font-medium">State</th>
                    <th className="text-left p-3 font-medium">Retention</th>
                    <th className="text-left p-3 font-medium">Legal Hold</th>
                    <th className="text-left p-3 font-medium">Risk</th>
                    <th className="text-left p-3 font-medium">Preserved By</th>
                    <th className="text-left p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-border hover:bg-surface cursor-pointer"
                      onClick={() => router.push(`/evidence/evidence-vault/items/${item.id}`)}>
                      <td className="p-3 text-foreground font-mono text-[11px]">{item.item_id}</td>
                      <td className="p-3">
                        <span className="text-foreground/70">{item.source_type}</span>
                        <span className="text-foreground-muted ml-1">:{item.source_id.substring(0, 12)}</span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${STATE_COLORS[item.vault_state] || 'text-info-text border-info-border bg-info-bg'}`}>
                          {STATE_LABELS[item.vault_state] || item.vault_state}
                        </span>
                      </td>
                      <td className={`p-3 ${RETENTION_COLORS[item.retention_class] || 'text-foreground-muted'}`}>{item.retention_class}</td>
                      <td className="p-3">
                        {item.legal_hold ? <span className="text-error-text flex items-center gap-1"><Lock className="w-3 h-3" /> Held</span> : <span className="text-foreground-muted">—</span>}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                          item.risk_level === 'critical' ? 'bg-error-bg text-error-text' :
                          item.risk_level === 'high' ? 'bg-warning-bg text-warning-text' :
                          item.risk_level === 'medium' ? 'bg-warning-bg text-warning-text' : 'bg-info-bg text-info-text'
                        }`}>{item.risk_level}</span>
                      </td>
                      <td className="p-3 text-foreground-muted font-mono text-[11px]">{item.preserved_by_actor_id}</td>
                      <td className="p-3 text-foreground-muted text-[11px]">{fmt(item.created_at)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && !itemsLoading && <tr><td colSpan={8} className="p-8 text-center text-foreground-muted">No evidence items preserved yet.</td></tr>}
                </tbody>
              </table>
            </div>
            {cursor && (
              <div className="p-3 text-center border-t border-border">
                <button onClick={() => fetchItems(cursor)} className="text-xs text-info-text hover:text-info-text">Load More</button>
              </div>
            )}
          </div>
          <div className="text-xs text-foreground-muted mt-2">{total} total items</div>
        </>
      )}

      {/* ─── Packages Tab ───────────────────────────────────── */}
      {activeTab === "packages" && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-foreground-muted"><Filter className="w-3 h-3" /> Filters:</div>
            <select value={pkgTypeFilter} onChange={e => setPkgTypeFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
              <option value="">All Types</option>
              <option value="regulatory_response">Regulatory</option>
              <option value="litigation_hold">Litigation</option>
              <option value="customer_assurance">Customer</option>
              <option value="board_executive">Board</option>
              <option value="security_incident">Security</option>
              <option value="ai_governance">AI Governance</option>
            </select>
            <select value={pkgStatusFilter} onChange={e => setPkgStatusFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground">
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="sealed">Sealed</option>
              <option value="exporting">Exporting</option>
              <option value="exported">Exported</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-foreground-muted">
                  <th className="text-left p-3 font-medium">Package ID</th>
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Items</th>
                  <th className="text-left p-3 font-medium">Created By</th>
                  <th className="text-left p-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {packages.map(pkg => (
                  <tr key={pkg.id} className="border-b border-border hover:bg-surface">
                    <td className="p-3 text-foreground font-mono text-[11px]">{pkg.package_id}</td>
                    <td className="p-3 text-foreground">{pkg.title}</td>
                    <td className="p-3 text-foreground/70">{pkg.package_type.replace(/_/g, ' ')}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${
                        pkg.status === 'sealed' ? 'text-info-text border-info-border bg-info-bg' :
                        pkg.status === 'exported' ? 'text-success-text border-success-border bg-success-bg' :
                        pkg.status === 'draft' ? 'text-info-text border-info-border bg-info-bg' :
                        'text-error-text border-error-border bg-error-bg'
                      }`}>{pkg.status}</span>
                    </td>
                    <td className="p-3 text-foreground-muted">{pkg.item_count}</td>
                    <td className="p-3 text-foreground-muted font-mono text-[11px]">{pkg.created_by}</td>
                    <td className="p-3 text-foreground-muted text-[11px]">{fmt(pkg.created_at)}</td>
                  </tr>
                ))}
                {packages.length === 0 && !packagesLoading && <tr><td colSpan={7} className="p-8 text-center text-foreground-muted">No packages created yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-foreground-muted mt-2">{pkgTotal} total packages</div>
        </>
      )}

      {/* ─── Shares Tab ──────────────────────────────────────── */}
      {activeTab === "shares" && (
        <>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-foreground-muted">
                  <th className="text-left p-3 font-medium">Share ID</th>
                  <th className="text-left p-3 font-medium">Recipient</th>
                  <th className="text-left p-3 font-medium">Mode</th>
                  <th className="text-left p-3 font-medium">Expires</th>
                  <th className="text-left p-3 font-medium">Views</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {shares.map(share => (
                  <tr key={share.id} className="border-b border-border">
                    <td className="p-3 text-foreground font-mono text-[11px]">{share.share_id}</td>
                    <td className="p-3 text-foreground">{share.recipient_email}</td>
                    <td className="p-3 text-foreground/70 text-[10px]">{share.disclosure_mode.replace(/_/g, ' ')}</td>
                    <td className="p-3 text-foreground-muted text-[11px]">{fmtDate(share.expires_at)}</td>
                    <td className="p-3 text-foreground-muted}">{share.current_views}{share.max_views > 0 ? `/${share.max_views}` : ''}</td>
                    <td className="p-3">
                      {share.revoked
                        ? <span className="text-error-text text-[10px]">Revoked</span>
                        : new Date(share.expires_at) < new Date()
                          ? <span className="text-warning-text text-[10px]">Expired</span>
                          : <span className="text-success-text text-[10px]">Active</span>
                      }
                    </td>
                    <td className="p-3 text-foreground-muted text-[11px]">{fmt(share.created_at)}</td>
                  </tr>
                ))}
                {shares.length === 0 && !sharesLoading && <tr><td colSpan={7} className="p-8 text-center text-foreground-muted">No external shares created yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-foreground-muted mt-2">{sharesTotal} total shares</div>
        </>
      )}

      {/* ─── Scans Tab ───────────────────────────────────────── */}
      {activeTab === "scans" && (
        <>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-foreground-muted">
                  <th className="text-left p-3 font-medium">Scan ID</th>
                  <th className="text-left p-3 font-medium">Package</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Findings</th>
                  <th className="text-left p-3 font-medium">Report</th>
                  <th className="text-left p-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {scans.map(scan => (
                  <tr key={scan.id} className="border-b border-border">
                    <td className="p-3 text-foreground font-mono text-[11px]">{scan.id.substring(0, 8)}</td>
                    <td className="p-3 text-foreground/70 font-mono text-[11px]">{scan.package_id.substring(0, 8)}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${SCAN_STATUS_COLORS[scan.scan_status] || 'text-info-text'}`}>
                        {scan.scan_status}
                      </span>
                    </td>
                    <td className="p-3 text-foreground-muted text-[10px]">{scan.detection_category || '—'}</td>
                    <td className="p-3 text-foreground-muted">{Array.isArray(scan.findings) ? scan.findings.length : 0}</td>
                    <td className="p-3 text-foreground-muted text-[10px] max-w-[200px] truncate">{scan.scan_report || '—'}</td>
                    <td className="p-3 text-foreground-muted text-[11px]">{fmt(scan.created_at)}</td>
                  </tr>
                ))}
                {scans.length === 0 && !scansLoading && <tr><td colSpan={7} className="p-8 text-center text-foreground-muted">No DLP scans run yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-foreground-muted mt-2">{scansTotal} total scans</div>
        </>
      )}

      {/* Create Preservation Modal */}
      {showCreate && (
        <CreatePreservationModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchItems(); fetchHealth(); }} />
      )}

      {/* Create Package Modal */}
      {showCreatePackage && (
        <CreatePackageModal onClose={() => setShowCreatePackage(false)} onCreated={() => { setShowCreatePackage(false); fetchPackages(); }} />
      )}

      {/* Create Share Modal */}
      {showCreateShare && (
        <CreateShareModal onClose={() => setShowCreateShare(false)} onCreated={() => { setShowCreateShare(false); fetchShares(); }} />
      )}

      {/* Run Scan Modal */}
      {showRunScan && (
        <RunScanModal onClose={() => setShowRunScan(false)} onCreated={() => { setShowRunScan(false); fetchScans(); }} />
      )}
    </div>
  );
}

// ─── Create Preservation Modal ─────────────────────────────────────────────────

function CreatePreservationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [sourceType, setSourceType] = useState("audit_event");
  const [sourceId, setSourceId] = useState("");
  const [sourceSystem, setSourceSystem] = useState("audit_trail");
  const [reason, setReason] = useState("");
  const [retentionClass, setRetentionClass] = useState("standard");
  const [riskLevel, setRiskLevel] = useState("medium");
  const [evidenceType, setEvidenceType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!sourceId || !reason) { setError("source_id and preservation_reason are required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await api.post("/api/evidence-vault/items/preserve", {
        source_type: sourceType, source_id: sourceId,
        source_system: sourceSystem, preservation_reason: reason,
        retention_class: retentionClass, risk_level: riskLevel,
        evidence_type: evidenceType || undefined,
      });
      if (res.success) onCreated();
      else setError(res.error || "Failed to preserve");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Archive className="w-4 h-4" /> Preserve Evidence</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-foreground-muted hover:text-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Source Type</label>
            <select value={sourceType} onChange={e => setSourceType(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground">
              <option value="audit_event">Audit Event</option>
              <option value="forensic_case">Forensic Case</option>
              <option value="ai_output">AI Output</option>
              <option value="policy_snapshot">Policy Snapshot</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Source ID</label>
            <input value={sourceId} onChange={e => setSourceId(e.target.value)} placeholder="AUD-2026-00018492"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Source System</label>
            <input value={sourceSystem} onChange={e => setSourceSystem(e.target.value)} placeholder="audit_trail"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Preservation Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for preservation"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">Retention Class</label>
              <select value={retentionClass} onChange={e => setRetentionClass(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground">
                <option value="standard">Standard (2yr)</option>
                <option value="extended">Extended (7yr)</option>
                <option value="regulated">Regulated (10yr)</option>
                <option value="legal_hold">Legal Hold</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">Risk Level</label>
              <select value={riskLevel} onChange={e => setRiskLevel(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          {error && <div className="text-xs text-error-text">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-foreground-muted bg-surface rounded-lg hover:bg-surface-hover">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-xs text-foreground bg-info-text rounded-lg hover:brightness-110 disabled:opacity-50">
              {saving ? "Preserving..." : "Preserve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Package Modal ──────────────────────────────────────────────────────

function CreatePackageModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [pkgType, setPkgType] = useState("regulatory_response");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title) { setError("Title is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await api.post("/api/evidence-vault/packages", { package_type: pkgType, title, description: description || undefined });
      if (res.success) onCreated();
      else setError(res.error || "Failed to create");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Package className="w-4 h-4" /> Create Package</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-foreground-muted hover:text-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Package Type</label>
            <select value={pkgType} onChange={e => setPkgType(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground">
              <option value="regulatory_response">Regulatory Response</option>
              <option value="litigation_hold">Litigation Hold</option>
              <option value="customer_assurance">Customer Assurance</option>
              <option value="board_executive">Board / Executive</option>
              <option value="security_incident">Security Incident</option>
              <option value="ai_governance">AI Governance</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Package title"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" rows={2} />
          </div>
          {error && <div className="text-xs text-error-text">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-foreground-muted bg-surface rounded-lg hover:bg-surface-hover">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-xs text-foreground bg-info-text rounded-lg hover:brightness-110 disabled:opacity-50">
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Share Modal ────────────────────────────────────────────────────────

function CreateShareModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [packageId, setPackageId] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxViews, setMaxViews] = useState(0);
  const [watermark, setWatermark] = useState("");
  const [allowDownload, setAllowDownload] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!packageId || !recipientEmail || !expiresAt) { setError("package_id, recipient_email, and expires_at are required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await api.post("/api/evidence-vault/shares", {
        package_id: packageId, recipient_email: recipientEmail,
        recipient_name: recipientName || undefined,
        expires_at: new Date(expiresAt).toISOString(),
        max_views: maxViews || undefined,
        watermark: watermark || undefined,
        allow_download: allowDownload,
      });
      if (res.success) onCreated();
      else setError(res.error || "Failed to create share");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Share2 className="w-4 h-4" /> Create External Share</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-foreground-muted hover:text-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Package ID</label>
            <input value={packageId} onChange={e => setPackageId(e.target.value)} placeholder="Sealed package UUID"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Recipient Email</label>
            <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="auditor@example.com"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Recipient Name</label>
            <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Optional"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Expires At</label>
            <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">Max Views</label>
              <input type="number" value={maxViews} onChange={e => setMaxViews(parseInt(e.target.value) || 0)} placeholder="0 = unlimited"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
            </div>
            <div>
              <label className="text-xs text-foreground-muted mb-1 block">Watermark</label>
              <input value={watermark} onChange={e => setWatermark(e.target.value)} placeholder="e.g. Confidential"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground-muted">
            <input type="checkbox" checked={allowDownload} onChange={e => setAllowDownload(e.target.checked)}
              className="rounded border-border bg-surface" />
            Allow download
          </label>
          {error && <div className="text-xs text-error-text">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-foreground-muted bg-surface rounded-lg hover:bg-surface-hover">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-xs text-foreground bg-info-text rounded-lg hover:brightness-110 disabled:opacity-50">
              {saving ? "Creating..." : "Create Share"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Run DLP Scan Modal ────────────────────────────────────────────────────────

function RunScanModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [packageId, setPackageId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!packageId) { setError("package_id is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await api.post("/api/evidence-vault/dlp-scans", { package_id: packageId });
      if (res.success) onCreated();
      else setError(res.error || "Failed to run scan");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Scan className="w-4 h-4" /> Run DLP Scan</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-foreground-muted hover:text-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Package ID</label>
            <input value={packageId} onChange={e => setPackageId(e.target.value)} placeholder="Sealed package UUID"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
          </div>
          {error && <div className="text-xs text-error-text">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-foreground-muted bg-surface rounded-lg hover:bg-surface-hover">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-xs text-foreground bg-info-text rounded-lg hover:brightness-110 disabled:opacity-50">
              {saving ? "Scanning..." : "Run Scan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
