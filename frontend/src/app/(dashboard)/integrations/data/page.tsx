"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Database, 
  Cpu, 
  Globe, 
  RefreshCw, 
  Trash2, 
  Clock, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  Info,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Activity,
  History,
  ArrowLeft,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { api } from "@/lib/api";
import ConfirmActionModal from "@/components/ConfirmActionModal";

interface DataConnector {
  id: string;
  name: string;
  type: 'SUPABASE_TABLE' | 'REST_API';
  connection_config: {
    table_name?: string;
    url?: string;
  };
  mapping_config: {
    kb_id: string;
    title_key: string;
    content_key: string;
    url_key?: string;
  };
  sync_schedule: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SYNCING';
  last_sync_at: string | null;
  created_at: string;
}

interface SyncLog {
  id: string;
  connector_id: string;
  status: 'SUCCESS' | 'FAILED';
  records_synced: number;
  error_message: string | null;
  duration_ms: number;
  logs: string[];
  created_at: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
  type: string;
}

export default function DataPage() {
  const [connectors, setConnectors] = useState<DataConnector[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<DataConnector | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deleteConnectorId, setDeleteConnectorId] = useState<string | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Wizard state (rendered in full page space)
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [creating, setCreating] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  
  // Form fields
  const [name, setName] = useState("");
  const [type, setType] = useState<'SUPABASE_TABLE' | 'REST_API'>('SUPABASE_TABLE');
  const [tableName, setTableName] = useState("users");
  const [apiUrl, setApiUrl] = useState("");
  const [targetKb, setTargetKb] = useState("");
  const [titleKey, setTitleKey] = useState("name");
  const [contentKey, setContentKey] = useState("email");
  const [urlKey, setUrlKey] = useState("");
  const [schedule, setSchedule] = useState("manual");

  const fetchLogs = async (connectorId: string) => {
    setFetchingLogs(true);
    try {
      const res = await api.get(`/api/v1/integrations/connectors/${connectorId}/logs`);
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingLogs(false);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [connRes, kbRes] = await Promise.all([
        api.get('/api/v1/integrations/connectors'),
        api.get('/api/v1/knowledge/bases')
      ]);
      if (connRes.success) {
        setConnectors(connRes.data);
        if (connRes.data.length > 0) {
          setSelectedConnector(connRes.data[0]);
          fetchLogs(connRes.data[0].id);
        }
      }
      if (kbRes.success) {
        setBases(kbRes.data);
        if (kbRes.data.length > 0) {
          setTargetKb(kbRes.data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConnectorsOnly = async () => {
    try {
      const res = await api.get('/api/v1/integrations/connectors');
      if (res.success) {
        setConnectors(res.data);
        if (selectedConnector) {
          const updated = res.data.find((c: DataConnector) => c.id === selectedConnector.id);
          if (updated) setSelectedConnector(updated);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectConnector = (conn: DataConnector) => {
    setSelectedConnector(conn);
    fetchLogs(conn.id);
  };

  const handleCreateConnector = async () => {
    setCreating(true);
    try {
      const payload = {
        name,
        type,
        connection_config: type === 'SUPABASE_TABLE' ? { table_name: tableName } : { url: apiUrl },
        mapping_config: {
          kb_id: targetKb,
          title_key: titleKey,
          content_key: contentKey,
          url_key: urlKey || undefined
        },
        sync_schedule: schedule
      };

      const res = await api.post('/api/v1/integrations/connectors', payload);
      if (res.success) {
        setConnectors([res.data, ...connectors]);
        setSelectedConnector(res.data);
        fetchLogs(res.data.id);
        
        // Reset wizard
        setShowCreateWizard(false);
        setWizardStep(1);
        setName("");
        setTableName("users");
        setApiUrl("");
        setTitleKey("name");
        setContentKey("email");
        setUrlKey("");
        setSchedule("manual");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConnector = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConnectorId(id);
  };

  const confirmDeleteConnector = async () => {
    if (!deleteConnectorId) return;
    try {
      const res = await api.delete(`/api/v1/integrations/connectors/${deleteConnectorId}`);
      if (res.success) {
        const updated = connectors.filter(c => c.id !== deleteConnectorId);
        setConnectors(updated);
        if (selectedConnector?.id === deleteConnectorId) {
          if (updated.length > 0) {
            setSelectedConnector(updated[0]);
            fetchLogs(updated[0].id);
          } else {
            setSelectedConnector(null);
            setLogs([]);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteConnectorId(null);
    }
  };

  const handleTriggerSync = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncingId(id);
    try {
      const res = await api.post(`/api/v1/integrations/connectors/${id}/sync`, {});
      if (res.success) {
        setConnectors(connectors.map(c => c.id === id ? { ...c, status: 'SYNCING' } : c));
        if (selectedConnector?.id === id) {
          setSelectedConnector({ ...selectedConnector, status: 'SYNCING' });
        }
        
        let count = 0;
        if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = setInterval(async () => {
          await fetchConnectorsOnly();
          if (selectedConnector?.id === id) {
            await fetchLogs(id);
          }
          count++;
          if (count > 3) {
            clearInterval(syncIntervalRef.current!);
            syncIntervalRef.current = null;
            setSyncingId(null);
          }
        }, 15000);
      }
    } catch (err) {
      console.error(err);
      setSyncingId(null);
    }
  };

  const activeBasesText = (kbId: string) => bases.find(b => b.id === kbId)?.name || 'Unknown Base';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 px-4">
      
      {/* ─── CASE A: FULL SCREEN CREATE PIPELINE WORKSPACE (No modal - uses full container space) ─── */}
      {showCreateWizard ? (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 pb-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setShowCreateWizard(false); setWizardStep(1); }}
                className="p-2 bg-surface border border-border hover:bg-surface-hover rounded-lg text-foreground-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">New Data Connection</h1>
                <p className="text-foreground-muted text-sm mt-0.5">Connect a data source and choose where to save it — we&apos;ll handle the rest automatically.</p>
              </div>
            </div>

            {/* Mobile step indicator */}
            <p className="md:hidden text-xs text-foreground-muted font-semibold">Step {wizardStep} of 3</p>

            {/* Stepper Progress */}
            <div className="hidden md:flex items-center gap-6 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full ${wizardStep >= 1 ? 'bg-info-text text-foreground' : 'bg-surface-hover text-foreground-muted'}`}>1</span>
                <span className={wizardStep >= 1 ? 'text-foreground' : 'text-foreground-muted'}>Choose Source</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-650" />
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full ${wizardStep >= 2 ? 'bg-info-text text-foreground' : 'bg-surface-hover text-foreground-muted'}`}>2</span>
                <span className={wizardStep >= 2 ? 'text-foreground' : 'text-foreground-muted'}>Map Your Fields</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-650" />
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full ${wizardStep >= 3 ? 'bg-info-text text-foreground' : 'bg-surface-hover text-foreground-muted'}`}>3</span>
                <span className={wizardStep >= 3 ? 'text-foreground' : 'text-foreground-muted'}>Save Location & Schedule</span>
              </div>
            </div>
          </div>

          {/* Two-Column Workspace Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Form Settings (7 cols) */}
            <div className="lg:col-span-7 bg-surface border border-border/80 rounded-xl p-8 space-y-6">
              
              {/* STEP 1: Define Connection Source */}
              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Where is your data coming from?</h3>
                    <p className="text-xs text-foreground-muted mt-1">Give it a name so you can recognize it later, then pick the type of source.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Connection Name</label>
                    <input 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Our Team Members, Product Catalog, Blog Articles"
                      className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground-muted outline-none focus:border-info-border text-sm transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Data Source Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setType('SUPABASE_TABLE')}
                        className={`p-5 rounded-lg border text-left transition-all flex flex-col items-start ${
                          type === 'SUPABASE_TABLE' 
                            ? 'bg-info-text/5 border-info-border text-foreground' 
                            : 'bg-card/20 border-zinc-850 text-foreground-muted hover:border-border'
                        }`}
                      >
                        <Database className="w-5 h-5 text-info-text mb-2" />
                        <span className="font-semibold text-xs text-foreground">Organization Database</span>
                        <span className="text-[10px] text-foreground-muted mt-1">Read data stored in your team&apos;s workspace database.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setType('REST_API')}
                        className={`p-5 rounded-lg border text-left transition-all flex flex-col items-start ${
                          type === 'REST_API' 
                            ? 'bg-info-text/5 border-info-border text-foreground' 
                            : 'bg-card/20 border-zinc-850 text-foreground-muted hover:border-border'
                        }`}
                      >
                        <Globe className="w-5 h-5 text-success-text mb-2" />
                        <span className="font-semibold text-xs text-foreground">External Web URL</span>
                        <span className="text-[10px] text-foreground-muted mt-1">Pull live content from any public web address.</span>
                      </button>
                    </div>
                  </div>

                  {type === 'SUPABASE_TABLE' ? (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Which data would you like to sync?</label>
                      <select 
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground outline-none focus:border-info-border text-sm transition-all"
                      >
                        <option value="users">Team Members</option>
                        <option value="agents">AI Agents</option>
                        <option value="media_library">Media Library</option>
                        <option value="connected_accounts">Connected Accounts</option>
                        <option value="evidence_packs">Evidence Packs</option>
                      </select>
                      <div className="p-3 bg-card/45 border border-zinc-850 rounded-lg flex gap-2 text-foreground-muted text-[10px] leading-normal font-medium">
                        <Info className="w-4 h-4 text-info-text shrink-0" />
                        Only your organization&apos;s data is accessible. Your data is always kept separate from other organizations.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Web Address (URL)</label>
                      <input 
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        placeholder="https://yoursite.com/api/products"
                        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground-muted outline-none focus:border-info-border text-sm transition-all"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Schema Field Mapping */}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Which fields should we read?</h3>
                    <p className="text-xs text-foreground-muted mt-1">Tell us which column or property name from your data source holds each piece of information.</p>
                  </div>

                  <div className="p-4 bg-card/40 border border-zinc-850 rounded-lg flex gap-3 text-foreground-muted text-xs leading-normal">
                    <Info className="w-5 h-5 text-info-text shrink-0 mt-0.5" />
                    <div>
                      For example, if your data has a column called &quot;product_name&quot;, enter that as your Title field. We&apos;ll use those values when saving entries.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Title / Name Field</label>
                      <input 
                        value={titleKey}
                        onChange={(e) => setTitleKey(e.target.value)}
                        placeholder="e.g. name, title, product_name"
                        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground-muted outline-none focus:border-info-border text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Main Content / Description Field</label>
                      <input 
                        value={contentKey}
                        onChange={(e) => setContentKey(e.target.value)}
                        placeholder="e.g. description, bio, body, email"
                        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground-muted outline-none focus:border-info-border text-xs"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Website / Link Field (Optional)</label>
                      <input 
                        value={urlKey}
                        onChange={(e) => setUrlKey(e.target.value)}
                        placeholder="e.g. website, url, source_link"
                        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground-muted outline-none focus:border-info-border text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Target Base & Frequency */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Where should the data be saved?</h3>
                    <p className="text-xs text-foreground-muted mt-1">Choose which Knowledge Base to add this data to, and how often it should automatically refresh.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Save Data Into</label>
                      {bases.length > 0 ? (
                        <select 
                          value={targetKb}
                          onChange={(e) => setTargetKb(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground outline-none focus:border-info-border text-sm"
                        >
                          {bases.map(kb => (
                            <option key={kb.id} value={kb.id}>{kb.name} ({kb.type.replace('_', ' ')})</option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-4 bg-card/20 border border-dashed border-zinc-850 rounded-lg text-center text-foreground-muted text-xs font-semibold">
                        No knowledge bases found. Go to Agents → Knowledge Bases to create one first.
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Sync Frequency</label>
                      <select 
                        value={schedule}
                        onChange={(e) => setSchedule(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground outline-none focus:border-info-border text-sm"
                      >
                        <option value="manual">Update manually</option>
                        <option value="hourly">Every hour</option>
                        <option value="daily">Once a day</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="pt-6 border-t border-border/80 flex items-center justify-between gap-4">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-5 py-2.5 border border-border hover:border-border text-foreground-muted hover:text-foreground rounded-lg text-xs font-semibold transition-all"
                  >
                    Go Back
                  </button>
                ) : (
                  <div />
                )}

                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep + 1)}
                    disabled={!name.trim() || (type === 'REST_API' && !apiUrl.trim())}
                    className="px-5 py-2.5 bg-info-text hover:bg-info-text disabled:opacity-50 text-foreground rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateConnector}
                    disabled={creating || !targetKb}
                    className="px-6 py-2.5 bg-info-text hover:bg-info-text disabled:opacity-50 text-foreground rounded-lg text-xs font-semibold transition-all flex items-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span>Finish & Save</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Live Pipeline Preview (5 cols) */}
            <div className="lg:col-span-5 bg-surface/10 border border-border/80 rounded-xl p-6 space-y-6">
              <h3 className="text-xs font-bold text-foreground-muted uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-info-text" />
                Preview
              </h3>

              <div className="space-y-5 text-xs text-foreground-muted">
                <p className="leading-relaxed">This shows a quick summary of what will be synced and where.</p>
                
                {/* Visual Flow diagram */}
                <div className="p-4 bg-card/40 border border-zinc-850 rounded-lg space-y-5">
                  
                  {/* Source Node */}
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <span className="font-semibold text-foreground-muted">Source:</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-zinc-850 text-foreground-muted rounded text-[10px] font-medium">
                        {type === 'SUPABASE_TABLE' ? {
                          'users': 'Team Members',
                          'agents': 'AI Agents',
                          'media_library': 'Media Library',
                          'connected_accounts': 'Connected Accounts',
                          'evidence_packs': 'Evidence Packs'
                        }[tableName] || tableName : 'Web Link'}
                      </span>
                    </div>
                  </div>

                  {/* Field Mappings visualization */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-foreground-muted">{titleKey || 'undefined'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-info-text" />
                      <span className="text-foreground font-medium">Title</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-foreground-muted">{contentKey || 'undefined'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-info-text" />
                      <span className="text-foreground font-medium">Content</span>
                    </div>

                    {urlKey && (
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-foreground-muted">{urlKey}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-info-text" />
                        <span className="text-foreground font-medium">Reference Link</span>
                      </div>
                    )}
                  </div>

                  {/* Target Node */}
                  <div className="flex items-center justify-between border-t border-zinc-900 pt-3">
                    <span className="font-semibold text-foreground-muted">Target:</span>
                    <span className="text-info-text font-bold">
                      {targetKb ? activeBasesText(targetKb) : 'Choose a destination'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-surface/25 border border-zinc-850 rounded-lg space-y-2">
                  <h4 className="font-bold text-foreground-muted text-xs">Duplicate protection enabled</h4>
                  <p className="text-[10px] text-foreground-muted leading-normal">
                    We automatically skip items already saved, so your data remains clean.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* ─── CASE B: DEFAULT PIPELINES WORKSPACE (Active connectors + logs side by side) ─── */
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Data Connections</h1>
              <p className="text-foreground-muted text-sm mt-1">Connect data sources to ensure your AI agents have up-to-date information.</p>
            </div>
            <button 
              onClick={() => setShowCreateWizard(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-info-text hover:bg-info-text text-foreground rounded-lg font-medium text-sm transition-all shadow-lg shadow-info-text/10 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Data Connection
            </button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface/40 border border-border/60 p-5 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-surface-hover text-info-text rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-foreground-muted font-semibold uppercase tracking-wider">Active Connections</p>
              <h4 className="text-xl font-bold text-foreground mt-0.5">{connectors.length} connected</h4>
              </div>
            </div>

            <div className="bg-surface/40 border border-border/60 p-5 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-surface-hover text-success-text rounded-lg">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-foreground-muted font-semibold uppercase tracking-wider">Current Status</p>
                <h4 className="text-xl font-bold text-foreground mt-0.5">
                  {connectors.some(c => c.status === 'SYNCING') ? 'Syncing...' : 'Idle'}
                </h4>
              </div>
            </div>

            <div className="bg-surface/40 border border-border/60 p-5 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-surface-hover text-foreground-muted rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-foreground-muted font-semibold uppercase tracking-wider">Data Privacy</p>
              <h4 className="text-xl font-bold text-foreground mt-0.5">Organization Isolated</h4>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT PANEL: Connectors (7 Columns) */}
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-xs font-bold text-foreground-muted uppercase tracking-widest px-1">Your Connections</h2>

              {connectors.length > 0 ? (
                <div className="space-y-3">
                  {connectors.map(conn => {
                    const isSelected = selectedConnector?.id === conn.id;
                    const isSyncing = conn.status === 'SYNCING';
                    return (
                      <div 
                        key={conn.id}
                        onClick={() => handleSelectConnector(conn)}
                        className={`p-5 rounded-xl border transition-all cursor-pointer relative ${
                          isSelected 
                            ? "bg-surface/70 border-info-border/65 shadow-md" 
                            : "bg-surface/10 border-border hover:bg-surface hover:border-border"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg mt-0.5 ${
                              conn.type === 'SUPABASE_TABLE' ? 'bg-info-text/10 text-info-text' : 'bg-success-text/10 text-success-text'
                            }`}>
                              {conn.type === 'SUPABASE_TABLE' ? <Database className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground text-sm">{conn.name}</h3>
                                <span className="px-2 py-0.5 bg-surface-hover text-foreground-muted rounded text-[9px] font-bold uppercase tracking-wider">
                                {conn.type === 'SUPABASE_TABLE' ? 'Database' : 'Web URL'}
                                </span>
                              </div>
                              
                              <p className="text-xs text-foreground-muted font-mono truncate max-w-[280px]">
                                {conn.type === 'SUPABASE_TABLE' 
                                  ? `public."${conn.connection_config.table_name}"` 
                                  : conn.connection_config.url}
                              </p>
                              <div className="flex items-center gap-x-4 mt-2 text-[10px] text-foreground-muted font-medium">
                              <span className="flex items-center gap-1">
                                <Cpu className="w-3.5 h-3.5" />
                                Saves to: <span className="text-foreground-muted">{activeBasesText(conn.mapping_config.kb_id)}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Updates: <span className="text-foreground-muted capitalize">{conn.sync_schedule}</span>
                              </span>
                            </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2.5 shrink-0 self-end md:self-center">
                            {isSyncing ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-info-text/15 text-info-text rounded-md text-xs font-semibold">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Syncing...</span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => handleTriggerSync(conn.id, e)}
                                disabled={syncingId !== null}
                                className="px-3 py-1.5 bg-surface-hover hover:bg-surface-hover text-foreground rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Sync</span>
                              </button>
                            )}

                            <button 
                              onClick={(e) => handleDeleteConnector(conn.id, e)}
                              className="p-1.5 bg-surface-hover/40 hover:bg-error-text/10 text-foreground-muted hover:text-error-text border border-border rounded-md transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Chevron Indicator */}
                        {isSelected && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:block">
                            <ChevronRight className="w-4 h-4 text-info-text" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-4 bg-surface/10">
                  <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center text-foreground-muted mx-auto">
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="max-w-xs mx-auto space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">No data connections yet</h3>
                    <p className="text-xs text-foreground-muted">Connect a data source so your AI agents always have fresh, relevant information to work with.</p>
                  </div>
                  <button
                    onClick={() => setShowCreateWizard(true)}
                    className="px-4 py-2 bg-info-text hover:bg-info-text text-foreground text-xs font-semibold rounded-md transition-all"
                  >
                    Add First Connection
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT PANEL: Execution History & Activity log (5 Columns) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold text-foreground-muted uppercase tracking-widest flex items-center gap-1.5">
                  <History className="w-4 h-4 text-foreground-muted" />
                  Sync History
                </h2>
                {selectedConnector && (
                  <button 
                    onClick={() => fetchLogs(selectedConnector.id)}
                    disabled={fetchingLogs}
                    className="p-1 hover:bg-surface-hover rounded text-foreground-muted hover:text-foreground transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${fetchingLogs ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>

              <div className="bg-surface border border-border/80 rounded-xl p-5 min-h-[460px] flex flex-col">
                {selectedConnector ? (
                  <div className="flex-1 flex flex-col space-y-5 overflow-y-auto max-h-[460px] pr-1">
                    
                    {/* Selected Item header */}
                    <div className="border-b border-border pb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{selectedConnector.name}</span>
                      <span className="text-xs text-foreground-muted font-mono">ID: {selectedConnector.id.slice(0, 8)}</span>
                    </div>

                    {fetchingLogs ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-foreground-muted py-16">
                        <Loader2 className="w-5 h-5 animate-spin text-info-text" />
                        <span className="text-xs font-medium">Updating...</span>
                      </div>
                    ) : logs.length > 0 ? (
                      <div className="space-y-5">
                        {logs.map((log, index) => (
                          <div key={log.id} className="border border-border/80 rounded-lg p-4 bg-card/20 space-y-3">
                            
                            {/* Log card head */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground-muted">SYNC #{logs.length - index}</span>
                              <span className="text-xs text-foreground-muted font-medium">
                                {new Date(log.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {log.status === 'SUCCESS' ? (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-success-text/10 text-success-text rounded text-[10px] font-bold uppercase">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Done
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-error-text/10 text-error-text rounded text-[10px] font-bold uppercase">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Error
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-foreground-muted font-semibold">
                                {log.status === 'SUCCESS' 
                                  ? `${log.records_synced} items in ${log.duration_ms}ms`
                                  : `Failed: ${log.error_message}`}
                              </span>
                            </div>

                            {/* Logs list */}
                            <div className="border-t border-zinc-900 pt-2.5 space-y-1.5 text-foreground-muted text-[11px] font-medium leading-relaxed font-mono bg-surface/15 p-2 rounded">
                              {log.logs && log.logs.map((line, lIdx) => {
                                const cleanLine = line.replace(/^\[.*?\]\s*/, '');
                                return (
                                  <div key={lIdx} className="flex gap-2 items-start">
                                    <span className="text-foreground-muted font-bold select-none">•</span>
                                    <span className="break-all">{cleanLine}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-foreground-muted gap-2 py-16">
                        <Clock className="w-8 h-8 text-foreground-muted" />
                        <div>
                          <p className="font-semibold text-foreground-muted text-sm">No updates yet</p>
                          <p className="text-xs text-foreground-muted mt-0.5">This connection hasn&apos;t run yet. Click &quot;Sync&quot; on the left to pull in data for the first time.</p>
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center p-6 text-center text-foreground-muted gap-3 py-16">
                    <Clock className="w-8 h-8 text-foreground-muted" />
                    <div>
                      <h3 className="font-semibold text-foreground-muted text-sm">Select a connection</h3>
                      <p className="text-xs text-foreground-muted mt-0.5 font-medium">Click on any data connection on the left to see its sync history and activity details.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </>
      )}

      <ConfirmActionModal
        open={deleteConnectorId !== null}
        variant="danger"
        title="Delete Connector"
        message="Are you sure you want to delete this integration connector? This will stop future automatic runs."
        confirmLabel="Delete"
        onConfirm={confirmDeleteConnector}
        onCancel={() => setDeleteConnectorId(null)}
      />
    </div>
  );
}
