"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function RoiBannerCallout() {
  return (
    <section className="w-full bg-[#F6F5EE] py-16 px-4 sm:px-8 md:px-12 lg:px-24 font-sans text-[#111827] flex flex-col items-center justify-center">
      <motion.div
        className="max-w-6xl w-full mx-auto bg-[#090D16] rounded-none p-8 sm:p-12 md:p-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Text Group */}
        <div className="flex flex-col gap-3 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
            Estimate your ROI before the first call.
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed font-normal">
            Faster approvals, lower rework, and governed AI throughput &mdash;
            modeled against your numbers.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex-shrink-0 w-full md:w-auto">
          <motion.a
            href="#roi-engine"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-2 bg-[#17EAD9] hover:bg-[#12D4C4] text-[#090D16] font-mono text-xs sm:text-sm font-semibold tracking-wider uppercase px-6 py-4 transition-colors duration-200 w-full sm:w-auto"
          >
            <span>Open ROI Engine</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </motion.a>
        </div>
      </motion.div>
    </section>
  );
}
