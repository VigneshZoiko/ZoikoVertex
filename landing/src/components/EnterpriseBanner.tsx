import Image from "next/image";
import { Shield, Globe, BarChart2, FileText } from "lucide-react";

export default function EnterpriseBanner() {
  const features = [
    {
      title: "Advertising rule enforcement",
      desc: "Every agent action is checked against platform-specific advertising rules, brand tone standards, and sector compliance requirements before execution.",
      icon: Shield,
    },
    {
      title: "Jurisdiction-aware multi-market control",
      desc: "ZoikoVertex applies the correct regulatory framework per market — automatically. Different rules for different regions, enforced at the agent level.",
      icon: Globe,
    },
    {
      title: "Confidence scoring on every decision",
      desc: "Agents only act autonomously when confidence thresholds are met. Lower-confidence decisions are routed to human review before any action is taken.",
      icon: BarChart2,
    },
    {
      title: "Full audit logs and action histories",
      desc: "Every agent decision, approval, and execution is logged with full traceability. Exportable for legal review, finance audit, and board reporting.",
      icon: FileText,
    },
  ];

  return (
    <section className="bg-[#080812] py-24 px-6" id="enterprise">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-stretch">
        <div className="space-y-5">
          <div className="rounded-2xl overflow-hidden">
            <Image
              src="/images/governance-photo.png"
              alt="Governance"
              width={600}
              height={420}
              className="w-full object-cover"
            />
          </div>
          <div
            className="rounded-2xl p-6"
            style={{
              background: "#0d1228",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-white font-bold text-sm text-center mb-1">
              Governance Control Tower
            </p>
            <p className="text-white/30 text-[11px] text-center mb-6">
              Autonomous by default Â· Manual by exception
            </p>
            <div
              className="relative flex items-center justify-center mb-6"
              style={{ height: 200 }}
            >
              {[0, 60, 120, 180, 240, 300].map((angle) => {
                const rad = ((angle - 90) * Math.PI) / 180;
                const x1 = 50;
                const y1 = 50;
                const x2 = 50 + 36 * Math.cos(rad);
                const y2 = 50 + 36 * Math.sin(rad);
                return (
                  <svg
                    key={angle}
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: "none" }}
                  >
                    <line
                      x1={`${x1}%`}
                      y1={`${y1}%`}
                      x2={`${x2}%`}
                      y2={`${y2}%`}
                      stroke="rgba(99,102,241,0.25)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                  </svg>
                );
              })}
              <div
                className="absolute z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center text-center"
                style={{
                  background: "linear-gradient(135deg,#1e3a5f,#0d2d4a)",
                  border: "2px solid rgba(0,200,240,0.4)",
                  boxShadow: "0 0 30px rgba(0,200,240,0.2)",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%,-50%)",
                }}
              >
                <span className="text-cyan-400 text-[10px] font-bold leading-tight">
                  Governed
                </span>
                <span className="text-white text-[10px] font-bold leading-tight">
                  Autonomy
                </span>
              </div>
              {[
                { label: "Confidence\nScoring", angle: 0 },
                { label: "Policy\nThresholds", angle: 60 },
                { label: "Override\nControls", angle: 120 },
                { label: "Sector\nRules", angle: 180 },
                { label: "Audit\nLogs", angle: 240 },
                { label: "Approval\nWorkflows", angle: 300 },
              ].map((n) => {
                const rad = ((n.angle - 90) * Math.PI) / 180;
                const r = 38;
                const x = 50 + r * Math.cos(rad);
                const y = 50 + r * Math.sin(rad);
                return (
                  <div
                    key={n.label}
                    className="absolute flex flex-col items-center text-center"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%,-50%)",
                    }}
                  >
                    <div
                      className="rounded-xl px-2 py-1.5"
                      style={{
                        background: "rgba(99,102,241,0.15)",
                        border: "1px solid rgba(99,102,241,0.3)",
                      }}
                    >
                      {n.label.split("\n").map((l, i) => (
                        <p
                          key={i}
                          className="text-[9px] font-semibold text-indigo-300 leading-tight whitespace-nowrap"
                        >
                          {l}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                {
                  phase: "Phase 01",
                  mode: "Insight Mode",
                  sub: "No autonomy",
                  color: "#334155",
                },
                {
                  phase: "Phase 02",
                  mode: "Assistant Mode",
                  sub: "Human approval",
                  color: "#4338ca",
                },
                {
                  phase: "Phase 03",
                  mode: "Autonomous Mode",
                  sub: "Full governed exec",
                  color: "#0d9488",
                },
              ].map((p) => (
                <div
                  key={p.phase}
                  className="rounded-xl px-3 py-2.5 text-center"
                  style={{
                    background: p.color + "33",
                    border: `1px solid ${p.color}66`,
                  }}
                >
                  <p
                    className="text-[9px] font-bold uppercase tracking-wide mb-0.5"
                    style={{
                      color:
                        p.color === "#334155"
                          ? "#94a3b8"
                          : p.color === "#4338ca"
                            ? "#818cf8"
                            : "#2dd4bf",
                    }}
                  >
                    {p.phase}
                  </p>
                  <p className="text-white text-[10px] font-bold leading-tight">
                    {p.mode}
                  </p>
                  <p className="text-white/40 text-[9px]">{p.sub}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {["GDPR Safe", "FCA Aligned", "HIPAA Aware", "SEC Compliant"].map(
                (b) => (
                  <span
                    key={b}
                    className="text-[9px] font-bold text-white/40 px-2.5 py-1 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {b}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
            — Governance & Compliance
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            Full autonomy without governance is unacceptable in enterprise
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-10">
            ZoikoVertex is designed for autonomous-but-governed controlled,
            audit-ready outcomes. Enterprise-safe autonomy — the governance
            rails, but not the brake.
          </p>
          <div className="space-y-7">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-xl p-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(99,102,241,0.25)",
                  }}
                >
                  <f.icon
                    size={16}
                    style={{ color: "#818cf8" }}
                    strokeWidth={1.8}
                  />
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">{f.title}</p>
                  <p className="text-white/50 text-xs leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
