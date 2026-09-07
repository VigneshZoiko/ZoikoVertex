"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, CalendarDays, BarChart3, Download } from "lucide-react";

/**
 * Answers are taken verbatim from ZoikoVertex_AEO_FAQs (Final Recommended
 * Version, 24 July 2026). The referenced number is that document's question.
 *
 * Where the AEO document has no question that answers ours, `a` is left empty
 * and the row stays non-interactive rather than being filled with copy that
 * was not approved.
 */
const FAQS = [
  {
    
    q: "What is the ZoikoVertex Executive Command Center?",
    a: "The ZoikoVertex Executive Command Center is a governed executive marketing dashboard that brings performance, spend, financial context, AI-assisted actions, pending approvals, governance alerts, and operational priorities into one controlled view. It helps authorized leaders understand what marketing is doing, what requires a decision, why an action was recommended or taken, and how activity relates to the organization's approved commercial objectives.",
  },
  {
   
    q: "How is the Executive Command Center different from a standard marketing dashboard?",
    a: "A standard marketing dashboard primarily reports activity and historical results. The ZoikoVertex Executive Command Center combines reporting with governed execution: AI recommendations, decision queues, approval status, policy controls, risk alerts, evidence links, and accountable actions. It is designed to help leaders understand what happened, determine what should happen next, authorize the appropriate response, and trace the resulting outcome.",
  },
  {
   
    q: "What business problem does the Executive Command Center solve?",
    a: "The Executive Command Center solves fragmented executive visibility across marketing platforms, teams, agencies, approvals, and financial reports. Instead of forcing leaders to reconcile separate dashboards and status updates, it creates one decision surface for performance, risk, workflow status, and business impact. The quality of that view depends on the systems, metrics, permissions, and attribution rules connected by the organization.",
  },
  {
    
    q: "Does it support compliance and audit review?",
    a: "Yes. Auditor and executive-viewer roles can be configured for read-oriented access to governance, audit, evidence, and performance information without granting content creation, approval, publishing, policy-administration, or override rights. Access itself can also be logged and, where appropriate, watermarked.",
  },
  {
   
    q: "Can the Command Center help justify ROI to boards and finance teams?",
    a: "Yes, where the required data is available and authorized. The Revenue Attribution Agent and ROI capabilities can connect campaign activity to pipeline, revenue, efficiency, and commercial outcomes while recording model assumptions and evidence. Attribution quality depends on the completeness, accuracy, identity resolution, and permissions of the connected data.",
  },
  {
  
    q: "Is access role-based?",
    a: "Qualifying enterprise configurations support SSO or SAML authentication, SCIM provisioning, MFA-aware controls, role-based access control, and attribute-based scope enforcement. Availability varies by plan and contract. Visibility, editing, approval, publishing, export, and governance administration should remain separately permissioned.",
  },
];

export default function ExecutiveCommandCenterFaq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Common Questions
          </span>
        </div>

        <h2 className="max-w-[480px] text-[clamp(1.9rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
          Executive buyer questions, answered.
        </h2>

        <div className="mt-14 grid lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* ─── Accordion ──────────────────────────────────────────── */}
          <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/10">
            {FAQS.map((f, i) => {
              const hasAnswer = f.a.length > 0;
              const isOpen = hasAnswer && open === i;
              return (
                <div key={f.q} className="bg-[#0E1626]">
                  <button
                    type="button"
                    disabled={!hasAnswer}
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left enabled:hover:bg-white/[0.02] transition"
                  >
                    <span className="text-sm font-bold text-white font-[family-name:var(--font-bricolage)]">
                      {f.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-white/40 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      strokeWidth={2}
                    />
                  </button>
                  {isOpen && (
                    <p className="px-5 pb-5 -mt-1 text-[13px] font-light leading-6 text-white/50 font-[family-name:var(--font-jakarta)]">
                      {f.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* ─── Demo card ──────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-[#0E1626] overflow-hidden">
            <div className="relative h-[195px]">
              <Image
                src="/images/executive-command-center/faq-demo.png"
                alt=""
                fill
                sizes="380px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent from-50% to-[#0E1626]/70" />
            </div>

            <div className="p-6">
              <div className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                Executive Demo
              </div>

              <h3 className="mt-3 text-xl font-bold leading-snug text-white font-[family-name:var(--font-bricolage)]">
                See the Command Center live with your data architecture.
              </h3>

              <p className="mt-4 text-[13px] font-light leading-6 text-white/50 font-[family-name:var(--font-jakarta)]">
                A 45-minute executive walkthrough focused on agent visibility, governance controls,
                approval workflows, and ROI proof — with your platform team in the room.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/request-demo"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-full bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition font-[family-name:var(--font-jakarta)]"
                >
                  <CalendarDays className="w-[14px] h-[14px]" strokeWidth={2.5} />
                  Book an Executive Demo
                </Link>
                <Link
                  href="/roi-governance-audit"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-full bg-[#C9A94A] text-[#080d1a] text-sm font-bold hover:bg-[#C9A94A]/90 transition font-[family-name:var(--font-jakarta)]"
                >
                  <BarChart3 className="w-[14px] h-[14px]" strokeWidth={2.5} />
                  Start ROI &amp; Governance Audit
                </Link>
                <Link
                  href="/resources-hub"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-full border border-white/15 text-sm text-white/90 hover:bg-white/5 transition font-[family-name:var(--font-jakarta)]"
                >
                  <Download className="w-[14px] h-[14px]" strokeWidth={2} />
                  Download Command Center Brief
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
