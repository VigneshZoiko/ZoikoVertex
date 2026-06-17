import Link from "next/link";
import { Play, Clock, FileText } from "lucide-react";

const Check = () => (
  <svg
    width="8"
    height="8"
    viewBox="0 0 10 8"
    fill="none"
    className="flex-shrink-0"
  >
    <path
      d="M1 4l3 3 5-6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Pricing() {
  const plans = [
    {
      tag: "FREE TIER",
      name: "Vertex Starter",
      price: "$0",
      billingNote: "always free",
      desc: "Connect channels, understand your governance posture, and see where ZoikoVertex reduces risk before your team commits.",
      stats: [
        { label: "users", value: "2" },
        { label: "channels", value: "2" },
        { label: "history", value: "386" },
      ],
      sectionLabel: "INCLUDED",
      features: [
        "Command Center (limited)",
        "Analytics snapshot",
        "AI recommendations — read-only",
        "Basic activity log",
        "Email support + help center",
      ],
      excluded: [
        "Live publishing or execution",
        "Approvals or workflows",
        "API access",
      ],
      cta: "Start free",
      ctaIcon: "play",
      ctaStyle: "ghost",
      highlight: false,
      recommended: false,
      footerNote: "No live execution authority on this plan.",
    },
    {
      tag: "ENTRY STEP, TIER",
      name: "Vertex Growth",
      price: "$299",
      billingNote: "$299 billed annually",
      desc: "Run governed campaigns with AI agents, approvals, publishing, and audit-ready execution for one brand team.",
      stats: [
        { label: "users", value: "7" },
        { label: "profiles", value: "8" },
        { label: "brand", value: "1" },
        { label: "history", value: "12mo" },
      ],
      sectionLabel: "EXECUTION",
      features: [
        "Content Studio + publishing",
        "5 AI agents — standard governed",
        "Review Queue + two-step approvals",
        "Immutable audit trail + export",
        "Basic Brand Library",
        "Analytics & ROI — standard",
        "Priority email support",
      ],
      excluded: ["Multi-brand portfolio", "Crisis Console", "SSO/SCIM"],
      cta: "Start 14-day trial",
      ctaIcon: "clock",
      ctaStyle: "ghost",
      highlight: false,
      recommended: false,
      footerNote: "Single-brand workspace only. No multi-entity governance.",
    },
    {
      tag: "RECOMMENDED · COMMERCIAL CENTER",
      name: "Vertex Scale",
      price: "$799",
      billingNote: "$799 billed annually",
      desc: "Coordinate multi-brand teams with advanced approvals, full Brand Library, governed agents, and cross-brand performance intelligence.",
      stats: [
        { label: "users", value: "20" },
        { label: "profiles", value: "25" },
        { label: "brands", value: "5" },
        { label: "history", value: "24mo" },
      ],
      sectionLabel: "EVERYTHING IN GROWTH, PLUS",
      features: [
        "5 AI agents — advanced multi-brand",
        "Advanced multi-stage approvals",
        "Multi-key approval + SoD enforcement",
        "Full Brand Library — standards & rules",
        "Crisis Console (standard activation)",
        "Advanced evidence packaging",
        "Cross-brand Analytics & ROI",
        "Named Customer Success Manager",
        "Quarterly governance review",
      ],
      excluded: [],
      cta: "Book strategy call",
      ctaIcon: "",
      ctaStyle: "solid",
      highlight: true,
      recommended: true,
      footerNote:
        "No legal hold or custom SLA unless separately contracted.",
    },
    {
      tag: "REQUIREMENT-BASED",
      name: "Vertex Corporate",
      price: "Custom",
      billingNote: "Annual multi-year contract",
      desc: "Deploy across corporate brands, regulated workflows, advanced security, evidence-grade auditability, and custom governance architecture.",
      stats: [
        { label: "users", value: "Custom" },
        { label: "profiles", value: "Custom" },
        { label: "brands", value: "Custom" },
      ],
      sectionLabel: "EVERYTHING IN SCALE, PLUS",
      features: [
        "Three-key approval protocol",
        "Evidence Vault + legal hold",
        "Chain-of-custody + watermarked exports",
        "Custom AI governance configuration",
        "Crisis Console — full dual-activation",
        "SSO/SAML + SCIM provisioning",
        "DPA + security whitepaper",
        "Named AE + TAM + agreed SLA",
      ],
      excluded: [],
      cta: "Request corporate brief",
      ctaIcon: "file",
      ctaStyle: "ghost-cyan",
      highlight: false,
      recommended: false,
      footerNote:
        "Security and legal review required. SOC2 subject to approval.",
    },
  ];

  return (
    <section className="bg-[#070C1E] py-24 px-6" id="pricing">
      <div className="max-w-7xl mx-auto text-center mb-14">
        <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
          — Pricing
        </p>
        <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
          Start with proof. Scale with confidence.
        </h2>
        <p className="text-white/50 max-w-xl mx-auto mb-8">
          Your deployment team has built us a good base security. Free to start,
          no credit card required.
        </p>
        <div className="inline-flex items-center gap-3">
          <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-full px-2 py-1.5">
            <button className="text-sm text-white/40 px-4 py-1.5 rounded-full transition-all">
              Monthly
            </button>
            <button className="text-sm font-semibold text-black bg-cyan-400 px-4 py-1.5 rounded-full transition-all">
              Annual
            </button>
          </div>
          <span className="text-xs font-bold text-green-400 bg-green-400/10 border border-green-400/30 px-3 py-1.5 rounded-full">
            Save up to 25%
          </span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`rounded-2xl p-6 border flex flex-col relative ${
              p.highlight
                ? "border-cyan-400/50 shadow-[0_0_40px_rgba(0,200,240,0.12)]"
                : "border-white/10"
            }`}
            style={
              p.highlight
                ? {
                    background:
                      "linear-gradient(160deg,#0d1a2e 0%,#080d1a 100%)",
                  }
                : { background: "rgba(255,255,255,0.03)" }
            }
          >
            {p.recommended && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black tracking-widest uppercase text-black bg-cyan-400 px-4 py-1 rounded-full whitespace-nowrap">
                Recommended
              </span>
            )}
            <p
              className="text-[10px] font-bold tracking-widest uppercase mb-3"
              style={{
                color: p.highlight ? "#00c8f0" : "rgba(255,255,255,0.35)",
              }}
            >
              {p.tag}
            </p>
            <h3 className="text-white font-black text-xl mb-2">{p.name}</h3>
            <div className="flex items-end gap-1 mb-1">
              {p.price !== "Custom" && (
                <span className="text-white/50 text-sm leading-none mb-1">
                  $
                </span>
              )}
              <span className="text-4xl font-black text-white leading-none">
                {p.price === "Custom" ? "Custom" : p.price.replace("$", "")}
              </span>
              {p.price !== "Custom" && (
                <span className="text-white/40 text-xs mb-1">/mo</span>
              )}
            </div>
            <p className="text-white/30 text-[10px] mb-4">{p.billingNote}</p>
            <p className="text-white/50 text-xs leading-relaxed mb-5 pb-5 border-b border-white/10">
              {p.desc}
            </p>
            <Link
              href="/signup"
              className={`text-center font-bold py-2.5 rounded-xl text-xs transition-all mb-5 flex items-center justify-center gap-2 ${
                p.ctaStyle === "solid"
                  ? "bg-cyan-400 hover:bg-cyan-300 text-black"
                  : p.ctaStyle === "ghost-cyan"
                    ? "border border-cyan-400/60 hover:border-cyan-400 text-cyan-400 hover:bg-cyan-400/5"
                    : "border border-white/20 hover:border-white/40 text-white hover:bg-white/5"
              }`}
            >
              {p.ctaIcon === "play" && <Play className="w-3 h-3" />}
              {p.ctaIcon === "clock" && <Clock className="w-3 h-3" />}
              {p.ctaIcon === "file" && <FileText className="w-3 h-3" />}
              {p.cta}
            </Link>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-5 pb-5 border-b border-white/10">
              {p.stats.map((s) => (
                <div key={s.label}>
                  <p className="text-white font-bold text-sm">{s.value}</p>
                  <p className="text-white/30 text-[10px]">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-3">
              {p.sectionLabel}
            </p>
            <ul className="space-y-2 mb-4">
              {p.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-white/70 text-xs"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: "rgba(0,200,240,0.15)",
                      color: "#00c8f0",
                    }}
                  >
                    <Check />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            {p.excluded.length > 0 && (
              <>
                <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-3 mt-2">
                  NOT INCLUDED
                </p>
                <ul className="space-y-2 mb-4">
                  {p.excluded.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-white/30 text-xs"
                    >
                      <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-white/5 text-white/20">
                        <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
                          <path
                            d="M1 1l6 6M7 1L1 7"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {p.footerNote && (
              <p className="text-white/20 text-[10px] leading-relaxed mt-auto pt-4 border-t border-white/5">
                {p.footerNote}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto mt-12">
        <div className="flex items-center justify-center gap-3 py-5">
          <span className="text-white/40 text-sm">Need help choosing?</span>
          <a
            href="#"
            className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            Compare all plans <span>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
