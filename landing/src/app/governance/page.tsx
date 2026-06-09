"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";

/* ── Ticker ── */
function Ticker() {
  const items = [
    { icon: "🔒", text: "POLICY-BOUND EXECUTION" },
    { icon: "✓", text: "APPROVAL-GATED PUBLISHING" },
    { icon: "📊", text: "BRAND STANDARD ENFORCEMENT" },
    { icon: "🔒", text: "IMMUTABLE AUDIT EVIDENCE" },
    { icon: "👤", text: "ROLE-SCOPED PERMISSIONS" },
  ];
  return (
    <div className="border-y border-white/10 bg-[#06060f] py-3 overflow-hidden">
      <div className="flex gap-8 whitespace-nowrap">
        <div className="flex gap-8 text-xs font-semibold tracking-widest text-white/40 animate-none">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-[#20E7F2]">{item.icon}</span>
              {item.text}
              <span className="text-white/20 ml-4">|</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Hero ── */
function Hero() {
  return (
    <section className="bg-[#080E1A] pt-32 pb-0 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div>
          <div className="inline-flex items-center gap-2 border border-[#20E7F240] bg-[#20E7F20F] rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 bg-[#20E7F2] rounded-full" />
            <span className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase">
              Governance · Governed Agentic Execution™
            </span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight mb-4">
            AI marketing without an audit trail is not innovation.
          </h1>
          <h1 className="text-5xl lg:text-6xl font-black text-[#20E7F2] leading-[1.05] tracking-tight mb-6">
            It is exposure.
          </h1>
          <p className="text-white/50 text-base leading-relaxed mb-8 max-w-lg">
            ZoikoVertex governs how AI-assisted marketing is planned, created, approved, published, and evidenced — so teams move faster without losing brand control, compliance accountability, or defensible proof.
          </p>
          <Link
            href="/request-demo"
            className="inline-flex items-center gap-2 bg-[#20E7F2] hover:bg-cyan-300 text-[#080E1A] font-bold px-7 py-3.5 rounded-xl transition-all text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Request a Gov Demo
          </Link>
        </div>

        {/* Right — Dashboard Mockup */}
        <div className="relative">
          <div className="bg-[#0D1829] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Window bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-[#0a0f1e]">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <span className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-white/40 text-xs font-mono">ZoikoVertex — Governance Command Center</span>
              <span className="text-[#20E7F2] text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#20E7F2] rounded-full" /> Governed Mode
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-white/8 border-b border-white/8">
              {[
                { val: "4", label: "PENDING APPROVAL", color: "text-amber-400" },
                { val: "Active", label: "POLICY ENGINE", color: "text-[#20E7F2]" },
                { val: "247", label: "EVIDENCE EVENTS", color: "text-white" },
              ].map((s) => (
                <div key={s.label} className="p-4 text-center">
                  <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                  <p className="text-white/30 text-[10px] tracking-widest mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Approval chain */}
            <div className="p-4">
              <p className="text-white/30 text-[10px] font-mono tracking-wider mb-3">THREE-KEY APPROVAL — CAMPAIGN: Q3 LAUNCH</p>
              <div className="space-y-2">
                {[
                  { text: "Key 1: Technical authority verified · Policy v2.4", done: true },
                  { text: "Key 2: Governance validation · Brand Library passed", done: true },
                  { text: "Key 3: Approver signed · Content hash matched · Released", done: true, lock: true },
                ].map((k, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#0a0f1e] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white/70">
                    <span className="text-[#20E7F2]">{k.lock ? "🔒" : "✓"}</span>
                    {k.text}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {["Evidence: AE-0041", "Policy: v2.4", "Approved: 09:41 UTC", "Audit: Recording"].map((tag) => (
                  <span key={tag} className="text-[10px] border border-white/15 rounded-full px-2 py-0.5 text-white/40 font-mono">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Float badge */}
          <div className="absolute -bottom-4 -left-4 bg-[#0D1829] border border-[#20E7F240] rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl">
            <div className="w-8 h-8 rounded-full bg-[#20E7F215] border border-[#20E7F240] flex items-center justify-center text-sm">🔒</div>
            <div>
              <p className="text-white font-black text-lg">100%</p>
              <p className="text-white/40 text-[10px] tracking-widest">APPROVAL-GATED</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── The Problem ── */
function TheProblem() {
  return (
    <section className="bg-[#080E1A] py-24 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div>
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-5 flex items-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> THE PROBLEM
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6">
            The risk is not AI.<br />
            The risk is execution<br />
            without control.
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-4">
            Every enterprise board is now asking the same question: not "should we use AI?" but "can we prove who approved this, under what policy, and what changed after approval?"
          </p>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Uncontrolled execution — not AI itself — is the liability. ZoikoVertex turns AI marketing execution into a controlled system of record.
          </p>
          <div className="border-l-2 border-[#20E7F2] pl-4 bg-[#20E7F208] rounded-r-xl py-4 pr-4 mb-8">
            <p className="text-white font-semibold text-sm leading-relaxed">
              "ZoikoVertex turns AI marketing execution into a controlled system of record — where every action has an owner, every decision has evidence, and every output has an approval signature."
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/request-demo" className="inline-flex items-center gap-2 bg-[#20E7F2] hover:bg-cyan-300 text-[#080E1A] font-bold px-6 py-3 rounded-xl text-sm transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Request Gov Demo
            </Link>
            <button className="inline-flex items-center gap-2 border border-white/20 text-white/70 hover:text-white hover:border-white/40 font-semibold px-6 py-3 rounded-xl text-sm transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
              </svg>
              See Governance Controls
            </button>
          </div>
        </div>

        {/* Right */}
        <div>
          <div className="relative rounded-2xl overflow-hidden mb-4">
            <Image
              src="/images/governance-problem.png"
              alt="Team governance session"
              width={600}
              height={420}
              className="w-full h-[420px] object-cover"
            />
          </div>
          <div className="bg-[#0D1829] border border-white/10 rounded-xl p-4">
            <p className="text-[#20E7F2] font-black text-3xl mb-1">100%</p>
            <p className="text-white/40 text-[10px] tracking-widest font-mono mb-3">APPROVAL-GATED PUBLISHING</p>
            <div className="flex flex-wrap gap-2">
              {["Policy enforced", "Brand check passed", "Audit recording"].map((tag) => (
                <span key={tag} className="text-xs border border-white/15 rounded-full px-3 py-1 text-white/50">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Three-Key Protocol ── */
function ThreeKeyProtocol() {
  const keys = [
    {
      num: "01",
      label: "TECHNICAL AUTHORITY",
      title: "System Integrity Check",
      sub: "Security Admin rules · System verification",
      checks: [
        "Identity and role verification",
        "Scope, tenant, and workflow state",
        "Content hash recorded at intake",
        "Autonomy limit and policy check",
      ],
      failure: "Blocked — reason code logged",
      artifact: "Artifact: Authority check record",
      numColor: "text-amber-400 border-amber-400/30 bg-amber-400/10",
      labelColor: "text-amber-400",
    },
    {
      num: "02",
      label: "GOVERNANCE VALIDATION",
      title: "Policy & Brand Sign-Off",
      sub: "Governance Admin · Brand Steward · Compliance Officer",
      checks: [
        "Policy version compliance verified",
        "Brand standard and claim source check",
        "Jurisdiction and sector rule check",
        "Restricted language and risk class",
      ],
      failure: "Returned or escalated — cannot publish",
      artifact: "Artifact: Validation record + policy snapshot",
      numColor: "text-[#20E7F2] border-[#20E7F240] bg-[#20E7F210]",
      labelColor: "text-[#20E7F2]",
    },
    {
      num: "03",
      label: "HUMAN RELEASE SIGNATURE",
      title: "Authorized Business Sign-Off",
      sub: "Approver / Final Approver / Publisher",
      checks: [
        "Decision, scope, and release window",
        "Channel verified and hash matched",
        "Signature bound to content state",
        "Publish call issued with evidence ID",
      ],
      failure: "Rejected if content changed post-approval",
      artifact: "Artifact: Signed approval chain + publish record",
      numColor: "text-green-400 border-green-400/30 bg-green-400/10",
      labelColor: "text-green-400",
    },
  ];

  return (
    <section className="bg-[#06060f] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> FLAGSHIP GOVERNANCE PROOF
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            The Three-Key Approval Protocol.
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto text-sm leading-relaxed">
            No single actor controls the full authorization chain. Three independent confirmations — each logged, each bound to the content state. If content changes after approval, the workflow resets automatically.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {keys.map((k) => (
            <div key={k.num} className="bg-[#0D1829] border border-white/8 rounded-2xl p-6 flex flex-col">
              <div className={`w-10 h-10 rounded-full border text-sm font-black flex items-center justify-center mb-6 mx-auto ${k.numColor}`}>
                {k.num}
              </div>
              <p className={`text-xs font-bold tracking-widest uppercase text-center mb-2 ${k.labelColor}`}>{k.label}</p>
              <h3 className="text-white font-black text-xl text-center mb-1">{k.title}</h3>
              <p className="text-white/30 text-xs text-center mb-5">{k.sub}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {k.checks.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-sm text-white/60">
                    <span className="text-[#20E7F2] mt-0.5 shrink-0">✓</span> {c}
                  </li>
                ))}
              </ul>
              <div className="bg-red-950/40 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400 font-mono mb-2 flex items-center gap-2">
                <span>✕</span> {k.failure}
              </div>
              <div className="bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-xs text-white/30 font-mono">
                {k.artifact}
              </div>
            </div>
          ))}
        </div>

        {/* Quote bar */}
        <div className="bg-[#0D1829] border border-[#20E7F220] rounded-2xl p-6 flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#20E7F210] border border-[#20E7F230] flex items-center justify-center shrink-0 text-xl">🔒</div>
          <p className="text-white font-semibold text-sm leading-relaxed">
            "The publish lock opens only when all three keys are satisfied. No single actor controls the full authorization chain. Every confirmation is immutably recorded."
          </p>
        </div>

        {/* Warning bar */}
        <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center shrink-0 text-base">⚠️</div>
          <div>
            <p className="text-red-400 font-bold text-sm mb-1">Content modified after approval? Approval is void.</p>
            <p className="text-white/40 text-sm leading-relaxed">
              Any material edit changes the content hash and automatically returns the asset to the Review Queue. The prior approval signature is invalidated and a new approval chain is required.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Six Controls ── */
const SIX_CONTROLS = [
  {
    pillar: "PILLAR 01",
    badge: "RBAC + ABAC",
    title: "Role & Permission Control",
    subtitle: "Agents act only within the user's authority.",
    desc: "RBAC with ABAC scoping by brand, region, workspace, channel, risk class, and tenant. Visibility does not equal authority.",
    artifact: "Role attestation report",
    img: "/images/pillar-role-permission.png",
    badgeColor: "bg-[#20E7F215] text-[#20E7F2] border-[#20E7F230]",
  },
  {
    pillar: "PILLAR 02",
    badge: "Policy-as-code",
    title: "Policy-Bound Autonomy",
    subtitle: "AI speed without unmanaged authority.",
    desc: "Autonomy levels, policy-as-code, action gates, escalation triggers, and content-class restrictions applied before every agent action.",
    artifact: "Autonomy policy snapshot",
    img: "/images/pillar-policy-autonomy.png",
    badgeColor: "bg-[#20E7F215] text-[#20E7F2] border-[#20E7F230]",
  },
  {
    pillar: "PILLAR 03",
    badge: "Separation of Duties",
    title: "Approval & Separation of Duties",
    subtitle: "No sensitive action is self-authorized.",
    desc: "Reviewer, Validator, Compliance Officer, Approver, Publisher chains enforced structurally — not by honour system.",
    artifact: "Signed approval chain",
    img: "/images/pillar-approval-separation.png",
    badgeColor: "bg-[#20E7F215] text-[#20E7F2] border-[#20E7F230]",
  },
  {
    pillar: "PILLAR 04",
    badge: "Brand Library",
    title: "Brand and Claims Control",
    subtitle: "Brand standards become enforceable rules.",
    desc: "Brand Library, approved claims, prohibited terms, source grounding, and jurisdictional rule packs enforced as policy checks before review.",
    artifact: "Brand and claims review record",
    img: "/images/pillar-brand-claims.png",
    badgeColor: "bg-[#20E7F215] text-[#20E7F2] border-[#20E7F230]",
  },
  {
    pillar: "PILLAR 05",
    badge: "Evidence Vault",
    title: "Evidence and Audit Trail",
    subtitle: "Every action produces an inspectable record.",
    desc: "Append-only event log, decision history, policy versioning, evidence export, and legal-hold readiness. Written at runtime — never reconstructed.",
    artifact: "Evidence Vault export",
    img: "/images/pillar-evidence-audit.png",
    badgeColor: "bg-[#20E7F215] text-[#20E7F2] border-[#20E7F230]",
  },
  {
    pillar: "PILLAR 06",
    badge: "Crisis Console",
    title: "Crisis & Exception Control",
    subtitle: "Urgent situations are controlled, not improvised.",
    desc: "Dual-authorization break-glass, time-boxed crisis mode, reason codes, escalation routing, and post-incident review workflow.",
    artifact: "Exception and override log",
    img: "/images/pillar-crisis-control.png",
    badgeColor: "bg-[#20E7F215] text-[#20E7F2] border-[#20E7F230]",
  },
];

function SixControls() {
  return (
    <section className="bg-[#080E1A] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> GOVERNANCE PILLARS
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Six controls. Every agent action.
          </h2>
          <p className="text-white/50 max-w-2xl text-sm leading-relaxed">
            Each control names its mechanism, artifact, and commercial purpose.<br />
            Governance is not added after execution — it is the execution model.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SIX_CONTROLS.map((c) => (
            <div key={c.pillar} className="bg-[#0D1829] border border-white/8 rounded-2xl overflow-hidden flex flex-col">
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={c.img}
                  alt={c.title}
                  width={600}
                  height={300}
                  className="w-full h-full object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-[#080E1A]/40" />
                {/* Badge overlay */}
                <span className={`absolute bottom-3 left-3 text-[10px] font-mono font-bold px-2 py-1 rounded border ${c.badgeColor}`}>
                  {c.badge}
                </span>
              </div>
              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <p className="text-white/30 text-[10px] font-mono tracking-widest mb-2">{c.pillar}</p>
                <h3 className="text-white font-black text-lg mb-1">{c.title}</h3>
                <p className="text-[#20E7F2] text-xs font-mono italic mb-3">{c.subtitle}</p>
                <p className="text-white/50 text-sm leading-relaxed mb-4 flex-1">{c.desc}</p>
                <div className="bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-xs font-mono text-white/30 flex items-center gap-2">
                  <span className="text-white/20">ARTIFACT</span> {c.artifact}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Enterprise Risk Table ── */
const RISKS = [
  { risk: "Unauthorised content publication", control: "Three-Key Approval Protocol", severity: "critical" },
  { risk: "Off-brand or prohibited claims", control: "Brand Library policy enforcement", severity: "high" },
  { risk: "Policy version mismatch", control: "Policy-as-code with version binding", severity: "high" },
  { risk: "Post-approval content modification", control: "Content hash re-verification gate", severity: "critical" },
  { risk: "Role escalation or privilege abuse", control: "RBAC + ABAC with separation of duties", severity: "high" },
  { risk: "Unattributed AI-generated output", control: "Actor identity logged at every step", severity: "medium" },
  { risk: "Evidence gap in regulatory review", control: "Evidence Vault with legal hold", severity: "critical" },
  { risk: "Cross-brand data leakage", control: "Workspace isolation + brand-scoped roles", severity: "high" },
];

const SEVERITY_STYLE: Record<string, string> = {
  critical: "text-red-400 bg-red-950/40 border-red-500/20",
  high: "text-amber-400 bg-amber-950/40 border-amber-500/20",
  medium: "text-yellow-400 bg-yellow-950/40 border-yellow-500/20",
};

function EnterpriseRisk() {
  return (
    <section className="bg-[#06060f] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> RISK CONTROLS
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Every enterprise risk has<br />a named control mechanism.
          </h2>
        </div>
        <div className="border border-white/8 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-3 bg-[#0a0f1e] border-b border-white/8 px-6 py-3">
            <span className="text-xs font-bold text-white/30 tracking-widest">RISK</span>
            <span className="text-xs font-bold text-white/30 tracking-widest">CONTROL MECHANISM</span>
            <span className="text-xs font-bold text-white/30 tracking-widest">SEVERITY</span>
          </div>
          {RISKS.map((r, i) => (
            <div key={i} className="grid grid-cols-3 items-center px-6 py-4 border-t border-white/5 hover:bg-white/2">
              <span className="text-white/70 text-sm pr-4">{r.risk}</span>
              <span className="text-[#20E7F2] text-sm pr-4">{r.control}</span>
              <span className={`inline-flex w-fit text-xs font-mono px-3 py-1 rounded-full border ${SEVERITY_STYLE[r.severity]}`}>
                {r.severity.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Permanent Record ── */
const RECORD_EVENTS = [
  { time: "09:38 UTC", actor: "Creator", action: "Draft submitted to Review Queue", hash: "c3a1f..." },
  { time: "09:39 UTC", actor: "Brand Steward", action: "Brand Library check — passed", hash: "e7b2d..." },
  { time: "09:40 UTC", actor: "Compliance Officer", action: "Policy v2.4 validated", hash: "a9c4e..." },
  { time: "09:41 UTC", actor: "Final Approver", action: "Approval signed · content hash matched", hash: "f1d8a..." },
  { time: "09:41 UTC", actor: "Publisher", action: "Published — evidence ID AE-0041 issued", hash: "b6e3c..." },
];

function PermanentRecord() {
  return (
    <section className="bg-[#080E1A] py-24 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — image */}
        <div className="relative rounded-2xl overflow-hidden h-[480px]">
          <Image
            src="/images/WhatsApp Image 2026-05-12 at 2.59.29 PM.jpeg"
            alt="Governed team record"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080E1A]/80 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-[#0D1829]/90 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-white/40 text-[10px] font-mono tracking-wider mb-1">EVIDENCE VAULT</p>
              <p className="text-[#20E7F2] font-black text-2xl">AE-0041</p>
              <p className="text-white/50 text-xs">Append-only · WORM-ready · Tamper-evident</p>
            </div>
          </div>
        </div>

        {/* Right — audit log */}
        <div>
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> AUDIT TRAIL
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Every governed action leaves a permanent record.
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-8">
            Every action is written to an append-only ledger at runtime. Records cannot be edited, deleted, or back-dated. The trail is complete, timestamped, and role-attributed by design.
          </p>
          <div className="space-y-3">
            {RECORD_EVENTS.map((e, i) => (
              <div key={i} className="flex items-start gap-3 bg-[#0D1829] border border-white/8 rounded-xl px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-[#20E7F2] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white/30 text-[10px] font-mono">{e.time}</span>
                    <span className="text-[#20E7F2] text-[10px] font-bold tracking-wider">{e.actor.toUpperCase()}</span>
                  </div>
                  <p className="text-white/70 text-sm">{e.action}</p>
                </div>
                <span className="text-white/20 text-[10px] font-mono shrink-0">{e.hash}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Content Autonomy Table ── */
const AUTONOMY_ROWS = [
  { type: "Regulated financial claim", level: "MANUAL ONLY", risk: "critical", desc: "No AI draft — human-authored, compliance-reviewed" },
  { type: "Pharmaceutical benefit statement", level: "MANUAL ONLY", risk: "critical", desc: "Medical review required before any publication" },
  { type: "Campaign headline (regulated)", level: "AI ASSISTED", risk: "high", desc: "AI draft permitted — mandatory human review gate" },
  { type: "Social caption (standard)", level: "AI ASSISTED", risk: "medium", desc: "AI draft with Brand Library check + one-step approval" },
  { type: "Internal newsletter", level: "AI GOVERNED", risk: "low", desc: "AI generates within brand rules — streamlined review" },
  { type: "Product description (evergreen)", level: "FULLY GOVERNED", risk: "low", desc: "AI within approved templates — auto brand-checked" },
];

const LEVEL_STYLE: Record<string, string> = {
  "MANUAL ONLY": "text-red-400 bg-red-950/40 border-red-500/20",
  "AI ASSISTED": "text-amber-400 bg-amber-950/40 border-amber-500/20",
  "AI GOVERNED": "text-yellow-400 bg-yellow-950/40 border-yellow-500/20",
  "FULLY GOVERNED": "text-green-400 bg-green-950/40 border-green-500/20",
};

function ContentAutonomy() {
  return (
    <section className="bg-[#06060f] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> AUTONOMY TIERS
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Autonomy defined by content class —<br />not by a vague slider.
          </h2>
          <p className="text-white/50 max-w-xl text-sm leading-relaxed">
            Every content type has a defined autonomy tier. Risk class, not preference, determines how much AI involvement is permitted.
          </p>
        </div>
        <div className="border border-white/8 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 bg-[#0a0f1e] border-b border-white/8 px-6 py-3">
            {["CONTENT TYPE", "AUTONOMY LEVEL", "RISK CLASS", "GOVERNANCE RULE"].map((h) => (
              <span key={h} className="text-xs font-bold text-white/30 tracking-widest">{h}</span>
            ))}
          </div>
          {AUTONOMY_ROWS.map((r, i) => (
            <div key={i} className="grid grid-cols-4 items-center px-6 py-4 border-t border-white/5 hover:bg-white/2">
              <span className="text-white/70 text-sm pr-4">{r.type}</span>
              <span className={`inline-flex w-fit text-[10px] font-mono font-bold px-3 py-1 rounded-full border ${LEVEL_STYLE[r.level]}`}>
                {r.level}
              </span>
              <span className={`inline-flex w-fit text-[10px] font-mono px-3 py-1 rounded-full border ${SEVERITY_STYLE[r.risk as keyof typeof SEVERITY_STYLE] || "text-white/30 border-white/10"}`}>
                {r.risk.toUpperCase()}
              </span>
              <span className="text-white/40 text-xs pr-4">{r.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Role Authority ── */
const ROLES = [
  { role: "Creator", sub: "Content Studio", authority: "Draft within brand rules", limit: "No approval or publish rights", icon: "✏️" },
  { role: "Reviewer", sub: "Review Queue", authority: "Annotate and return drafts", limit: "Cannot self-approve", icon: "👁️" },
  { role: "Brand Steward", sub: "Brand Library", authority: "Set brand standards and policies", limit: "No content execution rights", icon: "📖" },
  { role: "Compliance Officer", sub: "Audit & Evidence", authority: "Regulated sign-off + audit export", limit: "Scoped to regulated content only", icon: "🛡️" },
  { role: "Final Approver", sub: "Approval Chain", authority: "Final release signature", limit: "Cannot self-approve own content", icon: "✅" },
  { role: "Publisher", sub: "Publishing Calendar", authority: "Execute signed, approved releases", limit: "No post-approval edits", icon: "📤" },
];

function RoleAuthority() {
  return (
    <section className="bg-[#080E1A] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> ROLE GOVERNANCE
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Every role has defined authority —<br />and defined limits.
          </h2>
          <p className="text-white/50 max-w-xl text-sm leading-relaxed">
            The system enforces what each role can and cannot do. Access denial is explicit, explainable, and logged.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ROLES.map((r) => (
            <div key={r.role} className="bg-[#0D1829] border border-white/8 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-4">
                {r.icon}
              </div>
              <h3 className="text-white font-black text-lg">{r.role}</h3>
              <p className="text-[#20E7F2] text-xs font-mono tracking-wider mb-4">→ {r.sub}</p>
              <div className="space-y-3">
                <div>
                  <p className="text-white/30 text-[10px] tracking-widest font-bold mb-1">AUTHORITY</p>
                  <p className="text-white/70 text-sm flex items-start gap-2">
                    <span className="text-[#20E7F2] mt-0.5">✓</span> {r.authority}
                  </p>
                </div>
                <div>
                  <p className="text-white/30 text-[10px] tracking-widest font-bold mb-1">LIMIT</p>
                  <p className="text-red-400 text-sm flex items-start gap-2">
                    <span className="mt-0.5">✕</span> {r.limit}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Request to Evidence ── */
const STAGES = [
  { num: "01", title: "Request", role: "Agent Operator", desc: "Brief submitted with policy context and brand scope" },
  { num: "02", title: "Draft", role: "Content Agent", desc: "AI draft generated within Brand Library constraints" },
  { num: "03", title: "Review", role: "Reviewer · Validator", desc: "Brand, compliance, and claim source checks" },
  { num: "04", title: "Approve", role: "Three-Key Protocol", desc: "Three independent keys — each logged and bound" },
  { num: "05", title: "Publish", role: "Publisher", desc: "Release only after signed, version-current approval" },
  { num: "06", title: "Evidence", role: "Analyst · Auditor", desc: "Complete audit trail exported to Evidence Vault" },
];

function RequestToEvidence() {
  return (
    <section className="bg-[#06060f] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> WORKFLOW
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            From request to evidence —<br />governed at every stage.
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm">
            Six stages from brief to evidence capture. Each stage has an owner, a governance checkpoint, and a control surface.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {STAGES.map((s, i) => (
            <div key={s.num} className="relative">
              {i < STAGES.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[#20E7F240] to-transparent z-10" />
              )}
              <div className="bg-[#0D1829] border border-white/8 rounded-2xl p-4 text-center">
                <span className="text-white/20 text-xs font-mono block mb-3">{s.num}</span>
                <div className="w-10 h-10 rounded-xl bg-[#20E7F210] border border-[#20E7F230] flex items-center justify-center mx-auto mb-3">
                  <span className="text-[#20E7F2] text-sm font-black">{i + 1}</span>
                </div>
                <p className="text-white font-black text-sm mb-1">{s.title}</p>
                <p className="text-white/30 text-[10px] mb-2">{s.role}</p>
                <p className="text-white/40 text-[10px] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Built for Procurement ── */
const PROCUREMENT = [
  { title: "Security Architecture Summary", desc: "Full RBAC/ABAC design, SSO/SAML/SCIM, MFA, and separation of duties documented.", img: "/images/governance-photo.png" },
  { title: "SOC 2 Type II Ready", desc: "Controls mapped to SOC 2 criteria. Evidence available on request for trust review.", img: "/images/category-photo.png" },
  { title: "GDPR Data Processing Addendum", desc: "DPA available on request. Data residency options and DSR workflows included.", img: "/images/WhatsApp Image 2026-05-12 at 2.59.29 PM (1).jpeg" },
  { title: "Role Attestation Reports", desc: "Every role assignment logged, dated, and exportable for HR and compliance audit.", img: "/images/home-category.webp" },
];

function BuiltForProcurement() {
  return (
    <section className="bg-[#080E1A] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> ENTERPRISE TRUST
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Built for procurement,<br />not just demos.
          </h2>
          <p className="text-white/50 max-w-xl text-sm leading-relaxed">
            Trust evidence pre-staged. Every artifact named, every control documented, every question answered before the security review starts.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROCUREMENT.map((p) => (
            <div key={p.title} className="group bg-[#0D1829] border border-white/8 rounded-2xl overflow-hidden">
              <div className="relative h-44 overflow-hidden">
                <Image src={p.img} alt={p.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-[#0D1829]/50" />
              </div>
              <div className="p-5">
                <h3 className="text-white font-black text-sm mb-2">{p.title}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/request-demo" className="inline-flex items-center gap-2 border border-white/20 hover:border-[#20E7F240] text-white/60 hover:text-white text-sm rounded-xl px-6 py-3 transition-all">
            Request Security Documentation →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Stakeholder Answers ── */
const STAKEHOLDERS = [
  {
    role: "CMO",
    icon: "📊",
    concern: "If AI publishes something wrong at scale, I own it. Can I prove what happened?",
    answer: "Complete approval chain, brand policy enforcement, and an audit trail for every piece of content — exportable on demand.",
    artifact: "Signed approval chain + audit export",
  },
  {
    role: "Head of Brand",
    icon: "📖",
    concern: "Agencies and regional teams are generating content that doesn't match our standards.",
    answer: "Brand Library policies enforced as code — not guidelines. Every draft checked before entering review.",
    artifact: "Brand integrity scorecard",
  },
  {
    role: "Compliance Leader",
    icon: "🛡️",
    concern: "I can't approve an AI tool I can't audit. How do I defend this to regulators?",
    answer: "Every agent action is logged with actor identity, role, policy version, and timestamp. Evidence Vault for regulatory review.",
    artifact: "Evidence Vault + policy version history",
  },
  {
    role: "CIO / CTO",
    icon: "🔒",
    concern: "Another AI tool with vague security claims and no real identity architecture.",
    answer: "RBAC + ABAC, SSO/SAML/SCIM, separation of duties, MFA. Security administration separated from identity management by design.",
    artifact: "Security architecture summary",
  },
  {
    role: "CFO / Finance",
    icon: "💼",
    concern: "Marketing claims ROI from AI but can't show me the attribution evidence.",
    answer: "Revenue Attribution Agent produces evidence-grade attribution with logged model assumptions that survives board scrutiny.",
    artifact: "Board-grade attribution report",
  },
  {
    role: "Legal Counsel",
    icon: "⚖️",
    concern: "I need to know what was published, when, by whom, and under what policy.",
    answer: "Immutable audit trail with append-only ledger, legal hold on Command plans, and timestamped evidence exports.",
    artifact: "Legal hold + full evidence chain",
  },
];

function StakeholderAnswers() {
  return (
    <section className="bg-[#06060f] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> STAKEHOLDER ANSWERS
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Every stakeholder gets<br />their governance answer.
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm">
            Different roles carry different governance anxieties. Every leader sees their problem — and the evidence that resolves it.
          </p>
        </div>
        <div className="space-y-4">
          {STAKEHOLDERS.map((s) => (
            <div key={s.role} className="bg-[#0D1829] border border-white/8 rounded-2xl p-6 grid lg:grid-cols-3 gap-6 items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">
                  {s.icon}
                </div>
                <div>
                  <p className="text-[#20E7F2] font-black text-sm tracking-wider">{s.role}</p>
                </div>
              </div>
              <div>
                <p className="text-white/30 text-[10px] tracking-widest font-bold mb-2">CONCERN</p>
                <blockquote className="border-l-2 border-white/20 pl-3 text-white/60 text-sm leading-relaxed italic">
                  "{s.concern}"
                </blockquote>
              </div>
              <div>
                <p className="text-white/30 text-[10px] tracking-widest font-bold mb-2">ANSWER</p>
                <p className="text-white/70 text-sm leading-relaxed mb-3">{s.answer}</p>
                <div className="border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-white/30 inline-flex items-center gap-2">
                  <span className="text-white/20">ARTIFACT</span> {s.artifact}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ── */
const FAQS = [
  { q: "Can ZoikoVertex prove who approved a piece of content and when?", a: "Yes. Every approval action is logged with actor identity, role at time of action, policy version, content hash, and UTC timestamp. Records are append-only and cannot be modified." },
  { q: "What happens if content is changed after approval?", a: "The content hash changes. ZoikoVertex detects the mismatch, voids the prior approval signature, and automatically returns the asset to the Review Queue. A new approval chain is required." },
  { q: "How does the Three-Key Approval Protocol prevent single-actor abuse?", a: "Each key is held by a different role with different authority scope. No single actor can satisfy all three keys. Separation of duties is enforced structurally, not by policy alone." },
  { q: "Is the audit trail tamper-evident?", a: "Yes. The audit trail is append-only — records cannot be edited, deleted, or back-dated. It is WORM-ready by design and exportable via Evidence Vault for regulatory review." },
  { q: "How are autonomy tiers assigned to content types?", a: "Autonomy tiers are defined by risk class — not by user preference. Regulated content types are locked to manual or AI-assisted tiers. Governance Admins configure the mapping within policy-as-code rules." },
  { q: "What security documentation is available for procurement?", a: "SOC 2 Type II report, full security architecture summary, GDPR data processing addendum, and role attestation reports are available on request for enterprise procurement review." },
];

function GovernanceFAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="bg-[#080E1A] py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> FAQ
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            The governance questions<br />before the demo.
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm">
            Enterprise buyers ask about audit trails, approval integrity, tamper evidence, and security before committing.
          </p>
        </div>
        <div className="space-y-0">
          {FAQS.map((faq, i) => (
            <div key={i} className="border-t border-white/8">
              <button
                className="w-full text-left py-5 flex items-start justify-between gap-4"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="text-white font-semibold text-sm">{faq.q}</span>
                <span className="text-white/40 text-lg shrink-0">{open === i ? "×" : "+"}</span>
              </button>
              {open === i && (
                <p className="text-white/50 text-sm pb-5 leading-relaxed">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA ── */
function CTA() {
  return (
    <section className="py-24 px-6" style={{ background: "linear-gradient(160deg,#0d1a35 0%,#080e1a 100%)" }}>
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-6 flex items-center justify-center gap-2">
          <span className="w-8 h-px bg-[#20E7F2]" /> GOVERNED FROM DAY ONE
        </p>
        <h2 className="text-4xl lg:text-6xl font-black text-white leading-tight mb-6">
          Governance isn't a feature.<br />
          <span className="text-[#20E7F2]">It's the foundation.</span>
        </h2>
        <p className="text-white/50 text-sm max-w-xl mx-auto mb-10">
          Deploy in 72 hours. Every agent action logged, governed, and audit-ready from day one. No code required.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/request-demo" className="bg-[#20E7F2] hover:bg-cyan-300 text-[#080E1A] font-bold px-8 py-3.5 rounded-xl transition-all text-sm">
            Request a Gov Demo →
          </Link>
          <Link href="/platform" className="border border-white/20 hover:border-white/40 text-white font-semibold px-8 py-3.5 rounded-xl transition-all hover:bg-white/5 text-sm">
            Explore the Platform
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Page ── */
export default function GovernancePage() {
  return (
    <main className="min-h-screen bg-[#080E1A]">
      <Navbar />
      <div className="pt-16">
        <Hero />
        <Ticker />
        <TheProblem />
        <ThreeKeyProtocol />
        <SixControls />
        <EnterpriseRisk />
        <PermanentRecord />
        <ContentAutonomy />
        <RoleAuthority />
        <RequestToEvidence />
        <BuiltForProcurement />
        <StakeholderAnswers />
        <GovernanceFAQ />
        <CTA />
      </div>
      <Footer />
    </main>
  );
}
