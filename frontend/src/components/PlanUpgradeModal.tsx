"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Lock, ArrowRight, Zap } from "lucide-react";
import { type Plan, type Feature, PLAN_DISPLAY, PLAN_BADGE_COLOR, FEATURE_MIN_PLAN, FEATURE_UPGRADE_REASON } from "@/lib/planFeatures";

interface Props {
  feature: Feature | null;
  onClose: () => void;
}

const PLAN_PERKS: Record<Plan, string[]> = {
  FREE:       [],
  STARTER:    [],
  GROWTH:     [
    "Full Campaigns & Content Studio",
    "Publishing Hub — live cross-platform posting",
    "Review Queue, Validation & Approvals",
    "AI Agent Studio & Workflows",
    "Inbox & Engagement management",
    "Immutable Audit Trail",
    "API & Webhooks (10 keys)",
  ],
  SCALE:      [
    "Everything in Vertex Growth, plus:",
    "Forensic Hub & Evidence packaging",
    "Crisis Console (standard mode)",
    "Full Brand Standards Library",
    "Legal Holds",
    "Advanced multi-brand governance",
    "Full API & Webhooks (50 keys)",
  ],
  ENTERPRISE: [
    "Everything in Vertex Scale, plus:",
    "Evidence Vault + full legal hold",
    "Identity Ledger",
    "SSO / SAML / SCIM",
    "Three-key approval protocol",
    "Custom governance architecture",
    "Dedicated TAM & agreed SLA",
  ],
};

export default function PlanUpgradeModal({ feature, onClose }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!feature) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [feature, onClose]);

  if (!feature || !mounted) return null;

  const requiredPlan   = FEATURE_MIN_PLAN[feature];
  const requiredLabel  = PLAN_DISPLAY[requiredPlan];
  const badgeColor     = PLAN_BADGE_COLOR[requiredPlan];
  const reason         = FEATURE_UPGRADE_REASON[feature];
  const perks          = PLAN_PERKS[requiredPlan];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Top bar */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-gray-900 dark:text-white font-bold text-sm">Feature Locked</p>
              <p className={`text-xs font-semibold mt-0.5 border rounded-full px-2 py-0.5 inline-flex items-center ${badgeColor}`}>
                Requires {requiredLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 dark:text-zinc-500 hover:text-white hover:bg-gray-200 dark:bg-zinc-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">{reason}</p>

          {perks.length > 0 && (
            <div className="p-4 bg-gray-100 dark:bg-zinc-800/60 border border-gray-300 dark:border-zinc-700/60 rounded-xl space-y-2.5">
              <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-3">
                What you unlock
              </p>
              {perks.map((perk, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-2.5 h-2.5 text-gray-900 dark:text-white" />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-zinc-300">{perk}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={() => { router.push("/admin/billing"); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-zinc-100 text-black text-sm font-bold rounded-xl transition-all shadow-lg"
          >
            View Plans & Upgrade
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:text-zinc-300 transition-colors"
          >
            Maybe later
          </button>
        </div>

      </div>
    </div>,
    document.body,
  );
}
