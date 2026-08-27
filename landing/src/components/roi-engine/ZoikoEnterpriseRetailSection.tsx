"use client";

import React from "react";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { ArrowRight, Store, ShieldCheck, BarChart3 } from "lucide-react";

interface FeatureCard {
  title: string;
  description: string;
  icon: React.ElementType;
}

const features: FeatureCard[] = [
  {
    title: "Campaign launch coordination",
    description:
      "Multi-location approval routing and localized content review reduced from 14 days to under 6 days on average.",
    icon: Store,
  },
  {
    title: "Brand compliance at scale",
    description:
      "Policy gates prevent off-brand promotional claims and unreviewed seasonal offers before they reach customers.",
    icon: ShieldCheck,
  },
  {
    title: "Executive ROI visibility",
    description:
      "Regional performance, workflow bottlenecks, and evidence readiness visible from one executive command layer.",
    icon: BarChart3,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function ZoikoEnterpriseRetailSection() {
  return (
    <section className="relative w-full bg-[#0b121e] text-white font-sans overflow-hidden border-t border-white/5">
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Column: Flush to Edge Image (No padding on left) */}
        <div className="lg:col-span-6 relative w-full h-80 sm:h-96 lg:h-full overflow-hidden">
          <Image
            src="/images/roi-engine/clothes.png" // Replace with your retail store asset path e.g., /images/retail-store.jpg
            alt="Enterprise Retail Store Environment"
            fill
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* Right Column: Content Area */}
        <div className="lg:col-span-6 flex items-center py-12 lg:py-20 px-6 sm:px-12 lg:px-16 xl:px-20">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="max-w-xl space-y-8"
          >
            {/* Header Area */}
            <div className="space-y-3">
              <motion.div
                variants={itemVariants}
                className="flex items-center gap-2"
              >
                <span className="h-px w-6 bg-[#20E7F2]" />
                <span className="text-xs font-mono tracking-widest text-[#20E7F2] uppercase">
                  ENTERPRISE RETAIL SCENARIO
                </span>
              </motion.div>

              <motion.h2
                variants={itemVariants}
                className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-white leading-[1.15]"
              >
                250 stores. 6 regions. 12 monthly campaign waves.
              </motion.h2>

              <motion.p
                variants={itemVariants}
                className="text-xs sm:text-sm leading-relaxed text-[#ffffff70]"
              >
                What ZoikoVertex ROI looks like at enterprise retail scale —
                across campaign coordination, brand compliance, social
                operations, and executive visibility.
              </motion.p>
            </div>

            {/* Feature Cards List */}
            <motion.div variants={itemVariants} className="space-y-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="p-4 sm:p-5 rounded-xl bg-[#0f1723]/90 border border-white/10 flex items-start gap-4 hover:border-white/20 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#20E7F2]/10 border border-[#20E7F2]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#20E7F2]" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-[#ffffff70]">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* CTA Button */}
            <motion.div variants={itemVariants} className="pt-2">
              <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#20E7F2] text-[#0b121e] font-semibold text-sm hover:bg-[#1cd4de] transition-colors shadow-lg shadow-[#20E7F2]/20">
                <ArrowRight className="w-4 h-4" />
                See Enterprise Retail
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
