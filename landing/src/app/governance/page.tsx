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
            src="/images/audit-trail-left.png"
            alt="ZoikoVertex governed workspace"
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

/* ── Content Autonomy Matrix ── */
type AutonomyCell = { label: string; style: string } | null;

const AUTONOMY_MATRIX: { contentClass: string; cells: AutonomyCell[] }[] = [
  {
    contentClass: "Organic low-risk social post",
    cells: [
      null,
      { label: "Ideas only", style: "text-white/50 border-white/15 bg-white/5" },
      { label: "Draft allowed", style: "text-[#20E7F2] border-[#20E7F2]/30 bg-[#20E7F2]/8" },
      { label: "After approval", style: "text-amber-300 border-amber-400/30 bg-amber-400/10" },
      { label: "Pre-approved", style: "text-green-400 border-green-500/30 bg-green-500/10" },
      { label: "Disabled", style: "text-red-400 border-red-500/30 bg-red-500/10" },
    ],
  },
  {
    contentClass: "Regulated marketing claim",
    cells: [
      null,
      { label: "Suggest sources", style: "text-white/50 border-white/15 bg-white/5" },
      { label: "Draft w/ library", style: "text-[#20E7F2] border-[#20E7F2]/30 bg-[#20E7F2]/8" },
      { label: "Validation req'd", style: "text-amber-300 border-amber-400/30 bg-amber-400/10" },
      { label: "Not allowed", style: "text-red-400 border-red-500/30 bg-red-500/10" },
      { label: "Not allowed", style: "text-red-400 border-red-500/30 bg-red-500/10" },
    ],
  },
  {
    contentClass: "Paid campaign asset",
    cells: [
      null,
      { label: "Audience ideas", style: "text-white/50 border-white/15 bg-white/5" },
      { label: "Draft variants", style: "text-[#20E7F2] border-[#20E7F2]/30 bg-[#20E7F2]/8" },
      { label: "Route for approval", style: "text-amber-300 border-amber-400/30 bg-amber-400/10" },
      { label: "Signed approval", style: "text-green-400 border-green-500/30 bg-green-500/10" },
      { label: "Not allowed", style: "text-red-400 border-red-500/30 bg-red-500/10" },
    ],
  },
  {
    contentClass: "Community response",
    cells: [
      null,
      { label: "Triage suggestion", style: "text-white/50 border-white/15 bg-white/5" },
      { label: "Suggested reply", style: "text-[#20E7F2] border-[#20E7F2]/30 bg-[#20E7F2]/8" },
      { label: "Human send", style: "text-amber-300 border-amber-400/30 bg-amber-400/10" },
      { label: "Low-risk templates", style: "text-green-400 border-green-500/30 bg-green-500/10" },
      { label: "Not allowed", style: "text-red-400 border-red-500/30 bg-red-500/10" },
    ],
  },
  {
    contentClass: "Crisis communication",
    cells: [
      null,
      { label: "Summarize signals", style: "text-white/50 border-white/15 bg-white/5" },
      { label: "Draft statement", style: "text-[#20E7F2] border-[#20E7F2]/30 bg-[#20E7F2]/8" },
      { label: "Exec approval req'd", style: "text-amber-300 border-amber-400/30 bg-amber-400/10" },
      { label: "Not allowed", style: "text-red-400 border-red-500/30 bg-red-500/10" },
      { label: "Not allowed", style: "text-red-400 border-red-500/30 bg-red-500/10" },
    ],
  },
  {
    contentClass: "Revenue attribution report",
    cells: [
      null,
      { label: "Insight prompt", style: "text-white/50 border-white/15 bg-white/5" },
      { label: "Draft report", style: "text-[#20E7F2] border-[#20E7F2]/30 bg-[#20E7F2]/8" },
      { label: "Internal dashboard", style: "text-amber-300 border-amber-400/30 bg-amber-400/10" },
      { label: "Approved schedule", style: "text-green-400 border-green-500/30 bg-green-500/10" },
      { label: "Gov review req'd", style: "text-red-400 border-red-500/30 bg-red-500/10" },
    ],
  },
];

const MATRIX_HEADERS = [
  { label: "CONTENT CLASS", highlight: false },
  { label: "L0 OFF", highlight: false },
  { label: "L1 SUGGEST", highlight: false },
  { label: "L2 DRAFT", highlight: false },
  { label: "L3 ASSISTED", highlight: true },
  { label: "L4 GOVERNED", highlight: false },
  { label: "L5 RESTRICTED", highlight: false },
];

