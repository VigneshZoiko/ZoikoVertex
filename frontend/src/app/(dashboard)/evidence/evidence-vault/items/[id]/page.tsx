"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import ActorDisplay from "@/components/evidence/ActorDisplay";
import { Lock, ChevronLeft } from "lucide-react";

interface EvidenceItemDetail {
  id: string;
  evidence_type: string | null;
  source_type: string;
  source_id: string;
  risk_level: string;
  preservation_reason: string;
  preserved_by_actor_id: string;
  vault_state: string;
  legal_hold: boolean;
  retention_class: string;
  retention_until: string | null;
  created_at: string;
  contains_pii: boolean;
  contains_ai_output: boolean;
}

function fmt(ts: string) {
  try { return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

const STATE_COLOR: Record<string, string> = {
  preserved: "text-green-400 border-green-500/20 bg-green-500/10",
  sealed: "text-blue-400 border-blue-500/20 bg-blue-500/10",
  legal_hold: "text-red-400 border-red-500/20 bg-red-500/10",
  archived: "text-foreground-muted bg-surface-hover border-border",
  quarantined: "text-orange-400 border-orange-500/20 bg-orange-500/10",
};

export default function EvidenceItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [item, setItem] = useState<EvidenceItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/evidence-vault/items/${id}`);
      if (res.success) setItem(res.data);
      else setError(res.error || "Not found");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  if (loading) return <div className="p-8 text-foreground-muted text-sm">Loading evidence…</div>;
  if (error) return <div className="p-8 text-red-400">{error}</div>;
  if (!item) return <div className="p-8 text-foreground-muted">Item not found</div>;

  const retCol = item.retention_until ? (new Date(item.retention_until).getTime() - Date.now()) / 86400000 : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <button onClick={() => router.push("/evidence/evidence-vault")}
        className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground mb-4">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to Evidence Vault
      </button>

      {/* Header */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`inline-block px-2 py-0.5 rounded text-xs border ${STATE_COLOR[item.vault_state] || ""}`}>
                {item.vault_state.replace(/_/g, " ")}
              </span>
              {item.legal_hold && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-red-400 bg-red-500/10 border border-red-500/20">
                  <Lock className="w-3 h-3" /> Legal Hold
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-foreground">{item.evidence_type?.replace(/_/g, " ") || "Evidence item"}</h1>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-[10px] text-foreground-muted uppercase">Source</span>
          <p className="text-sm text-foreground mt-1">{item.source_type?.replace(/_/g, " ") || "—"}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-[10px] text-foreground-muted uppercase">When preserved</span>
          <p className="text-sm text-foreground mt-1">{fmt(item.created_at)}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-[10px] text-foreground-muted uppercase">Retained until</span>
          <p className="text-sm text-foreground mt-1">{item.retention_until ? fmt(item.retention_until) : item.retention_class?.replace(/_/g, " ") || "—"}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-[10px] text-foreground-muted uppercase">Preserved by</span>
          <div className="mt-1">
            {item.preserved_by_actor_id
              ? <ActorDisplay id={item.preserved_by_actor_id} />
              : <span className="text-sm text-foreground-muted">—</span>
            }
          </div>
        </div>
      </div>

      {/* Why Preserved */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-4">
        <span className="text-[10px] text-foreground-muted uppercase">Why this was preserved</span>
        <p className="text-sm text-foreground mt-2 leading-relaxed">{item.preservation_reason || "No reason recorded."}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground-muted">
          {item.contains_pii && <span className="px-2 py-0.5 bg-surface-hover rounded">Contains personal data</span>}
          {item.contains_ai_output && <span className="px-2 py-0.5 bg-surface-hover rounded">AI-generated content</span>}
        </div>
      </div>
    </div>
  );
}
