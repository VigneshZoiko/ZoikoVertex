"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import { Archive, Scale, Download, ShieldAlert, CheckCircle2, AlertTriangle, FileLock2, Search, Filter, Upload, ShieldCheck } from "lucide-react";

export default function EvidenceVaultPage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();
  const [stats, setStats] = useState<any>(null);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTrace, setSelectedTrace] = useState<any>(null);
   const [isBuildingPack, setIsBuildingPack] = useState(false);
  const [packMessage, setPackMessage] = useState<{type:"success"|"error", text:string}|null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{status: 'success'|'error', text: string, computed?: string, expected?: string} | null>(null);

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

  if (!hasRole(["WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "ADMIN", "AUDITOR", "COMPLIANCE_REVIEWER", "EVIDENCE_MANAGER", "SECURITY_ADMIN", "PRIVACY_ADMIN", "AGENT_ARCHITECT", "APPROVER", "VALIDATOR", "REVIEWER"])) {
    return <div className="p-8 text-red-400">Unauthorized. You do not have the required governance or audit privileges to view the Evidence Vault.</div>;
  }

  const filteredArtifacts = artifacts.filter(a => 
    a.artifact_uuid.toLowerCase().includes(search.toLowerCase()) || 
    a.content?.toLowerCase().includes(search.toLowerCase())
  );

  const handleBuildPack = async () => {
    setIsBuildingPack(true);
    setPackMessage(null);
    try {
      const res = await api.post("/api/v1/governance/evidence/packs", {
        purpose: "INTERNAL_AUDIT",
        scope_description: "Dynamic frontend export",
        format: "JSON"
      });
      if (res.success && res.data) {
        // Trigger actual JSON file download
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `evidence_pack_${res.data.pack.export_hash.slice(0, 8)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setPackMessage({type: "success", text: "Evidence Pack downloaded!"});
        fetchEvidenceData();
      } else {
        setPackMessage({type: "error", text: "Failed to build Evidence Pack."});
      }
    } catch (e) {
      setPackMessage({type: "error", text: "Network error building Evidence Pack."});
    } finally {
      setIsBuildingPack(false);
      setTimeout(() => setPackMessage(null), 5000);
    }
  };

  const handleApplyHold = async (objectId?: string) => {
    const targetId = typeof objectId === "string" ? objectId : prompt("Enter the UUID of the Artifact to freeze:");
    if (!targetId) return;
    const reason = prompt("Enter the legal matter or reason for hold (min 10 chars):");
    if (!reason || reason.length < 10) return alert("Reason must be at least 10 characters.");

    try {
      const res = await api.post("/api/v1/governance/evidence/legal-holds", {
        object_id: objectId,
        object_type: "PUBLISH_INTENT",
        matter_ref: "MATTER-" + Date.now().toString().slice(-4),
        reason: reason
      });
      if (res.success) {
        alert("Legal hold successfully applied to artifact!");
        fetchEvidenceData();
      } else {
        alert("Failed to apply legal hold.");
      }
    } catch (e) {
      alert("Error applying legal hold.");
    }
  };

  const handleVerifyFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVerifyResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.pack || !json.artifacts) {
          return setVerifyResult({
            status: 'error',
            text: 'Invalid Evidence Pack file format. Missing core headers.'
          });
        }

        // Calculate native SHA-256 client-side using browser Web Crypto API
        const artifactsStr = JSON.stringify(json.artifacts);
        const msgBuffer = new TextEncoder().encode(artifactsStr);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const expectedHash = json.pack.export_hash;

        if (computedHash === expectedHash) {
          setVerifyResult({
            status: 'success',
            text: 'Cryptographic Integrity Verified! This evidence bundle is 100% authentic and untampered.',
            computed: computedHash,
            expected: expectedHash
          });
        } else {
          setVerifyResult({
            status: 'error',
            text: 'TAMPER WARNING! The compiled artifacts payload does not match the cryptographic signature.',
            computed: computedHash,
            expected: expectedHash
          });
        }
      } catch (err) {
        setVerifyResult({
          status: 'error',
          text: 'Failed to parse file. Ensure it is a valid JSON Evidence Pack.'
        });
      }
    };
    reader.readAsText(file);
  };

  const fetchTraceDetail = async (id: string) => {
    try {
      const res = await api.get(`/api/v1/governance/evidence/artifacts/${id}`);
      if (res.success) {
        setSelectedTrace(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch trace", e);
    }
  };

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
        {hasRole(["WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "ADMIN", "AUDITOR", "COMPLIANCE_REVIEWER", "EVIDENCE_MANAGER"]) && (
          <div className="flex gap-3">
            <button 
              onClick={() => setShowVerifyModal(true)}
              className="px-4 py-2 bg-[#1a1a1a] border border-[#333] hover:border-emerald-500/50 text-white rounded-lg flex items-center gap-2 transition-colors">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verify Bundle
            </button>
            <button 
              onClick={handleApplyHold}
              className="px-4 py-2 bg-[#1a1a1a] border border-[#333] hover:border-indigo-500/50 text-white rounded-lg flex items-center gap-2 transition-colors">
              <FileLock2 className="w-4 h-4" />
              Apply Legal Hold
            </button>
            <div className="flex flex-col items-end gap-1">
              <button 
                onClick={handleBuildPack}
                disabled={isBuildingPack}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">
                <Download className="w-4 h-4" />
                {isBuildingPack ? "Building..." : "Build Evidence Pack"}
              </button>
              {packMessage && (
                <span className={`text-xs ${packMessage.type === "success" ? "text-green-400" : "text-red-400"}`}>
                  {packMessage.text}
                </span>
              )}
            </div>
          </div>
        )}
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
                    <td className="py-3 px-4 text-sm text-right flex items-center justify-end gap-3">
                      {hasRole(["WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "ADMIN", "AUDITOR", "COMPLIANCE_REVIEWER", "EVIDENCE_MANAGER"]) && !artifact.is_on_legal_hold && (
                        <button 
                          onClick={() => handleApplyHold(artifact.id)}
                          className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-1">
                          <FileLock2 className="w-3.5 h-3.5" />
                          Apply Hold
                        </button>
                      )}
                      <button 
                        onClick={() => fetchTraceDetail(artifact.id)}
                        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
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

      {/* Decision Trace Modal */}
      {selectedTrace && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#333] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#161616]">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-indigo-500" />
                  Decision Trace: {selectedTrace.artifact_uuid}
                </h3>
                <p className="text-xs text-[#888] mt-1">Platform: {selectedTrace.platform} | Risk Score: {selectedTrace.risk_score}</p>
              </div>
              <button onClick={() => setSelectedTrace(null)} className="text-[#888] hover:text-white">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Trace Summary */}
              {selectedTrace.decision_trace && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#333] pb-2">Policy & Risk Evaluation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                      <p className="text-xs text-[#888] mb-1">Instruction</p>
                      <p className="text-sm text-white">{selectedTrace.decision_trace.instruction_summary}</p>
                    </div>
                    <div className="bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                      <p className="text-xs text-[#888] mb-1">Risk Signals</p>
                      <p className="text-sm text-white">{selectedTrace.decision_trace.risk_signal_summary}</p>
                    </div>
                    <div className="bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                      <p className="text-xs text-[#888] mb-1">Agent Action / Routing</p>
                      <p className="text-sm text-white">{selectedTrace.decision_trace.agent_action_summary}</p>
                    </div>
                    <div className="bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                      <p className="text-xs text-[#888] mb-1">Final Decision</p>
                      <p className="text-sm font-medium text-indigo-400">{selectedTrace.decision_trace.final_decision_path}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Provenance Timeline */}
              {selectedTrace.provenance && (
                <div className="space-y-4 mt-6">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#333] pb-2">Provenance Lifecycle (T0-T4)</h4>
                  <div className="space-y-3">
                    {selectedTrace.provenance.map((step: any, idx: number) => (
                      <div key={idx} className="flex gap-4 items-start">
                        <div className="flex flex-col items-center mt-1">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-[10px] text-indigo-400 font-bold">
                            {step.moment}
                          </div>
                          {idx !== selectedTrace.provenance.length - 1 && (
                            <div className="w-px h-10 bg-[#333] my-1"></div>
                          )}
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#333] p-3 rounded-lg flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-bold text-white">{step.label}</p>
                            <span className="text-[10px] text-[#666]">{new Date(step.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-[#aaa]">{step.data}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
