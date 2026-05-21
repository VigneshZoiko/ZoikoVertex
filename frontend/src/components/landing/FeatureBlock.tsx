import Image from "next/image";
import { Clock, Zap, CheckSquare } from "lucide-react";

export default function FeatureBlock() {
  const comparisons = [
    {
      tool: "Tools explain what happened",
      zoiko: "ZoikoVertex determines what should happen next and acts on it",
      icon: Clock,
    },
    {
      tool: "Tools optimize activity",
      zoiko:
        "ZoikoVertex optimizes revenue, contribution margin, and marketing efficiency",
      icon: Zap,
    },
    {
      tool: "Tools require humans to decide",
      zoiko:
        "ZoikoVertex makes and governs capital decisions continuously, within your policy",
      icon: CheckSquare,
    },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-start">
        <div>
          <div className="inline-flex items-center gap-2 text-indigo-500 text-xs font-semibold tracking-widest uppercase mb-5">
            <span className="w-4 h-px bg-indigo-400" />
            Category Definition
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight mb-6">
            Tools execute tasks.
            <br />
            Systems manage outcomes.
          </h2>
          <p className="text-gray-500 text-base leading-relaxed mb-10">
            Traditional platforms like Hootsuite and Sprout Social help teams
            schedule, publish, and report. They do not allocate capital,
            optimize profit, enforce financial accountability, or align
            execution with enterprise operating realities.
          </p>
          <div className="space-y-4">
            {comparisons.map((c, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 p-5 bg-white flex items-start gap-4"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(79,70,229,0.08)" }}
                >
                  <c.icon size={18} style={{ color: "#4f46e5" }} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {c.tool}
                  </p>
                  <p className="text-gray-500 text-sm leading-snug">
                    {c.zoiko}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl overflow-hidden">
            <Image
              src="/images/category-photo.png"
              alt="Category"
              width={600}
              height={400}
              className="w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
