"use client";

import { useState, useEffect } from "react";
import { 
  Cpu, 
  Zap, 
  Globe, 
  Database, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Clock,
  DollarSign,
  BarChart3,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react";
import { api } from "@/lib/api";

interface UsageLog {
  id: string;
  resource_type: string;
  resource_name: string;
  quantity: number;
  unit: string;
  cost_usd: number;
  timestamp: string;
}

interface SummaryItem {
  quantity: number;
  cost: number;
  unit: string;
}

export default function ResourceMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [summary, setSummary] = useState<Record<string, SummaryItem>>({});
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const context = await api.get('/api/v1/user/context');
      if (context.success && context.data.workspace_id) {
        setWorkspaceId(context.data.workspace_id);
        const result = await api.get(`/api/v1/monitoring/usage?workspaceId=${context.data.workspace_id}`);
        if (result.success) {
          setLogs(result.data.recent_logs || []);
          setSummary(result.data.summary || {});
        }
      }
    } catch (err) {
      console.error("Failed to fetch monitoring data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'AI_TOKENS': return <Zap className="w-5 h-5" />;
      case 'SOCIAL_API_CALLS': return <Globe className="w-5 h-5" />;
      case 'STORAGE_MB': return <Database className="w-5 h-5" />;
      default: return <Cpu className="w-5 h-5" />;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'AI_TOKENS': return 'text-amber-500 bg-amber-500/10';
      case 'SOCIAL_API_CALLS': return 'text-indigo-500 bg-indigo-500/10';
      case 'STORAGE_MB': return 'text-emerald-500 bg-emerald-500/10';
      default: return 'text-zinc-500 bg-zinc-500/10';
    }
  };

  const totalCost = Object.values(summary).reduce((acc, curr) => acc + curr.cost, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 text-indigo-400 mb-2">
            <Activity className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Real-time Systems Telemetry</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Resource Monitoring</h1>
          <p className="text-zinc-500 mt-1 font-medium italic">Tracking token velocity, API saturation, and infrastructure cost exposure.</p>
        </div>

        <div className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 p-2 rounded-2xl">
          <div className="px-4 py-2">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Est. Monthly Burn</p>
            <p className="text-xl font-black text-white">${(totalCost * 30).toFixed(2)}</p>
          </div>
          <button 
            onClick={fetchData}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* AI Tokens Card */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap className="w-32 h-32 text-amber-500" />
          </div>
          <div className="flex items-center justify-between relative z-10">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500">
              <Zap className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-black">
              <TrendingUp className="w-3 h-3" /> +12% VS LAST HR
            </span>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Intelligence Consumption</h3>
            <p className="text-4xl font-black text-white mt-1">
              {summary['AI_TOKENS']?.quantity?.toLocaleString() || '0'} <span className="text-sm text-zinc-500 font-bold">TOKENS</span>
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black text-zinc-600 uppercase">
              <span>Quota Used</span>
              <span>42%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: '42%' }} />
            </div>
          </div>
        </div>

        {/* API Latency / Calls Card */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Globe className="w-32 h-32 text-indigo-500" />
          </div>
          <div className="flex items-center justify-between relative z-10">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
              <Globe className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-black">
              <Activity className="w-3 h-3" /> STABLE
            </span>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Social API Velocity</h3>
            <p className="text-4xl font-black text-white mt-1">
              {summary['SOCIAL_API_CALLS']?.quantity?.toLocaleString() || '0'} <span className="text-sm text-zinc-500 font-bold">CALLS</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
             <div className="flex-1 h-8 bg-zinc-800/30 rounded-lg flex items-end gap-1 p-1">
                {[4,7,3,8,5,9,6,4,8,5,3,7,4,8].map((h, i) => (
                  <div key={i} className="flex-1 bg-indigo-500/40 rounded-sm" style={{ height: `${h * 10}%` }} />
                ))}
             </div>
          </div>
        </div>

        {/* Infrastructure Cost Card */}
        <div className="bg-indigo-600 rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(79,70,229,0.3)]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-[40px] rounded-full -mr-24 -mt-24" />
          
          <div className="space-y-4 relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white backdrop-blur-md">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-[10px] font-black text-indigo-100 uppercase tracking-widest opacity-80">Total Operational Spend</h3>
            <p className="text-5xl font-black text-white italic tracking-tighter">${totalCost.toFixed(2)}</p>
          </div>

          <button className="mt-8 w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
            EXPORT COST REPORT <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Live Consumption Feed */}
        <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] overflow-hidden flex flex-col">
          <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Live Consumption Feed</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Connected to Cluster-01</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px]">
            {loading ? (
              <div className="p-20 text-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              </div>
            ) : logs.length === 0 ? (
              <div className="p-20 text-center">
                <p className="text-zinc-600 font-bold italic uppercase tracking-widest">Waiting for resource triggers...</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {logs.map((log) => (
                  <div key={log.id} className="p-6 flex items-center justify-between hover:bg-zinc-800/20 transition-all group">
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getColorClass(log.resource_type)} border border-white/5`}>
                        {getIcon(log.resource_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white uppercase tracking-tight">{log.resource_name}</span>
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded-md border border-zinc-700">{log.resource_type}</span>
                        </div>
                        <p className="text-[10px] text-zinc-600 font-bold mt-1 uppercase tracking-tighter">
                          {new Date(log.timestamp).toLocaleTimeString()} • {new Date(log.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-white">+{log.quantity.toLocaleString()} {log.unit}</div>
                      <p className="text-[10px] text-emerald-500 font-black mt-1">${log.cost_usd.toFixed(4)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          
          {/* Storage Health */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-8 space-y-6">
             <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Knowledge Storage</h3>
             </div>
             
             <div className="space-y-4">
                <div className="p-4 bg-black/40 border border-zinc-800 rounded-2xl">
                   <div className="flex justify-between mb-2">
                      <span className="text-[10px] font-black text-zinc-500 uppercase">Vector DB Index</span>
                      <span className="text-[10px] font-black text-white">{summary['STORAGE_MB']?.quantity?.toFixed(1) || '0'} MB</span>
                   </div>
                   <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: '65%' }} />
                   </div>
                </div>
                
                <div className="p-4 bg-black/40 border border-zinc-800 rounded-2xl opacity-50">
                   <div className="flex justify-between mb-2">
                      <span className="text-[10px] font-black text-zinc-500 uppercase">Asset Blob Storage</span>
                      <span className="text-[10px] font-black text-white">4.2 GB</span>
                   </div>
                   <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: '12%' }} />
                   </div>
                </div>
             </div>
          </div>

          {/* System Alerts */}
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-[2.5rem] p-8 space-y-4">
             <div className="flex items-center gap-3 text-rose-500">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-widest">Policy Alerts</h3>
             </div>
             <p className="text-xs text-rose-500/70 leading-relaxed font-medium">
                No critical quota violations detected. 
                <span className="block mt-2 font-bold underline cursor-pointer hover:text-rose-400">Configure Auto-Pause Limits →</span>
             </p>
          </div>

          {/* Efficiency Widget */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-8 relative overflow-hidden">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">AI Efficiency</h3>
                <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[9px] font-black">HIGH</div>
             </div>
             <div className="flex items-end gap-2 h-24 mb-4">
                {[30, 45, 60, 40, 70, 85, 90].map((h, i) => (
                  <div key={i} className="flex-1 bg-indigo-500/20 rounded-t-lg relative group">
                    <div className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t-lg transition-all duration-1000" style={{ height: `${h}%` }} />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity">{h}%</div>
                  </div>
                ))}
             </div>
             <p className="text-[10px] text-zinc-600 font-bold text-center uppercase tracking-widest">Tokens per Intent (7 Day)</p>
          </div>

        </div>
      </div>

    </div>
  );
}
