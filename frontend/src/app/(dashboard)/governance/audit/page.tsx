"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import { FileSearch, Clock, AlertTriangle, CheckCircle2, Search, Filter, Download } from "lucide-react";

interface AuditEvent {
  id: string;
  level: string;
  service: string;
  message: string;
  meta: {
    actor_id?: string;
    actor_type?: string;
    object_type?: string;
    object_id?: string;
    risk_level?: string;
    _audit?: boolean;
    [key: string]: any;
  };
  created_at: string;
}

export default function AuditTrailPage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState("");

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      const [statsRes, trailRes] = await Promise.all([
        api.get("/api/v1/governance/audit/stats"),
        api.get("/api/v1/governance/audit/trail?limit=100")
      ]);
      
      if (statsRes.success) setStats(statsRes.data);
      if (trailRes.success) setEvents(trailRes.data);
    } catch (error) {
      console.error("Failed to fetch audit data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!rolesLoading) {
      fetchAuditData();
    }
  }, [rolesLoading]);

  const filteredEvents = events.filter(e => 
    e.message.toLowerCase().includes(search.toLowerCase()) || 
    e.service.toLowerCase().includes(search.toLowerCase())
  );

  const getRiskColor = (level: string) => {
    if (level === 'error' || level === 'CRITICAL' || level === 'HIGH') return "text-red-400 bg-red-400/10 border-red-400/20";
    if (level === 'warn' || level === 'MEDIUM') return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  };

  if (rolesLoading) {
    return <div className="p-8 text-[#888888]">Loading governance context...</div>;
  }

  if (!hasRole(["WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "ADMIN"])) {
    return <div className="p-8 text-red-400">Unauthorized. You need Governance Admin privileges to view the Audit Ledger.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileSearch className="w-6 h-6 text-amber-500" />
            Immutable Audit Ledger
          </h1>
          <p className="text-[#888888] mt-1">Tamper-evident chronological record of all protocol events and system actions.</p>
        </div>
        <button className="px-4 py-2 bg-[#1a1a1a] border border-[#333] hover:border-amber-500/50 text-white rounded-lg flex items-center gap-2 transition-colors">
          <Download className="w-4 h-4" />
          Export Ledger
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <div className="text-[#888888] text-xs font-medium uppercase tracking-wider mb-1">Total Events</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <div className="text-[#888888] text-xs font-medium uppercase tracking-wider mb-1">Today&apos;s Events</div>
            <div className="text-2xl font-bold text-white">{stats.today}</div>
          </div>
          <div className="bg-[#111] border border-red-500/20 rounded-xl p-4">
            <div className="text-red-400 text-xs font-medium uppercase tracking-wider mb-1">Error Events</div>
            <div className="text-2xl font-bold text-red-400">{stats.errors}</div>
          </div>
          <div className="bg-[#111] border border-amber-500/20 rounded-xl p-4">
            <div className="text-amber-400 text-xs font-medium uppercase tracking-wider mb-1">Warning Events</div>
            <div className="text-2xl font-bold text-amber-400">{stats.warnings}</div>
          </div>
        </div>
      )}

      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden flex flex-col h-[600px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#222] flex gap-4 bg-[#161616]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
            <input 
              type="text"
              placeholder="Search ledger events by message or service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <button className="px-4 py-2 bg-[#0a0a0a] border border-[#333] hover:bg-[#1a1a1a] text-white rounded-lg flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4" />
            Advanced Filters
          </button>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-[#888888]">Loading ledger events...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#161616] sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 text-xs font-medium text-[#888888] uppercase tracking-wider border-b border-[#222]">Timestamp</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#888888] uppercase tracking-wider border-b border-[#222]">Module/Service</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#888888] uppercase tracking-wider border-b border-[#222]">Action / Message</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#888888] uppercase tracking-wider border-b border-[#222]">Actor</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#888888] uppercase tracking-wider border-b border-[#222]">Level</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#888888] uppercase tracking-wider border-b border-[#222] text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredEvents.map((event) => {
                  const meta = event.meta || {};
                  const isAudit = meta._audit;
                  return (
                    <tr key={event.id} className="hover:bg-[#161616]/50 transition-colors">
                      <td className="py-3 px-4 text-sm text-[#aaa] whitespace-nowrap">
                        {new Date(event.created_at).toLocaleString('en-US', { 
                          year: 'numeric', month: '2-digit', day: '2-digit', 
                          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
                        }).replace(/,/g, '')}
                      </td>
                      <td className="py-3 px-4 text-sm text-white font-medium">
                        {event.service}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#ccc] max-w-[300px] truncate">
                        {event.message}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#888]">
                        {meta.actor_type || 'SYSTEM'} {meta.actor_id ? `(${meta.actor_id.substring(0,8)})` : ''}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs border ${getRiskColor(meta.risk_level || event.level)}`}>
                          {meta.risk_level || event.level.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {isAudit ? (
                          <div className="flex items-center justify-end gap-1 text-emerald-500">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs font-medium">Signed</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 text-[#666]">
                            <span className="text-xs">System</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#888888]">
                      No audit events found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
