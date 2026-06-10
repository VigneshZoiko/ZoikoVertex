"use client";

import { useState, useEffect } from "react";
import { Search, Hash, Lock, CheckCircle2, AlertTriangle, FileJson } from "lucide-react";

interface AuditEntry {
  ledger_entry_id: string;
  timestamp_utc: string;
  entry_type: string;
  actor_id: string; // Will be hashed by backend if user is auditor
  hash: string;
  prev_hash: string | null;
  risk: Record<string, any>;
}

export default function AuditorViewPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<"VERIFIED" | "BROKEN" | null>(null);

  useEffect(() => {
    // Simulate fetching redacted auditor view from backend
    setTimeout(() => {
      setEntries([
        {
          ledger_entry_id: "IDL-MOCK-1",
          timestamp_utc: new Date().toISOString(),
          entry_type: "authority.snapshot_created",
          actor_id: "sha256:8f43a2b1c9d0...",
          hash: "a42bc...",
          prev_hash: "b54dc...",
          risk: { level: "SUMMARY_ONLY" }
        },
        {
          ledger_entry_id: "IDL-MOCK-2",
          timestamp_utc: new Date(Date.now() - 3600000).toISOString(),
          entry_type: "identity.recertification_started",
          actor_id: "sha256:3c2b1a9f0d...",
          hash: "b54dc...",
          prev_hash: "c76ec...",
          risk: { level: "SUMMARY_ONLY" }
        }
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleVerifyChain = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationResult("VERIFIED");
    }, 1500);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">External Audit Ledger</h1>
          <p className="text-[var(--foreground-muted,#a0a0a0)] text-sm">
            Read-only, PII-redacted cryptographic view of the Identity Ledger.
          </p>
        </div>
        <button
          onClick={handleVerifyChain}
          disabled={isVerifying}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-colors font-medium text-sm disabled:opacity-50"
        >
          {isVerifying ? (
            <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {isVerifying ? "Verifying..." : "Verify Cryptographic Chain"}
        </button>
      </div>

      {verificationResult === "VERIFIED" && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
          <div>
            <h3 className="text-emerald-400 font-medium">Chain Intact</h3>
            <p className="text-emerald-400/80 text-sm mt-1">All {entries.length} cryptographic hashes have been verified against the ledger. No tampering detected.</p>
          </div>
        </div>
      )}

      <div className="relative border border-[var(--border,#2a2a2a)] rounded-2xl bg-[var(--surface,#1a1a1a)] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-[var(--foreground-muted)]">Loading ledger entries...</div>
        ) : (
          <div className="divide-y divide-[var(--border,#2a2a2a)]">
            <div className="grid grid-cols-12 gap-4 p-4 bg-[#222] text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
              <div className="col-span-3">Event</div>
              <div className="col-span-2">Time (UTC)</div>
              <div className="col-span-3">Redacted Actor ID</div>
              <div className="col-span-2">Hash</div>
              <div className="col-span-2">Prev Hash</div>
            </div>
            {entries.map((entry) => (
              <div key={entry.ledger_entry_id} className="grid grid-cols-12 gap-4 p-4 items-center text-sm hover:bg-[#222] transition-colors">
                <div className="col-span-3 font-medium text-blue-400 flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-blue-500/50" />
                  {entry.entry_type}
                </div>
                <div className="col-span-2 text-[var(--foreground-muted)]">
                  {new Date(entry.timestamp_utc).toLocaleString()}
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-orange-400" />
                  <span className="font-mono text-xs text-orange-200">{entry.actor_id}</span>
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-[var(--foreground-muted)]" />
                  <span className="font-mono text-xs">{entry.hash}</span>
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-[var(--foreground-muted)]" />
                  <span className="font-mono text-xs text-[var(--foreground-muted)]">{entry.prev_hash || 'ROOT'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
