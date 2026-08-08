"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function AgencyWorkflowPlatformSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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
        ease: [0.22, 1, 0.36, 1],
      },
    },
  } as const;

  return (
    <section className="relative w-full bg-[#0C1422] text-white py-20 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Header Section */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-3 h-[2px] bg-[#20E7F2]" />
            <span className="text-[11px] tracking-widest uppercase font-mono text-[#20E7F2]">
              AGENCY WORKFLOW PLATFORM
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15] text-white"
          >
            The governed agency execution layer — from brief to approved
            delivery.
          </motion.h2>
        </div>

        {/* Bento Grid Container */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10"
        >
          {/* Card 1: BRIEF INTAKE & SCOPING (Tall Left Card) */}
          <div className="relative group lg:col-span-4 min-h-[520px] bg-[#0C1422] flex flex-col justify-end p-6 sm:p-8">
            <img
              src="/images/agency-workflows/Brief-Intake-Scoping.png"
              alt="Brief intake and scoping"
              className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C1422] via-[#0C1422]/80 to-transparent" />

            <div className="relative z-10">
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#C5A059] block mb-3">
                BRIEF INTAKE &amp; SCOPING
              </span>
              <h3 className="text-xl sm:text-2xl font-bold leading-tight mb-3 text-white">
                Structured campaign briefs with client-specific brand and
                compliance rules pre-loaded.
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-6 font-normal">
                Every campaign starts with a structured brief that inherits the
                client&apos;s brand voice, compliance rules, approval chain, and
                evidence requirements — eliminating the misalignment that causes
                revision cycles.
              </p>
              <a
                href="/approval-workflows"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#C5A059] hover:underline"
              >
                <span>Explore Brief Intake</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Area Grid Container */}
          <div className="lg:col-span-8 flex flex-col gap-px bg-[#0C1422]">
            {/* Top Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px flex-1">
              {/* Card 2: AI CONTENT GENERATION (2 Cols) */}
              <div className="relative group sm:col-span-2 min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <img
                  src="/images/agency-workflows/AI-Content-Generation.png"
                  alt="AI content generation"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />

                <div className="relative z-10 max-w-xl">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#20E7F2] block mb-2">
                    AI CONTENT GENERATION
                  </span>
                  <h3 className="text-base sm:text-lg font-bold leading-snug text-white">
                    AI-assisted copy, variants, and localizations — checked
                    against client brand rules before review.
                  </h3>
                </div>
              </div>

              {/* Card 3: CLIENT APPROVAL FLOWS */}
              <div className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <img
                  src="/images/agency-workflows/Client-Approval-Flows.png"
                  alt="Client approval flows"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#20E7F2] block mb-2">
                    CLIENT APPROVAL FLOWS
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Clients review and approve directly in the governed
                    workflow.
                  </h3>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px flex-1">
              {/* Card 4: REVISION TRACKING */}
              <div className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <img
                  src="/images/agency-workflows/Revision-Tracking.png"
                  alt="Revision tracking"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#20E7F2] block mb-2">
                    REVISION TRACKING
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Version history, change log, and decision record per
                    deliverable.
                  </h3>
                </div>
              </div>

              {/* Card 5: MULTI-CLIENT WORKSPACES */}
              <div className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <img
                  src="/images/agency-workflows/Multi-Client-Workspaces.png"
                  alt="Multi-client workspaces"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#20E7F2] block mb-2">
                    MULTI-CLIENT WORKSPACES
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    Client data, rules, and evidence fully isolated per
                    workspace.
                  </h3>
                </div>
              </div>

              {/* Card 6: IP & CONTENT EVIDENCE */}
              <div className="relative group min-h-[250px] bg-[#0C1422] flex flex-col justify-end p-6">
                <img
                  src="/images/agency-workflows/IP-Content-Evidence.png"
                  alt="IP and content evidence"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500"
                />

                <div className="relative z-10">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#20E7F2] block mb-2">
                    IP &amp; CONTENT EVIDENCE
                  </span>
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-white">
                    AI generation events, human edits, and approvals sealed per
                    deliverable.
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
