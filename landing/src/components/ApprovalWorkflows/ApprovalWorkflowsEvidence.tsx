import Image from "next/image";
import { EVIDENCE_LINKS, EVIDENCE_STATS } from "./approvalWorkflows";

function EvidenceIcon({ id, className }: { id: string; className?: string }) {
  switch (id) {
    case "history":
      return (
        <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.1" />
          <path d="M7.5 4.5v3l2 1.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="2.5" width="9" height="11" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
          <path d="M5.5 2.5V2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v.5M5.5 6.5h4M5.5 9h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      );
    case "lock":
      return (
        <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3.5" y="7" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.1" />
          <path d="M5.5 7V5a2 2 0 0 1 4 0v2" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      );
    case "search":
      return (
        <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.1" />
          <path d="M9.5 9.5 13 13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      );
    case "badge":
      return (
        <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="7.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.1" />
          <path d="M5.3 8 4 13.5l3.5-1.8L11 13.5 9.7 8" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

const PILL_FONT_STYLE = {
  fontFamily: "var(--font-jetbrains)",
  fontSize: 9.3,
  fontWeight: 500,
  letterSpacing: "0.65px",
  textTransform: "uppercase" as const,
};

export default function ApprovalWorkflowsEvidence() {
  return (
    <section className="bg-[#0C1523] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-[1fr_508px] gap-10 items-start">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-px bg-[#20E7F2]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Evidence &amp; Audit Linkage</span>
            </div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-black leading-tight text-white mb-4">
              Every approval becomes a defensible record.
            </h2>
            <p className="text-white/45 text-[14px] leading-relaxed mb-8 max-w-lg">
              One approval decision creates five linked evidence records —
              turning a single human judgment into a complete governance
              trail.
            </p>

            <div className="flex flex-col gap-4">
              {EVIDENCE_LINKS.map((e) => (
                <div key={e.title} className="rounded-xl border border-white/10 bg-[#101D2F] p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="shrink-0 w-8 h-8 rounded-[9px] flex items-center justify-center"
                      style={{ background: `${e.color}1A`, border: `1px solid ${e.color}40`, color: e.color }}
                    >
                      <EvidenceIcon id={e.icon} className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-[14.5px] mb-1.5">{e.title}</h3>
                      <p className="text-white/45 text-[12.5px] leading-relaxed mb-3">{e.desc}</p>
                      <span
                        className="inline-block px-3 py-1.5"
                        style={{
                          ...PILL_FONT_STYLE,
                          borderRadius: 100,
                          border: `1px solid ${e.color}38`,
                          background: `${e.color}1A`,
                          color: e.color,
                        }}
                      >
                        {e.fields.join(" · ")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden w-full max-w-[508px] h-[420px] lg:h-[637px] lg:sticky lg:top-24">
            <Image
              src="/images/approval-workflows/evidence.jpg"
              alt=""
              fill
              className="object-cover"
              sizes="508px"
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, rgba(8,8,18,0.15) 0%, rgba(8,8,18,0.95) 100%)" }}
            />
            <div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-4 p-8">
              {EVIDENCE_STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-[#20E7F2] font-black text-2xl mb-1">{s.value}</p>
                  <p className="text-white/45 text-[10px] uppercase tracking-[0.1em] leading-relaxed">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
