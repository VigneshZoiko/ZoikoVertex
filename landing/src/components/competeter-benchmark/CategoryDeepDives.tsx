"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface DeepDiveCard {
  id: string;
  category: string;
  marketSize: string;
  title: string;
  description?: string;
  badge?: string;
  ctaText?: string;
  ctaHref?: string;
  imageSrc: string;
  featured?: boolean;
}

const deepDiveCards: DeepDiveCard[] = [
  {
    id: "ai-copilots",
    category: "AI COPILOT TOOLS",
    marketSize: "$4.1B",
    badge: "Most searched comparison",
    title: "Generation is not execution. Assistance is not governance.",
    description:
      "AI copilots produce drafts, summaries, and suggestions. They do not route work through approval chains, enforce policy rules against brand or legal requirements, seal evidence records, or connect outputs to ROI measurement. For teams that need AI to execute with accountability—not just assist—copilots leave a governance gap at exactly the point where enterprise risk begins. When AI moves from assistance to execution, governance must move from a policy document into the operating layer.",
    ctaText: "Explore Agentic Architecture",
    ctaHref: "#agentic-architecture",
    imageSrc: "/images/competeter-benchmark/ai.png",
    featured: true,
  },
  {
    id: "workflow-automation",
    category: "WORKFLOW AUTOMATION",
    marketSize: "$13.2B",
    title:
      "Rules and triggers lack evidence-led governance and executive oversight.",
    imageSrc: "/images/competeter-benchmark/auto.png",
  },
  {
    id: "bi-analytics",
    category: "BI & ANALYTICS",
    marketSize: "$29.4B",
    title: "Dashboards observe outcomes. They do not govern execution.",
    imageSrc: "/images/competeter-benchmark/bi.png",
  },
  {
    id: "project-work-tools",
    category: "PROJECT & WORK TOOLS",
    marketSize: "$6.8B",
    title: "Task tracking is not agentic execution governance.",
    imageSrc: "/images/competeter-benchmark/tools.png",
  },
  {
    id: "marketing-automation",
    category: "MARKETING AUTOMATION",
    marketSize: "$6.4B",
    title: "Campaign journeys are not governed agentic content execution.",
    imageSrc: "/images/competeter-benchmark/mark.png",
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

export default function CategoryDeepDives() {
  const featuredCard = deepDiveCards.find((card) => card.featured);
  const gridCards = deepDiveCards.filter((card) => !card.featured);

  return (
    <section className="w-full bg-[#090D16] py-20 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-white">
      <motion.div
        className="max-w-7xl w-full mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Section Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-[1.5px] bg-[#00D2B4]" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.25em] uppercase text-[#00D2B4]">
              CATEGORY DEEP-DIVES
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 max-w-2xl">
            Why the governance gap matters for enterprise buyers.
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] max-w-xl leading-relaxed">
            Each category solves a real enterprise problem. None were designed
            to govern AI-assisted execution at enterprise scale. Here is why
            that matters.
          </p>
        </div>

        {/* Main Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl p-2 backdrop-blur-md">
          {/* Featured Large Card (Left) */}
          {featuredCard && (
            <motion.div
              variants={itemVariants}
              className="lg:col-span-4 relative group overflow-hidden border border-slate-800/90 bg-[#101726] min-h-[520px] flex flex-col justify-between p-6 sm:p-8"
            >
              {/* Background Image with Dark Gradient Layer */}
              <div className="absolute inset-0 z-0">
                <Image
                  src={featuredCard.imageSrc}
                  alt={featuredCard.category}
                  fill
                  priority
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/80 to-[#090D16]/40" />
              </div>

              {/* Card Header Tag & Badge */}
              <div className="relative z-10 flex items-start justify-between gap-4 mb-8">
                <div>
                  <span className="font-mono text-[11px] font-bold tracking-wider text-[#00D2B4] uppercase">
                    {featuredCard.category}
                  </span>
                  <span className="font-mono text-[11px] text-[#64748B] ml-2">
                    • {featuredCard.marketSize}
                  </span>
                </div>
                {featuredCard.badge && (
                  <span className="font-mono text-[9px] text-[#64748B] uppercase tracking-wider text-right max-w-[100px] leading-tight">
                    {featuredCard.badge}
                  </span>
                )}
              </div>

              {/* Card Main Body Content */}
              <div className="relative z-10 mt-auto">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug mb-4">
                  {featuredCard.title}
                </h3>
                {featuredCard.description && (
                  <p className="text-xs text-[#94A3B8] leading-relaxed mb-6 font-normal">
                    {featuredCard.description}
                  </p>
                )}

                {/* CTA Link */}
                {featuredCard.ctaText && (
                  <a
                    href={featuredCard.ctaHref || "#"}
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#00D2B4] hover:text-[#26E6CC] transition-colors duration-150"
                  >
                    <span>{featuredCard.ctaText}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            </motion.div>
          )}

          {/* Right 2x2 Grid Section */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2">
            {gridCards.map((card) => (
              <motion.div
                key={card.id}
                variants={itemVariants}
                className="relative group overflow-hidden border border-slate-800/90 bg-[#101726] min-h-[250px] flex flex-col justify-between p-5 sm:p-6"
              >
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                  <Image
                    src={card.imageSrc}
                    alt={card.category}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/85 to-[#090D16]/50" />
                </div>

                {/* Card Top Header */}
                <div className="relative z-10 mb-6">
                  <span className="font-mono text-[10px] font-bold tracking-wider text-[#00D2B4] uppercase">
                    {card.category}
                  </span>
                  <span className="font-mono text-[10px] text-[#64748B] ml-2">
                    • {card.marketSize}
                  </span>
                </div>

                {/* Card Title */}
                <div className="relative z-10 mt-auto">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                    {card.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
