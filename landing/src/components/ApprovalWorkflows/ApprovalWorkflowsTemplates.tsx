import Image from "next/image";
import { TEMPLATES } from "./approvalWorkflows";

export default function ApprovalWorkflowsTemplates() {
  const [featured, ...rest] = TEMPLATES;

  return (
    <section className="bg-[#101D2F] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-12 max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-4 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Approval Templates</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white mb-4">
            Standardize approvals across brands, markets, and channels.
          </h2>
          <p className="text-white/45 text-[14.5px] leading-relaxed">
            Seven pre-built approval templates for the most common enterprise
            scenarios — each configurable by workspace, brand, client, risk
            level, and market.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 grid-rows-2 gap-4 lg:h-[560px]">
          <TemplateCard t={featured} className="lg:row-span-2 min-h-[280px]" />
          {rest.map((t) => (
            <TemplateCard key={t.title} t={t} className="min-h-[220px]" />
          ))}
        </div>
      </div>
    </section>
  );
}

function TemplateCard({
  t,
  className,
}: {
  t: (typeof TEMPLATES)[number];
  className?: string;
}) {
  return (
    <div className={`relative rounded-2xl overflow-hidden border border-white/10 ${className ?? ""}`}>
      <Image src={t.image} alt="" fill className="object-cover" sizes="400px" />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(8,8,18,0.10) 30%, rgba(8,8,18,0.95) 100%)" }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <span
          className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-2 block ${
            t.featured ? "text-[#C9A84C]" : "text-[#20E7F2]"
          }`}
        >
          {t.tag}
        </span>
        <h3 className="text-white font-bold text-[16px] leading-snug mb-1.5">{t.title}</h3>
        {t.desc && <p className="text-white/50 text-[12px] leading-relaxed">{t.desc}</p>}
      </div>
    </div>
  );
}
