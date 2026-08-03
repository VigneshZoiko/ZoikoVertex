"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function DidntFindAnswerCallout() {
  return (
    <section className="w-full bg-gradient-to-b from-[#050B14] to-[#101E36] py-24 px-4 sm:px-8 md:px-12 lg:px-24 font-sans text-white flex flex-col items-center justify-center text-center">
      <motion.div
        className="max-w-3xl w-full mx-auto flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Title */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl max-w-120 font-bold tracking-tight text-white leading-tight">
          Didn&apos;t find your answer?
        </h2>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-[17px] text-[#B9C2D0] leading-relaxed max-w-xl font-normal">
          Talk to a specialist directly &mdash; no queue, routed to the right
          team automatically.
        </p>

        {/* Primary Action Button */}
        <div className="mt-2">
          <motion.a
            href="#book-a-demo"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-2 bg-[#17EAD9] hover:bg-[#12D4C4] text-[#090D16] font-mono text-xs sm:text-sm font-semibold tracking-wider uppercase px-7 py-4 transition-colors duration-200"
          >
            <span>Book a Demo</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </motion.a>
        </div>
      </motion.div>
    </section>
  );
}
