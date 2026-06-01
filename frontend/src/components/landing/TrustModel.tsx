import { Clock } from "lucide-react";

export default function TrustModel() {
  const phases = [
    {
      num: "01",
      label: "PHASE 01",
      title: "Insight Mode",
      desc: "Recommendations only — no autonomous execution. See exactly what ZoikoVertex would do with your data. Insights appear within 24 hours of data connection.",
      badge: "Day 1–7",
      timeline: "Insights in 24 hours",
    },
    {
      num: "02",
      label: "PHASE 02",
      title: "Assisted Mode",
      desc: "Human approval required before every action. The system proposes. You decide. Optimization signals and performance improvements appear within 72 hours.",
      badge: "Week 2–4",
      timeline: "Optimization in 72 hours",
    },
    {
      num: "03",
      label: "PHASE 03",
      title: "Autonomous Mode",
      desc: "Full governed execution within your defined policy thresholds. Confidence scoring, approval workflows, and override pathways always available. ROI evidence within 30 days.",
      badge: "Month 2+",
      timeline: "Measurable ROI in 30 days",
    },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-4">
            — Safe Deployment Model
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            Governed autonomy, phased trust
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            A three-phase rollout that reduces adoption friction and lets your
            team build confidence before full agentic deployment. Insights in 24
            hours. ROI in 30 days.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {phases.map((p) => (
            <div
              key={p.num}
              className="rounded-2xl p-8 text-center flex flex-col"
              style={{ background: "#f8f9ff", border: "1px solid #e8eaf6" }}
            >
              <span
                className="text-8xl font-black leading-none mb-4"
                style={{ color: "rgba(99,102,241,0.12)" }}
              >
                {p.num}
              </span>
              <p className="text-indigo-500 text-[10px] font-bold tracking-widest uppercase mb-2">
                {p.label}
              </p>
              <h3 className="font-black text-gray-900 text-lg mb-3">
                {p.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1">
                {p.desc}
              </p>
              <div className="flex justify-center mb-4">
                <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full">
                  {p.badge}
                </span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs">
                <Clock size={12} />
                {p.timeline}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
