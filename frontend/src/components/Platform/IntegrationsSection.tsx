"use client";

import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Data ──────────────────────────────────────────────────────────────────
const integrations = [
  {
    category: "Social Channels",
    title: "Publishing & Engagement",
    tags: ["Meta", "LinkedIn", "TikTok", "X/Twitter", "YouTube", "Pinterest"],
  },
  {
    category: "Analytics",
    title: "Performance & Attribution",
    tags: ["Google Analytics", "Looker", "BigQuery", "Snowflake"],
  },
  {
    category: "CRM & Revenue",
    title: "Customer & Pipeline Data",
    tags: ["Salesforce", "HubSpot", "Pipedrive", "Zoho CRM"],
  },
  {
    category: "Security & Identity",
    title: "SSO, DAM & Storage",
    tags: ["SSO/SAML", "SCIM", "AWS S3", "Bynder", "Canto"],
  },
];

export default function IntegrationsSection() {
  const { ref: headRef, inView: headInView } = useInView(0.2);
  const { ref: cardsRef, inView: cardsInView } = useInView(0.1);
  const { ref: termRef, inView: termInView } = useInView(0.15);

  return (
    <section className="bg-[#0C1422] w-full px-6 py-16 overflow-hidden">
      <div className="max-w-[1200px] mx-auto">

        {/* ── Header ── */}
        <div
          ref={headRef}
          className="mb-12"
          style={{
            opacity: headInView ? 1 : 0,
            transform: headInView ? "translateY(0px)" : "translateY(48px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <span className="w-5 h-[1.5px] bg-[#20E7F2] inline-block" />
            <span className="text-[#20E7F2] text-[11px] font-semibold tracking-[0.2em] uppercase">
              Integrations &amp; Developer Console
            </span>
          </div>
          <h2 className="text-white font-black text-[2.4rem] md:text-[3rem] leading-[1.1] tracking-tight mb-4 max-w-3xl">
            ZoikoVertex works with your stack. It governs it.
          </h2>
          <p className="text-[#8b9cb3] text-[15px] leading-relaxed max-w-[480px]">
            Connect platforms your teams already use. All integration activity is governed,
            logged, and plan-gated.
          </p>
        </div>

        {/* ── Integration Cards ── */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {integrations.map((item, i) => (
            <div
              key={item.title}
              className="border border-[#ffffff12] rounded-2xl p-5 flex flex-col gap-4 group cursor-default
                hover:border-[#ffffff22] hover:bg-[#ffffff03] transition-all duration-300"
              style={{
                opacity: cardsInView ? 1 : 0,
                transform: cardsInView ? "translateY(0px)" : "translateY(44px)",
                transition: `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`,
              }}
            >
              {/* Category label */}
              <span className="text-[#20E7F2] text-[10px] font-semibold tracking-[0.18em] uppercase">
                {item.category}
              </span>

              {/* Title */}
              <h3 className="text-white font-bold text-[15px] leading-snug group-hover:text-teal-200 transition-colors duration-200">
                {item.title}
              </h3>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[12px] text-[#94A3B8] border border-[#ffffff14] rounded-full px-3 py-1
                      hover:border-[#ffffff28] hover:text-white transition-all duration-200 cursor-default"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Developer Console / Code Block ── */}
        <div
          ref={termRef}
          className="border border-[#ffffff10] rounded-2xl overflow-hidden bg-[#0b1120]"
          style={{
            opacity: termInView ? 1 : 0,
            transform: termInView ? "translateY(0px)" : "translateY(40px)",
            transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
          }}
        >
          {/* Terminal top bar */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#ffffff0a] bg-[#0d1526]">
            <span className="w-3 h-3 rounded-full bg-[#EF4444] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#F59E0B] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#22C55E] inline-block" />
            <span className="text-[#4B5563] text-[12px] ml-3 font-mono">
              Developer Console — API Preview
            </span>
          </div>

          {/* Code */}
          <div className="px-6 py-6 font-mono text-[13px] leading-[1.9] overflow-x-auto">
            {/* Comment */}
            <p>
              <span className="text-[#FFFFFF3D]">
                {`// POST /v1/content/submit — Submit content for governed review`}
              </span>
            </p>

            {/* Request line */}
            <p>
              <span className="text-[#FFFFFF80]">{"{ "}</span>
              <span className="text-[#20E7F2]">&quot;workspace_id&quot;</span>
              <span className="text-[#E2E8F0]">{": "}</span>
              <span className="text-[#C9A84C]">&quot;ws_uk_brand_01&quot;</span>
              <span className="text-[#E2E8F0]">{", "}</span>
              <span className="text-[#20E7F2]">&quot;content_type&quot;</span>
              <span className="text-[#E2E8F0]">{": "}</span>
              <span className="text-[#C9A84C]">&quot;social_post&quot;</span>
              <span className="text-[#E2E8F0]">{", "}</span>
              <span className="text-[#20E7F2]">&quot;channel&quot;</span>
              <span className="text-[#E2E8F0]">{": "}</span>
              <span className="text-[#C9A84C]">&quot;linkedin&quot;</span>
              <span className="text-[#E2E8F0]">{", "}</span>
              <span className="text-[#20E7F2]">&quot;brand_library_check&quot;</span>
              <span className="text-[#E2E8F0]">{": "}</span>
              <span className="text-[#22C55E]">true</span>
              <span className="text-[#E2E8F0]">{", "}</span>
              <span className="text-[#20E7F2]">&quot;policy_version&quot;</span>
              <span className="text-[#E2E8F0]">{": "}</span>
              <span className="text-[#C9A84C]">&quot;v2.4&quot;</span>
              <span className="text-[#FFFFFF80]">{" }"}</span>
            </p>

            {/* Response comment */}
            <p>
              <span className="text-[#FFFFFF3D]">{`// → Response`}</span>
            </p>

            {/* Response line */}
            <p>
              <span className="text-[#FFFFFF80]">{"{ "}</span>
              <span className="text-[#20E7F2]">&quot;status&quot;</span>
              <span className="text-[#E2E8F0]">{": "}</span>
              <span className="text-[#C9A84C]">&quot;QUEUED_FOR_REVIEW&quot;</span>
              <span className="text-[#E2E8F0]">{", "}</span>
              <span className="text-[#20E7F2]">&quot;evidence_id&quot;</span>
              <span className="text-[#E2E8F0]">{": "}</span>
              <span className="text-[#C9A84C]">&quot;AE-0042&quot;</span>
              <span className="text-[#E2E8F0]">{", "}</span>
              <span className="text-[#20E7F2]">&quot;policy_ref&quot;</span>
              <span className="text-[#E2E8F0]">{": "}</span>
              <span className="text-[#C9A84C]">&quot;POL-2.4&quot;</span>
              <span className="text-[#FFFFFF80]">{" }"}</span>
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}