function ContentAutonomy() {
  return (
    <section className="bg-[#06060f] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> AUTONOMY GOVERNANCE MATRIX
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Autonomy defined by content class —<br />not by a vague slider.
          </h2>
          <p className="text-white/50 max-w-2xl text-sm leading-relaxed">
            Six autonomy levels applied per content class. Level 5 is restricted by default and requires governance configuration and policy authorization to expand.
          </p>
        </div>
        <div className="border border-white/8 rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-[#0a0f1e] border-b border-white/8">
                {MATRIX_HEADERS.map((h) => (
                  <th
                    key={h.label}
                    className={`px-4 py-3 text-left text-[10px] font-bold tracking-widest font-mono ${h.highlight ? "text-amber-300" : "text-white/30"}`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AUTONOMY_MATRIX.map((row, i) => (
                <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-4 text-white/80 text-sm font-semibold whitespace-nowrap pr-6">{row.contentClass}</td>
                  {row.cells.map((cell, j) => (
                    <td key={j} className="px-4 py-4">
                      {cell === null ? (
                        <span className="text-white/20 text-base">×</span>
                      ) : (
                        <span className={`inline-block text-[10px] font-mono font-medium px-2 py-1 rounded border whitespace-nowrap ${cell.style}`}>
                          {cell.label}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ── Role Authority ── */
const ROLES = [
  {
    role: "Governance Admin",
    desc: "Configure policies, risk classes, approval chains, and autonomy limits platform-wide.",
    limit: "Cannot self-approve governed content",
    highlight: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2a2.667 2.667 0 100 5.333A2.667 2.667 0 0010 2zM3.667 10.833A1.167 1.167 0 014.833 9.667h10.334a1.167 1.167 0 011.166 1.166v.334a3.5 3.5 0 01-3.5 3.5H7.167a3.5 3.5 0 01-3.5-3.5v-.334z" fill="#20E7F2" fillOpacity="0.8" />
        <circle cx="10" cy="10" r="2" stroke="#20E7F2" strokeWidth="1.2" fill="none" />
        <path d="M10 7v1.5M10 11.5V13M7 10H8.5M11.5 10H13" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    role: "Brand Steward",
    desc: "Maintain brand voice, approved claims, prohibited terms, and versioned policy rules.",
    limit: "Cannot release regulated content without approval",
    highlight: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="2" width="12" height="16" rx="2" stroke="#20E7F2" strokeWidth="1.2" fill="none" strokeOpacity="0.8" />
        <path d="M7 7h6M7 10h6M7 13h4" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.8" />
      </svg>
    ),
  },
  {
    role: "Compliance Officer",
    desc: "Validate regulated claims, jurisdictional rules, evidence, and escalations.",
    limit: "Cannot replace business approver unless configured",
    highlight: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L4 4.5v5.5c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V4.5L10 2z" stroke="#20E7F2" strokeWidth="1.2" fill="none" strokeOpacity="0.8" />
        <path d="M7.5 10l2 2 3-3" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" />
      </svg>
    ),
  },
  {
    role: "Creator",
    desc: "Draft content with AI assistance within brand policy boundaries and request review.",
    limit: "Cannot approve, validate, or publish own work",
    highlight: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M13.5 3.5l3 3-9 9H4.5v-3l9-9z" stroke="#20E7F2" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" />
      </svg>
    ),
  },
  {
    role: "Reviewer",
    desc: "Comment, request changes, and route content to the validation stage.",
    limit: "Cannot final-approve high-risk content",
    highlight: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <ellipse cx="10" cy="10" rx="8" ry="5" stroke="#20E7F2" strokeWidth="1.2" strokeOpacity="0.8" fill="none" />
        <circle cx="10" cy="10" r="2" fill="#20E7F2" fillOpacity="0.8" />
      </svg>
    ),
  },
  {
    role: "Validator",
    desc: "Confirm claims, source grounding, and policy readiness before business approval.",
    limit: "Cannot publish content directly",
    highlight: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="5" y="2" width="10" height="16" rx="2" stroke="#20E7F2" strokeWidth="1.2" fill="none" strokeOpacity="0.8" />
        <path d="M8 7h4M8 10h4M8 13h2" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.8" />
        <path d="M7 6.5l.5.5 1-1" stroke="#20E7F2" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" />
      </svg>
    ),
  },
  {
    role: "Approver",
    desc: "Approve content within assigned scope, risk class, and jurisdiction.",
    limit: "Cannot approve outside assigned scope",
    highlight: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="#20E7F2" strokeWidth="1.2" fill="none" strokeOpacity="0.8" />
        <path d="M7 10l2 2 4-4" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" />
      </svg>
    ),
  },
  {
    role: "Publisher",
    desc: "Publish only eligible, signed, and version-current content.",
    limit: "Cannot modify after approval without re-review",
    highlight: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M17 3L9 11M17 3l-5 14-3-6-6-3 14-5z" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" />
      </svg>
    ),
  },
];

function RoleAuthority() {
  return (
    <section className="bg-[#080E1A] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> ROLE MAPPING
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Every role has defined authority<br />— and defined limits.
          </h2>
          <p className="text-white/50 max-w-2xl text-sm leading-relaxed">
            Governance is enforced structurally, not by policy alone. Each role does exactly what is needed — and nothing more.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLES.map((r) => (
            <div
              key={r.role}
              className={`rounded-2xl p-5 flex flex-col gap-4 ${
                r.highlight
                  ? "bg-[#0D1829] border-2 border-[#20E7F2]/40"
                  : "bg-[#0D1829] border border-white/8"
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-[#20E7F2]/10 border border-[#20E7F2]/20 flex items-center justify-center">
                {r.icon}
              </div>
              <div>
                <h3 className="text-white font-bold text-base mb-1">{r.role}</h3>
                <p className="text-white/50 text-xs leading-relaxed">{r.desc}</p>
              </div>
              <div className="mt-auto">
                <div className="bg-red-950/40 border border-red-500/20 rounded-lg px-3 py-2">
                  <p className="text-red-400 text-[10px] font-mono leading-snug">
                    × {r.limit}
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
  {
    num: "01", title: "Create Request", role: "Requester", decision: "Has authority?", decisionCyan: true,
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 4v10M4 9h10" stroke="#20E7F2" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  {
    num: "02", title: "Apply Context", role: "System", decision: "Which policy?", decisionCyan: true,
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2" stroke="#20E7F2" strokeWidth="1.2"/><path d="M9 2v2M9 14v2M2 9h2M14 9h2M4.1 4.1l1.4 1.4M12.5 12.5l1.4 1.4M4.1 13.9l1.4-1.4M12.5 5.5l1.4-1.4" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  },
  {
    num: "03", title: "Generate / Assist", role: "Agent Operator", decision: "Within limits?", decisionCyan: false,
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="5" width="12" height="8" rx="2" stroke="#20E7F2" strokeWidth="1.2"/><circle cx="6.5" cy="9" r="1" fill="#20E7F2" fillOpacity="0.7"/><circle cx="9" cy="9" r="1" fill="#20E7F2" fillOpacity="0.7"/><circle cx="11.5" cy="9" r="1" fill="#20E7F2" fillOpacity="0.7"/></svg>,
  },
  {
    num: "04", title: "Review", role: "Reviewer", decision: "Return or validate?", decisionCyan: true,
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><ellipse cx="9" cy="9" rx="7" ry="4.5" stroke="#20E7F2" strokeWidth="1.2"/><circle cx="9" cy="9" r="2" fill="#20E7F2" fillOpacity="0.8"/></svg>,
  },
  {
    num: "05", title: "Validate", role: "Validator · Compliance", decision: "Approve or escalate?", decisionCyan: false,
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="4" y="2" width="10" height="14" rx="2" stroke="#20E7F2" strokeWidth="1.2"/><path d="M7 7h4M7 10h4M7 13h2" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  },
  {
    num: "06", title: "Approve", role: "Approver", decision: "Signature valid?", decisionCyan: true,
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="#20E7F2" strokeWidth="1.2"/><path d="M6 9l2 2 4-4" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    num: "07", title: "Publish / Execute", role: "Publisher", decision: "Content unchanged?", decisionCyan: false,
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M16 2L8 10M16 2l-5 13-3-5.5-5.5-3L16 2z" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    num: "08", title: "Evidence", role: "Auditor · System", decision: "Export or hold?", decisionCyan: true,
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="12" height="12" rx="2" stroke="#20E7F2" strokeWidth="1.2"/><path d="M9 7v4M7 9h4" stroke="#20E7F2" strokeWidth="1.2" strokeLinecap="round"/><path d="M6 14v1M9 14v1M12 14v1" stroke="#20E7F2" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.5"/></svg>,
  },
];

function RequestToEvidence() {
  return (
    <section className="bg-[#06060f] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-[#20E7F2]" /> GOVERNANCE OPERATING FLOW
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            From request to evidence —<br />governed at every stage.
          </h2>
          <p className="text-white/50 max-w-xl text-sm leading-relaxed">
            Eight stages. Each has an owner role, a system action, and a decision point.<br />No stage bypasses the next.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-8 gap-3">
          {STAGES.map((s, i) => (
            <div key={s.num} className="relative">
              {i < STAGES.length - 1 && (
                <div className="hidden lg:block absolute top-[52px] left-full w-full h-px bg-gradient-to-r from-[#20E7F2]/20 to-transparent z-10" />
              )}
              <div className="bg-[#0D1829] border border-white/8 rounded-2xl p-4 flex flex-col gap-3 h-full">
                <span className="text-white/25 text-[10px] font-mono">{s.num}</span>
                <div className="w-10 h-10 rounded-xl bg-[#20E7F2]/10 border border-[#20E7F2]/20 flex items-center justify-center">
                  {s.icon}
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-snug">{s.title}</p>
                  <p className="text-white/35 text-[10px] mt-0.5 leading-snug">{s.role}</p>
                </div>
                <div className={`mt-auto rounded-lg px-2.5 py-1.5 border ${s.decisionCyan ? "border-[#20E7F2]/25 bg-[#20E7F2]/8" : "border-white/10 bg-white/4"}`}>
                  <p className={`text-[10px] font-mono leading-snug ${s.decisionCyan ? "text-[#20E7F2]" : "text-white/50"}`}>
                    {s.decision}
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
