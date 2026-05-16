"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import { Archive, Scale, Download, ShieldAlert, CheckCircle2, AlertTriangle, FileLock2, Search, Filter } from "lucide-react";

export default function EvidenceVaultPage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();
  const [stats, setStats] = useState<any>(null);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchEvidenceData = async () => {
    try {
      setLoading(true);
      const [statsRes, artifactsRes] = await Promise.all([
        api.get("/api/v1/governance/evidence/stats"),
        api.get("/api/v1/governance/evidence/artifacts")
      ]);
      
      if (statsRes.success) setStats(statsRes.data);
      if (artifactsRes.success) setArtifacts(artifactsRes.data);
    } catch (error) {
      console.error("Failed to fetch evidence data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!rolesLoading) {
      fetchEvidenceData();
    }
  }, [rolesLoading]);

  if (rolesLoading) {
    return <div className="p-8 text-[#888888]">Loading governance context...</div>;
  }

  if (!hasRole(["WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "ADMIN"])) {
    return <div className="p-8 text-red-400">Unauthorized. You need Governance Admin privileges to view the Evidence Vault.</div>;
  }

  const filteredArtifacts = artifacts.filter(a => 
    a.artifact_uuid.toLowerCase().includes(search.toLowerCase()) || 
    a.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Archive className="w-6 h-6 text-indigo-500" />
            Sovereign Evidence Repository
          </h1>
          <p className="text-[#888888] mt-1">Exportable evidence packs, cryptographic provenance, and legal-hold records.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-[#1a1a1a] border border-[#333] hover:border-indigo-500/50 text-white rounded-lg flex items-center gap-2 transition-colors">
            <FileLock2 className="w-4 h-4" />
            Apply Legal Hold
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" />
            Build Evidence Pack
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <div className="text-[#888888] text-xs font-medium uppercase tracking-wider mb-1">Total Artifacts</div>
            <div className="text-2xl font-bold text-white">{stats.total_artifacts}</div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <div className="text-[#888888] text-xs font-medium uppercase tracking-wider mb-1">Defensible Items</div>
            <div className="text-2xl font-bold text-emerald-400">{stats.defensible}</div>
          </div>
          <div className="bg-[#111] border border-orange-500/20 rounded-xl p-4">
            <div className="text-orange-400 text-xs font-medium uppercase tracking-wider mb-1">Governance Gaps</div>
            <div className="text-2xl font-bold text-orange-400">{stats.governance_gaps + stats.review_recommended}</div>
          </div>
          <div className="bg-[#111] border border-red-500/20 rounded-xl p-4">
            <div className="text-red-400 text-xs font-medium uppercase tracking-wider mb-1">Active Legal Holds</div>
            <div className="text-2xl font-bold text-red-400">{stats.active_legal_holds}</div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <div className="text-[#888888] text-xs font-medium uppercase tracking-wider mb-1">Pending Bundles</div>
            <div className="text-2xl font-bold text-indigo-400">{stats.evidence_packs}</div>
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
              placeholder="Search evidence artifacts by UUID, object name, or context..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button className="px-4 py-2 bg-[#0a0a0a] border border-[#333] hover:bg-[#1a1a1a] text-white rounded-lg flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4" />
            Filter Evidence
          </button>
        </div>

        {/* Artifacts Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-[#888888]">Loading evidence artifacts...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#161616] sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 text-xs font-medium text-[#888888] uppercase tracking-wider border-b border-[#222]">Artifact UUID</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#888888] uppercase tracking-wider border-b border-[#222]">Date</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#888888] uppercase tracking-wider border-b border-[#222]">Target Platform</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#888888] uppercase tracking-wider border-b border-[#222]">Defensibility Index</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#888888] uppercase tracking-wider border-b border-[#222]">Hold Status</th>
                  <th className="py-3 px-4 text-xs font-medium text-[#888888] uppercase tracking-wider border-b border-[#222] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredArtifacts.map((artifact) => (
                  <tr key={artifact.id} className="hover:bg-[#161616]/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-mono text-white">
                      {artifact.artifact_uuid}
                    </td>
                    <td className="py-3 px-4 text-sm text-[#aaa] whitespace-nowrap">
                      {new Date(artifact.created_at).toLocaleString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit', hour12: false 
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-[#ccc]">
                      <span className="capitalize">{artifact.platform || 'Unknown'}</span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${
                          artifact.defensibility_color === 'green' ? 'text-green-400' :
                          artifact.defensibility_color === 'amber' ? 'text-amber-400' :
                          artifact.defensibility_color === 'orange' ? 'text-orange-400' :
                          'text-red-400'
                        }`}>
                          {artifact.defensibility_index}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded border ${
                          artifact.defensibility_color === 'green' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          artifact.defensibility_color === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          artifact.defensibility_color === 'orange' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {artifact.defensibility_label}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {artifact.is_on_legal_hold ? (
                        <div className="flex items-center gap-1 text-red-400 text-xs font-medium">
                          <FileLock2 className="w-4 h-4" />
                          Held
                        </div>
                      ) : (
                        <span className="text-[#666] text-xs">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                        View Trace
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredArtifacts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#888888]">
                      No evidence artifacts found matching your criteria.
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
