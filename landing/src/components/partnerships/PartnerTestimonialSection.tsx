"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

export default function PartnerTestimonialSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  } as const;

  const stats = [
    {
      value: "5-step",
      label: "PARTNER REVIEW",
    },
    {
      value: "5 biz days",
      label: "FIRST RESPONSE",
    },
    {
      value: "Selective",
      label: "ADMISSION",
    },
  ];

  return (
    <section className="w-full bg-[#050B14] text-white font-sans antialiased overflow-hidden">
      <div className="w-full min-h-[640px] grid grid-cols-1 lg:grid-cols-2">
        {/* Left Column: Dark Background with Overlay Text & Quote */}
        <div className="relative flex flex-col justify-between p-8 sm:p-12 md:p-16 lg:p-20 border-b lg:border-b-0 lg:border-r border-[#1E293B]">
          {/* Background Image for Left Side */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/partnerships/corr.png"
              alt="Office Corridor Background"
              fill
              priority
              className="object-cover object-center"
            />
            {/* Dark gradient overlay for extreme contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#050B14]/95 via-[#050B14]/90 to-[#050B14]/75" />
          </div>

          {/* Foreground Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-10 my-10 max-w-xl"
          >
            {/* Cyan Quote Mark Icon */}
            <motion.div variants={itemVariants} className="mb-6">
              <Quote className="w-8 h-8 text-[#00E5FF] fill-[#00E5FF]/20" />
            </motion.div>

            {/* Testimonial Statement */}
            <motion.blockquote
              variants={itemVariants}
              className="text-xl sm:text-2xl md:text-3xl font-medium tracking-tight text-white leading-snug mb-10"
            >
              &quot;ZoikoVertex is not a tool we resell. It is the governance
              architecture we build our enterprise AI practice around. The
              evidence layer, the approval workflows, and the auditability
              posture give our clients something they cannot find anywhere else
              in the market.&quot;
            </motion.blockquote>

            {/* Attribution Box */}
            <motion.div
              variants={itemVariants}
              className="bg-[#0A111E]/80 backdrop-blur-md border border-[#1E293B] rounded-lg p-5 inline-block"
            >
              <p className="text-white text-sm font-semibold mb-1.5">
                [Head of AI Practice]
              </p>
              <p className="text-[#00E5FF] text-[11px] font-mono tracking-wider uppercase font-medium">
                ENTERPRISE IMPLEMENTATION PARTNER &ndash; PROFILE PENDING
                APPROVAL
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Column: Person Image with Bottom Overlay Stats */}
        <div className="relative min-h-[500px] lg:min-h-[900px] flex flex-col justify-end">
          {/* Background Image for Right Side */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/partnerships/girl.png"
              alt="Partner Executive"
              fill
              priority
              className="object-cover object-center grayscale contrast-105"
            />
            {/* Subtle gradient overlay at the bottom for the stats bar */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-[#050B14]/40 to-transparent" />
          </div>

          {/* Bottom Stats Bar Overlay */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative z-10 w-full bg-[#050B14]/90 backdrop-blur-md border-t border-[#1E293B] px-8 py-6"
          >
            <div className="grid grid-cols-3 gap-4 max-w-lg">
              {stats.map((stat, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="text-base sm:text-lg font-bold text-[#00E5FF] font-sans">
                    {stat.value}
                  </span>
                  <span className="text-[#64748B] text-[10px] font-mono tracking-widest uppercase mt-0.5">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
