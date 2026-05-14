"use client";

import { useState, useEffect } from "react";
import { 
  Shield, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  ChevronRight, 
  Loader2, 
  Pause, 
  Play, 
  Trash2, 
  Search, 
  MoreHorizontal,
  ArrowUpRight,
  Database,
  Users,
  Activity
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { api } from "@/lib/api";

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const fetchData = async () => {
    setFetching(true);
    try {
      const [orgResult, statsResult] = await Promise.all([
        api.get('/api/v1/superadmin/organizations'),
        api.get('/api/v1/superadmin/stats')
      ]);

      if (orgResult.success) setOrganizations(orgResult.data);
      if (statsResult.success) setStats(statsResult.stats);
    } catch (err) {
      console.error("Failed to fetch superadmin data", err);
      setError("Failed to synchronize platform data. Check connectivity.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePause = async (orgId: string) => {
    setActionLoading(orgId);
    try {
      await api.post(`/api/v1/superadmin/organizations/${orgId}/pause`, {});
      setSuccess("Organization paused. All workspaces restricted.");
      fetchData();
    } catch (err) {
      setError("Failed to pause organization.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (orgId: string) => {
    setActionLoading(orgId);
    try {
      await api.post(`/api/v1/superadmin/organizations/${orgId}/resume`, {});
      setSuccess("Organization resumed. Normal operations restored.");
      fetchData();
    } catch (err) {
      setError("Failed to resume organization.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm("Are you absolutely sure? This will delete the organization and ALL associated workspace data across the entire platform.")) return;
    
    setActionLoading(orgId);
    try {
      await api.delete(`/api/v1/superadmin/organizations/${orgId}`);
      setSuccess("Organization and all metadata purged successfully.");
      fetchData();
    } catch (err) {
      setError("Deletion failed. Organization may have active dependencies.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrgs = organizations.filter(org => 
    org.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500">Platform Control Engine</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Organization Oversight</h1>
          <p className="text-zinc-500 mt-2 text-lg font-medium">Manage enterprise clusters, monitor billing cycles, and enforce platform-wide status controls.</p>
        </div>
        
        {stats && (
          <div className="flex gap-4">
            <div className="px-6 py-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl flex flex-col">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Orgs</span>
              <span className="text-2xl font-black text-white">{stats.organizations}</span>
            </div>
            <div className="px-6 py-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl flex flex-col">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Workspaces</span>
              <span className="text-2xl font-black text-white">{stats.workspaces}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Users</div>
            <div className="text-xl font-black text-white">{stats?.totalUsers || 0}</div>
          </div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Post Volume</div>
            <div className="text-xl font-black text-white">{stats?.totalPosts || 0}</div>
          </div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-2xl">
            <Database className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Storage API</div>
            <div className="text-xl font-black text-white">HEALTHY</div>
          </div>
        </div>
        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6 flex items-center justify-between group cursor-pointer hover:bg-indigo-600/20 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl">
              <ArrowUpRight className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Subscription</div>
              <div className="text-xl font-black text-white">Tier Control</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="p-8 border-b border-zinc-800/50 bg-zinc-900/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <Building2 className="w-5 h-5 text-indigo-500" />
            Enterprise Clusters
          </h2>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text"
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-11 pr-4 text-sm text-white placeholder:text-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none w-full md:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/50">
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Organization</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Workspaces</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Next Billing</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {fetching ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                      <p className="text-zinc-500 font-bold italic">Synchronizing platform nodes...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredOrgs.length > 0 ? (
                filteredOrgs.map(org => (
                  <tr key={org.id} className={`hover:bg-zinc-800/20 transition-all group ${selectedOrgId === org.id ? 'bg-zinc-800/30' : ''}`}>
                    <td className="px-8 py-6 align-top">
                      <div 
                        className="flex flex-col cursor-pointer group/name"
                        onClick={() => setSelectedOrgId(selectedOrgId === org.id ? null : org.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white group-hover/name:text-indigo-400 transition-colors">{org.name}</span>
                          <ChevronRight className={`w-3 h-3 text-zinc-600 transition-transform ${selectedOrgId === org.id ? 'rotate-90 text-indigo-500' : ''}`} />
                        </div>
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">{org.plan_type} PLAN</span>
                        
                        {selectedOrgId === org.id && (
                          <div className="mt-4 p-4 bg-zinc-950/50 border border-zinc-800/50 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Primary Administrator</span>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                  <Shield className="w-3 h-3 text-indigo-400" />
                                </div>
                                <span className="text-xs font-bold text-zinc-200">{org.adminName}</span>
                              </div>
                              <span className="text-[11px] text-zinc-500 ml-8 font-medium italic">{org.adminEmail}</span>
                            </div>
                            
                            <div className="flex flex-col pt-2 border-t border-zinc-800/30">
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Organization Size</span>
                              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                                <Users className="w-3.5 h-3.5 text-zinc-500" />
                                <span>{org.memberCount} active personnel</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 align-top">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                        org.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : org.status === 'PAUSED'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${org.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {org.status}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-zinc-400 align-top">{org.workspaceCount} units</td>
                    <td className="px-8 py-6 align-top">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-300">{org.billingDate}</span>
                        <span className="text-[10px] text-zinc-600 font-medium">Est. {org.nextBillingAmount}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right align-top">
                      <div className="flex items-center justify-end gap-2">
                        {org.status === 'ACTIVE' ? (
                          <button 
                            onClick={() => handlePause(org.id)}
                            disabled={!!actionLoading}
                            className="p-2.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white border border-amber-500/20 rounded-xl transition-all"
                            title="Pause Organization"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleResume(org.id)}
                            disabled={!!actionLoading}
                            className="p-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 rounded-xl transition-all"
                            title="Resume Organization"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(org.id)}
                          disabled={!!actionLoading}
                          className="p-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-xl transition-all"
                          title="Delete Organization"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-2.5 bg-zinc-950 text-zinc-600 hover:text-white border border-zinc-800 rounded-xl transition-all">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-zinc-600 italic font-medium">No organizations found matching &quot;{searchTerm}&quot;</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer/Pagination Placeholder */}
        <div className="p-6 border-t border-zinc-800/30 bg-zinc-900/10 flex items-center justify-between">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            Showing {filteredOrgs.length} of {organizations.length} Clusters
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-black text-zinc-500 disabled:opacity-30" disabled>PREVIOUS</button>
            <button className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-black text-zinc-500 disabled:opacity-30" disabled>NEXT</button>
          </div>
        </div>
      </div>

      {/* Global Status messages */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-4 z-50 pointer-events-none">
        {error && (
          <div className="bg-rose-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 pointer-events-auto">
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold">{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 pointer-events-auto">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold">{success}</span>
            <button onClick={() => setSuccess(null)}><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

