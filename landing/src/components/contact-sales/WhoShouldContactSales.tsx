"use client"
import React from "react";
import { motion } from "framer-motion";

// Place this data array at the top of your file
const targetAudienceData = [
  {
    number: "01",
    title: "Executive &\nOperations",
    description:
      "CMOs, CFOs, and VPs of Marketing Operations evaluating governed execution and board-level ROI reporting.",
  },
  {
    number: "02",
    title: "Governance &\nSecurity",
    description:
      "Legal, procurement, and security teams reviewing DPA terms, audit trails, and compliance posture before sign-off.",
  },
  {
    number: "03",
    title: "Product &\nTransformation",
    description:
      "AI transformation leads and product owners scoping agentic workflow fit, integrations, and rollout sequencing.",
  },
];

{
  /* SECTION: WHO SHOULD CONTACT SALES */
}
export default function WhoShouldContactSales() {
  return (
    <section className="w-full bg-[#f5f3ec] text-[#0F172A] py-16 px-6 sm:px-10">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.4 }}
        className="max-w-6xl mx-auto space-y-10"
      >
        {/* Section Header */}
        <div className="space-y-3">
          <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#00D2B4] uppercase flex items-center gap-2">
            <span className="w-4 h-[1px] bg-[#00D2B4]" />
            WHO SHOULD CONTACT SALES
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0F172A] max-w-xl leading-tight max-w-2xl">
            Built for the people who own the outcome.
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed max-w-110">
            If you're accountable for marketing spend, governance, or the
            systems that touch either, this is your front door.
          </p>
        </div>

        {/* 3-Column Grid with shadow-sm surface cards */}
        <div className="grid grid-cols-1 md:grid-cols-3">
          {targetAudienceData.map((item, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 backdrop-blur-sm shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-xs font-bold text-[#00D2B4] block mb-3">
                  {item.number}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight leading-snug whitespace-pre-line mb-3">
                  {item.title}
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
