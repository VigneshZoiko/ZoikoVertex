import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation | ZoikoVertex",
  description: "ZoikoVertex platform documentation, guides, and resources.",
};

const SECTIONS = [
  {
    title: "Getting Started",
    items: [
      { label: "Platform Overview", desc: "Understand ZoikoVertex's governed agentic architecture and core concepts." },
      { label: "Workspace Setup", desc: "Create your workspace, invite team members, and configure roles." },
      { label: "Connecting Social Platforms", desc: "Authorise and connect Facebook, Instagram, LinkedIn, X, Pinterest, and Threads." },
      { label: "Your First Campaign", desc: "Plan, create, and publish your first governed campaign end-to-end." },
    ],
  },
  {
    title: "Governance & Compliance",
    items: [
      { label: "Approval Workflow Engine", desc: "Configure multi-stage approval routing for your team's publishing workflow." },
      { label: "Policy Center & Rules", desc: "Set brand rules, advertising standards, and jurisdiction-specific restrictions." },
      { label: "Agent Autonomy Framework", desc: "Understand D0–D3 autonomy levels and how to configure them safely." },
      { label: "Evidence Vault", desc: "Access tamper-evident audit logs and export evidence packs for compliance." },
    ],
  },
  {
    title: "AI Agents",
    items: [
      { label: "Chief Strategy Agent", desc: "Configure revenue and EBITDA alignment for autonomous budget decisions." },
      { label: "Quantitative Ad Spend Agent", desc: "Set CPA, ROAS, and marginal return thresholds for automated reallocation." },
      { label: "Compliance Sentry", desc: "Define brand safety rules and pre-publication legal review criteria." },
      { label: "Growth Optimization Agent", desc: "Set channel mix rules and performance compounding parameters." },
    ],
  },
  {
    title: "Account & Billing",
    items: [
      { label: "Subscription Plans", desc: "Compare Starter, Growth, Scale, and Corporate tiers and their feature sets." },
      { label: "Billing & Invoices", desc: "Manage your payment method, billing cycle, and download invoices." },
      { label: "Workspace Members & Roles", desc: "Add, remove, and configure permissions for workspace members." },
      { label: "Account Suspension", desc: "Understand what causes suspension and how to restore access." },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-full bg-[#0a0a0f] text-white">

      <main className="max-w-5xl mx-auto px-6 pt-[100px] pb-16">
        <div className="mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3">Docs</p>
          <h1 className="text-4xl font-black tracking-tight text-white mb-4">ZoikoVertex Documentation</h1>
          <p className="text-white/50 text-sm max-w-xl leading-relaxed">
            Everything you need to deploy, configure, and operate ZoikoVertex — from workspace setup to enterprise governance.
          </p>
        </div>

        <div className="mb-10">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(32,231,242,0.06)", border: "1px solid rgba(32,231,242,0.15)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#20e7f2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <span className="text-white/40 text-sm">Search documentation...</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {SECTIONS.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl p-6"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-5">{section.title}</h2>
              <ul className="space-y-4">
                {section.items.map((item) => (
                  <li key={item.label}>
                    <a href="#" className="group block">
                      <p className="text-sm font-semibold text-cyan-400 group-hover:text-cyan-300 transition-colors mb-0.5">
                        {item.label} →
                      </p>
                      <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-12 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}
        >
          <div>
            <p className="text-sm font-semibold text-white mb-1">Need help from our team?</p>
            <p className="text-xs text-white/50">Our support team is available for workspace and billing issues.</p>
          </div>
          <Link
            href="/support"
            className="shrink-0 text-xs font-semibold px-5 py-2.5 rounded-full transition-colors"
            style={{ background: "#6366f1", color: "#fff" }}
          >
            Contact Support
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">&copy; {new Date().getFullYear()} ZoikoVertex. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
            <Link href="/support" className="hover:text-white/60 transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
