import Image from "next/image";
import { Shield, Globe, Activity, FileText } from "lucide-react";

export default function EnterpriseBanner() {
  const features = [
    {
      title: "Advertising rule enforcement",
      desc: "Automatically applied before live publication — brand safety screening across all generated and deployed content, every time.",
      icon: Shield,
    },
    {
      title: "Jurisdiction-aware multi-market control",
      desc: "Different advertising laws, different rules. ZoikoVertex applies the correct compliance framework per market, per channel, per sector automatically.",
      icon: Globe,
    },
    {
      title: "Confidence scoring on every decision",
      desc: "Lower-confidence actions trigger approval workflows. Higher-confidence actions execute within policy. The system never operates outside its boundaries.",
      icon: Activity,
    },
    {
      title: "Full audit logs and action histories",
      desc: "Every allocation decision, creative choice, and campaign action is logged, timestamped, and traceable for internal review, legal audit, or board escalation.",
      icon: FileText,
    },
  ];

  return (
    <section className="py-24 px-6" style={{ background: "#070C1E" }} id="enterprise">
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
          <div className="rounded-2xl overflow-hidden">
            <Image
              src="/images/TrustModel_image.png"
              alt="Governance Control Tower"
              width={600}
              height={500}
              className="w-full object-cover"
            />
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
