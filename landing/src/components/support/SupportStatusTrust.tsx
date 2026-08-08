import { ArrowRight } from "lucide-react";
import { CONTAINER, MONO, SectionHead, SupportIcon } from "./shared";

type SystemState = "operational" | "degraded";

const SYSTEMS: { name: string; state: SystemState }[] = [
  { name: "Agentic Orchestration", state: "operational" },
  { name: "Approval Workflows", state: "operational" },
  { name: "Evidence Layer & Audit Trail", state: "operational" },
  { name: "Integrations & API", state: "degraded" },
  { name: "Admin & Command Center", state: "operational" },
];

const STATE_STYLE: Record<SystemState, { dot: string; text: string; label: string }> = {
  operational: { dot: "bg-[#34D399]", text: "text-[#34D399]", label: "Operational" },
  degraded: { dot: "bg-[#E8B768]", text: "text-[#E8B768]", label: "Degraded" },
};

const TRUST_REQUESTS = [
  {
    icon: "Report-security-issue.png",
    title: "Report a security issue",
    desc: "Vulnerability, suspicious access, evidence integrity, or unauthorized activity.",
    href: "/security",
  },
  {
    icon: "Submit-privacy-request.png",
    title: "Submit a privacy request",
    desc: "Deletion, access, correction, portability, objection, or processing questions.",
    href: "/privacy",
  },
  {
    icon: "Open-compliance-request.png",
    title: "Open a compliance request",
    desc: "SOC 2 readiness, DPA, subprocessors, auditability, and procurement evidence.",
    href: "/governance",
  },
  {
    icon: "Request-evidence-preservation.png",
    title: "Request evidence preservation",
    desc: "Legal hold status or evidence retention review for enterprise and legal users.",
    href: "/auditability",
  },
];

export default function SupportStatusTrust() {
  return (
    <section id="trust-routing" className="scroll-mt-24 bg-[#0a1020] py-20">
      <div className={CONTAINER}>
        <SectionHead
          eyebrow="Status & trust routing"
          tone="amber"
          title="Transparency and specialist queues."
          lede="See live availability, and route security, privacy, compliance, and evidence requests outside the ordinary support queue."
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-2 lg:items-start">
          {/* ── Live status ──────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
              <span className="flex items-center gap-2.5 text-base font-bold text-slate-100">
                <span
                  className="h-2.5 w-2.5 rounded-full bg-[#34D399]"
                  aria-hidden
                />
                All systems operational
              </span>
              <a
                href="#"
                className={`text-xs leading-4 text-[#20E7F2] transition-opacity hover:opacity-80 ${MONO}`}
              >
                View full status →
              </a>
            </div>

            <ul className="px-6">
              {SYSTEMS.map((s) => {
                const style = STATE_STYLE[s.state];
                return (
                  <li
                    key={s.name}
                    className="flex items-center justify-between gap-4 border-b border-white/10 py-4 last:border-b-0"
                  >
                    <span className="text-sm font-normal text-white/80">
                      {s.name}
                    </span>
                    <span
                      className={`flex shrink-0 items-center gap-1.5 text-xs ${MONO} ${style.text}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                        aria-hidden
                      />
                      {style.label}
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-white/10 bg-white/[0.02] px-6 py-4 text-xs leading-5 text-white/60">
              <span
                className={`shrink-0 font-bold uppercase tracking-wide text-[#E8944B] ${MONO}`}
              >
                Investigating
              </span>
              <span className="min-w-0 flex-1">
                Elevated latency on select third-party connectors. Workflows and
                evidence unaffected. Next update in 30 minutes.
              </span>
            </p>
          </div>

          {/* ── Specialist queues ────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <p
              className={`rounded-xl border border-[#E8B768]/30 bg-[#E8B768]/[0.06] px-4 py-3.5 text-xs leading-5 text-[#E8B768] ${MONO}`}
            >
              Security and privacy requests are handled through specialist
              workflows, not ordinary support queues.
            </p>

            {TRUST_REQUESTS.map((t) => (
              <a
                key={t.title}
                href={t.href}
                className="group flex items-center gap-4 rounded-xl border border-white/10 bg-[#0b1120] px-4 py-4 transition-colors hover:border-white/25"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                  <SupportIcon file={t.icon} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-5 text-slate-100">
                    {t.title}
                  </span>
                  <span className="mt-1 block text-xs font-normal leading-5 text-white/55">
                    {t.desc}
                  </span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-white/35 transition-colors group-hover:text-[#20E7F2]"
                  aria-hidden
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
