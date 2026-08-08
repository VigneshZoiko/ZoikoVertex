"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface CapabilitiesRow {
  layer: string;
  capability: string;
}

const capabilities: CapabilitiesRow[] = [
  {
    layer: "APIs & Webhooks",
    capability:
      "RESTful APIs, webhooks, event streams, and documented integration endpoints for workflow, approval, and audit events",
  },
  {
    layer: "Identity & SSO",
    capability:
      "SSO/SAML, SCIM, Okta, Azure AD, Google Workspace — enterprise identity binding built into every deployment",
  },
  {
    layer: "Audit events",
    capability:
      "Structured audit event export for Audit Trail, Identity Ledger, and Evidence Vault — supporting SIEM and compliance tooling",
  },
  {
    layer: "Evidence Links",
    capability:
      "Programmatic access to Evidence Vault records, Decision Ledger entries, and forensic case references via API",
  },
  {
    layer: "Data processing",
    capability:
      "DPA-aligned controls, tenant isolation, regional routing, and export restrictions for data-sensitive deployments",
  },
  {
    layer: "Partner sandbox",
    capability:
      "Dedicated test environment for integration validation, demo preparation, and certification completion",
  },
  {
    layer: "Security review",
    capability:
      "Security posture review, penetration testing alignment, and DPA execution required before partner activation",
  },
];

export default function TechnicalReadiness() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  } as const;

  return (
    <section className="w-full bg-[#050B14] text-white font-sans antialiased overflow-hidden">
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        {/* Left Column: Full height Background Image */}
        <div className="relative lg:col-span-6 min-h-[400px] lg:min-h-full w-full">
          <Image
            src="/images/partnerships/graph.png"
            alt="Technical Integration Surface"
            fill
            priority
            className="object-cover object-center grayscale opacity-80"
          />
          {/* Subtle gradient overlay to blend into dark right panel on mobile */}
          {/* <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-transparent via-transparent to-[#050B14]" /> */}
        </div>

        {/* Right Column: Content & Capabilities Table */}
        <div className="lg:col-span-6 p-8 sm:p-12 md:p-16 lg:p-20 flex flex-col justify-center bg-[#050B14]">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            {/* Subtitle Accent Line & Text */}
            <div className="flex items-center gap-3 mb-4">
              <span className="w-6 h-[2px] bg-[#2DD4BF]" />
              <span className="text-[#2DD4BF] text-xs tracking-[0.2em] font-medium uppercase font-mono">
                INTEGRATION & TECHNICAL READINESS
              </span>
            </div>

            {/* Main Title */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-6 leading-[1.12]">
              A complete technical surface for integration partners and CTOs.
            </h2>

            {/* Subtitle Description */}
            <p className="text-[#94A3B8] text-sm sm:text-base font-normal leading-relaxed max-w-xl">
              Integration partners receive technical documentation, sandbox
              access, and solutions architecture support to connect ZoikoVertex
              into enterprise stacks.
            </p>
          </motion.div>

          {/* Capabilities Grid Table */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full border-t border-[#1E293B]"
          >
            {/* Table Header */}
            <div className="grid grid-cols-12 py-3 border-b border-[#1E293B] text-[11px] font-mono tracking-widest uppercase font-semibold text-[#64748B]">
              <div className="col-span-4 pr-4">LAYER</div>
              <div className="col-span-8">CAPABILITY</div>
            </div>

            {/* Table Rows */}
            {capabilities.map((row, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="grid grid-cols-12 py-4 border-b border-[#1E293B] items-start transition-colors hover:bg-[#0A111E]/60"
              >
                {/* Layer Name Column */}
                <div className="col-span-4 pr-4 text-xs font-mono font-medium text-[#00E5FF] leading-relaxed">
                  {row.layer}
                </div>

                {/* Capability Detail Column */}
                <div className="col-span-8 text-xs sm:text-sm text-[#94A3B8] font-normal leading-relaxed">
                  {row.capability}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
