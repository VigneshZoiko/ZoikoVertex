"use client";

import React from "react";
import { motion } from "framer-motion";
import { AtSign, Scale, Globe, FileCheck } from "lucide-react";

export default function BrandComplianceFeaturesStrip() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  } as const;

  const features = [
    {
      icon: AtSign,
      iconColor: "text-[#00E5FF]",
      iconBg: "bg-[#00E5FF]/10 border-[#00E5FF]/20",
      title: "Brand voice enforcement",
      description:
        "Tone-of-voice, vocabulary, and messaging guidelines checked against every AI-generated content asset before approval routing.",
    },
    {
      icon: Scale,
      iconColor: "text-[#FF5252]",
      iconBg: "bg-[#FF5252]/10 border-[#FF5252]/20",
      title: "Claims & offer compliance",
      description:
        "Pricing claims, performance assertions, regulated terms, and prohibited language detected and routed to compliance reviewers automatically.",
    },
    {
      icon: Globe,
      iconColor: "text-[#00E5FF]",
      iconBg: "bg-[#00E5FF]/10 border-[#00E5FF]/20",
      title: "Regional rule scoping",
      description:
        "Brand and compliance rules scoped per region, channel, language, product category, and jurisdiction — global standards, local execution.",
    },
    {
      icon: FileCheck,
      iconColor: "text-[#00E676]",
      iconBg: "bg-[#00E676]/10 border-[#00E676]/20",
      title: "Full evidence per asset",
      description:
        "Every policy check result, approval decision, and brand review stored in the Evidence Vault — ready for legal review or dispute resolution.",
    },
  ];

  return (
    <section className="w-full bg-[#080C10] text-white overflow-hidden">
      <motion.div
        className="w-full border-y border-white/10 bg-[#0C1422]"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10">
          {features.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-[#0C1422] p-8 sm:p-10 flex flex-col justify-start gap-4 transition-colors hover:bg-[#0F1A2E]"
              >
                {/* Custom Icon Box */}
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.iconBg}`}
                >
                  <IconComponent className={`w-5 h-5 ${item.iconColor}`} />
                </div>

                {/* Card Title */}
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                  {item.title}
                </h3>

                {/* Card Description */}
                <p className="text-xs sm:text-[13px] text-gray-400 leading-relaxed font-normal">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
