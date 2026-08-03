"use client";

import React from "react";
import { motion } from "framer-motion";

export default function MarketingInfrastructureCTA() {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.15,
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
        ease: "easeOut",
      },
    },
  } as const;

  return (
    <section className="w-full bg-gradient-to-b from-[#050B14] to-[#101E36] text-white py-28 px-6 sm:px-12 md:px-16 lg:px-24 flex flex-col items-center justify-center font-sans antialiased">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto w-full text-center flex flex-col items-center"
      >
        {/* Main Heading */}
        <motion.h2
          variants={itemVariants}
          className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-6 leading-[1.15] max-w-3xl"
        >
          Marketing should operate as measurable infrastructure.
        </motion.h2>

        {/* Subtitle Paragraph */}
        <motion.p
          variants={itemVariants}
          className="text-[#8899A6] text-sm sm:text-base md:text-lg font-normal max-w-xl mb-10 leading-relaxed"
        >
          If ZoikoVertex improves efficiency by even 15%, it pays for itself
          many times over. Talk to a specialist and see the routing in action.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
        >
          {/* Primary CTA Button */}
          <a
            href="#"
            className="w-full sm:w-auto px-6 py-3.5 bg-[#20E7F2] hover:bg-[#1FD0DE] text-white font-mono text-xs tracking-wider uppercase font-semibold rounded-[10px] transition-colors duration-200 flex items-center justify-center gap-2"
          >
            Book an Enterprise Demo &rarr;
          </a>

          {/* Secondary CTA Button */}
          <a
            href="#"
            className="w-full sm:w-auto px-6 py-3.5 border border-[#1E2D42] hover:border-[#334766] bg-[#07111E]/60 text-white font-mono text-xs tracking-wider uppercase font-medium rounded-[10px] transition-colors duration-200 flex items-center justify-center"
          >
            View ROI & Governance
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
