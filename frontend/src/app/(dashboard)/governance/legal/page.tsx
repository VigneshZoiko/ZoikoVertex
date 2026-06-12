"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";
import { BookMarked, ShieldCheck, Scale, AlertTriangle, FileText, Settings, Code, CheckCircle2 } from "lucide-react";

export default function BrandStandardsPage() {
  const { hasRole, isLoading: rolesLoading } = useRoles();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [linguistic, setLinguistic] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("registry");

  const fetchBrandData = async () => {
    try {
      setLoading(true);
      const [profRes, lingRes, claimsRes] = await Promise.all([
        api.get("/api/v1/governance/brand/profiles"),
        api.get("/api/v1/governance/brand/linguistic"),
        api.get("/api/v1/governance/brand/claims"),
      ]);
      
      if (profRes.success) setProfiles(profRes.data);
      if (lingRes.success) setLinguistic(lingRes.data);
      if (claimsRes.success) setClaims(claimsRes.data);
    } catch (error) {
      console.error("Failed to fetch brand data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!rolesLoading) {
      fetchBrandData();
    }
  }, [rolesLoading]);

  if (rolesLoading || loading) {
    return <div className="p-8 text-[#888888]">Loading Brand Standards...</div>;
  }

  if (!hasRole(["WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "ADMIN", "BRAND_REVIEWER"])) {
    return <div className="p-8 text-error-text">Unauthorized. You need Brand Reviewer privileges to access Brand Standards.</div>;
  }

  const mainBrand = profiles.length > 0 ? profiles[0] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-24">
      {/* Zone 1: Enterprise Brand Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111] p-6 rounded-2xl border border-[#222]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-info-bg flex items-center justify-center shrink-0 border border-info-border">
            <BookMarked className="w-6 h-6 text-info-text" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{mainBrand?.name || "Enterprise Brand"}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-success-bg text-success-text text-xs font-black uppercase tracking-widest border border-success-border">
                {mainBrand?.status || "ACTIVE"}
              </span>
            </div>
            <p className="text-[#888] mt-1 text-sm flex items-center gap-4">
              <span>Type: <span className="text-[#ccc]">{mainBrand?.type}</span></span>
              <span>Policy Version: <span className="text-[#ccc]">{mainBrand?.version || "1.0"}</span></span>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-foreground rounded-lg transition-colors text-sm font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Governance Settings
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-[#222]">
        {[
          { id: "registry", label: "Brand Profile Registry" },
          { id: "linguistic", label: "Linguistic Sovereign Profile" },
          { id: "claims", label: "Claims Substantiation Ledger" },
          { id: "code", label: "Brand-as-Code Console" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === tab.id ? 'border-info-border text-foreground' : 'border-transparent text-[#666] hover:text-[#999]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === "registry" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {profiles.map(p => (
              <div key={p.id} className="bg-[#111] border border-[#222] rounded-xl p-5 relative overflow-hidden group hover:border-[#444] transition-colors cursor-pointer">
                <div className="absolute top-0 right-0 p-3">
                  <ShieldCheck className="w-5 h-5 text-success-text/50" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">{p.name}</h3>
                <div className="text-xs text-info-text font-medium mb-4">{p.type}</div>
                <div className="space-y-2 text-sm text-[#888]">
                  <div className="flex justify-between"><span>Markets:</span><span className="text-[#ccc]">{p.markets?.join(", ")}</span></div>
                  <div className="flex justify-between"><span>Languages:</span><span className="text-[#ccc]">{p.languages?.join(", ")}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "linguistic" && linguistic && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-[#111] border border-[#222] rounded-xl p-6">
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-info-text" />
                  Voice Indices
                </h3>
                <div className="space-y-5">
                  {[
                    { label: "Warmth Index", value: linguistic.warmth_index, color: "bg-warning-text" },
                    { label: "Authority Index", value: linguistic.authority_index, color: "bg-info-text" },
                    { label: "Restraint Index", value: linguistic.restraint_index, color: "bg-slate-400" },
                    { label: "Cultural Sensitivity", value: linguistic.cultural_sensitivity, color: "bg-success-text" },
                    { label: "Evidence Dependency", value: linguistic.evidence_dependency, color: "bg-info-text" },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-[#ccc]">{stat.label}</span>
                        <span className="text-[#888] font-mono">{(stat.value * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-[#222] rounded-full overflow-hidden">
                        <div className={`h-full ${stat.color} rounded-full`} style={{ width: `${stat.value * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-[#111] border border-[#222] rounded-xl p-6">
                <h3 className="text-lg font-bold text-error-text mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Prohibited Lexicon
                </h3>
                <div className="flex flex-wrap gap-2">
                  {linguistic.prohibited_terms?.map((term: string) => (
                    <span key={term} className="px-3 py-1 bg-error-bg text-error-text border border-error-border rounded-md text-sm font-medium">
                      {term}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-[#111] border border-[#222] rounded-xl p-6">
                <h3 className="text-lg font-bold text-success-text mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Allowed Lexicon
                </h3>
                <div className="flex flex-wrap gap-2">
                  {linguistic.allowed_lexicon?.map((term: string) => (
                    <span key={term} className="px-3 py-1 bg-success-bg text-success-text border border-success-border rounded-md text-sm font-medium">
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "claims" && (
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#222] flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-info-text" />
                Atomic Claims Registry
              </h2>
              <button className="px-3 py-1.5 bg-info-text hover:bg-info-text text-foreground rounded-md text-sm font-medium transition-colors">
                + Register Claim
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#222] bg-[#161616]">
                    <th className="p-4 text-xs font-bold text-[#888] uppercase tracking-wider">Claim ID</th>
                    <th className="p-4 text-xs font-bold text-[#888] uppercase tracking-wider">Claim Text</th>
                    <th className="p-4 text-xs font-bold text-[#888] uppercase tracking-wider">Source Anchor</th>
                    <th className="p-4 text-xs font-bold text-[#888] uppercase tracking-wider">Risk Class</th>
                    <th className="p-4 text-xs font-bold text-[#888] uppercase tracking-wider">Status / Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-[#161616] transition-colors">
                      <td className="p-4 text-xs font-mono text-[#666]">{claim.id}</td>
                      <td className="p-4 text-sm font-medium text-[#ccc] max-w-xs truncate" title={claim.claim_text}>{claim.claim_text}</td>
                      <td className="p-4 text-sm text-info-text hover:underline cursor-pointer">{claim.source_anchor}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${claim.risk_class === 'HIGH' ? 'bg-warning-bg text-warning-text' : claim.risk_class === 'REGULATED' ? 'bg-error-bg text-error-text' : 'bg-[#222] text-[#888]'}`}>
                          {claim.risk_class}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${claim.status === 'ACTIVE' ? 'bg-success-text' : 'bg-error-text'}`} />
                          <span className="text-xs text-[#888]">
                            {new Date(claim.expiry_date).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {claims.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#666]">No claims registered in ledger.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "code" && (
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden flex flex-col h-[500px]">
            <div className="p-5 border-b border-[#222] flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Code className="w-5 h-5 text-info-text" />
                Brand-as-Code Configuration
              </h2>
            </div>
            <div className="flex-1 p-4 bg-[#0a0a0a] overflow-auto">
              <pre className="text-xs text-success-text font-mono">
                {JSON.stringify({ profile: mainBrand, linguistic, claims }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
