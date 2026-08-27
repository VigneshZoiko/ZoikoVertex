"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function MarketingStackIntegrationsSection() {
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
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  } as const;

  const integrations = [
    {
      category: "CRM & CDP",
      platforms: "Salesforce, HubSpot, Braze, Segment, Klaviyo",
      type: "Native",
    },
    {
      category: "DAM & PIM",
      platforms: "Bynder, AEM Assets, Salsify, Akeneo, Acquia",
      type: "Native",
    },
    {
      category: "Social & Paid",
      platforms: "Meta, TikTok, Google Ads, LinkedIn, Pinterest",
      type: "Native",
    },
    {
      category: "Analytics & BI",
      platforms: "GA4, Looker, Power BI, Tableau, Snowflake",
      type: "Connector",
    },
    {
      category: "Collaboration",
      platforms: "Slack, Teams, Asana, Jira, Monday, Notion",
      type: "Native",
    },
    {
      category: "Identity & SSO",
      platforms: "Okta, Azure AD, Google Workspace, SCIM/SAML",
      type: "Native",
    },
    {
      category: "Commerce",
      platforms: "Shopify Plus, Salesforce Commerce, Adobe Commerce",
      type: "Connector",
    },
  ];

  return (
    <section className="relative w-full bg-[#080C10] text-white overflow-hidden">
      <motion.div
        className="w-full grid grid-cols-1 lg:grid-cols-2 min-h-0"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Left Column - Image Container */}
        <div className="relative w-full min-h-[400px] lg:min-h-full overflow-hidden">
          <Image
            src="/images/marketing-ops/code.png"
            alt="Development laptop displaying source code"
            fill
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </div>

        {/* Right Column - Integrations Container with Background #111D2E */}
        <div className="bg-[#111D2E] flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 lg:py-16 w-full">
          {/* Section Badge Header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-3"
          >
            <span className="w-3 h-[2px] bg-[#00E5FF]" />
            <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-[#00E5FF]">
              MARKETING STACK INTEGRATIONS
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={itemVariants}
            className="text-2xl sm:text-3xl max-w-120 lg:text-[34px] font-bold tracking-tight leading-[1.12] mb-4 text-white"
          >
            ZoikoVertex sits above your existing MarTech — not instead of it.
          </motion.h2>

          {/* Subparagraph */}
          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-[13px] max-w-90 text-gray-400 leading-relaxed font-normal mb-8"
          >
            The governed orchestration and evidence layer that connects
            workflows, approvals, and evidence across the tools marketing
            operations teams already use.
          </motion.p>

          {/* Integrations Table */}
          <motion.div variants={itemVariants} className="w-full mb-8">
            {/* Table Header */}
            <div className="grid grid-cols-12 pb-2.5 border-b border-white/10 text-[10px] font-mono tracking-widest text-gray-500 uppercase">
              <span className="col-span-3">CATEGORY</span>
              <span className="col-span-6">PLATFORMS SUPPORTED</span>
              <span className="col-span-3 text-right">INTEGRATION TYPE</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-white/5">
              {integrations.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 py-3 items-center text-xs transition-colors hover:bg-white/[0.02]"
                >
                  {/* Category */}
                  <span className="col-span-3 font-mono text-[#00E5FF] text-[11px] font-medium">
                    {item.category}
                  </span>

                  {/* Platforms */}
                  <span className="col-span-6 text-gray-300 text-[11px] leading-snug pr-2">
                    {item.platforms}
                  </span>

                  {/* Badge */}
                  <div className="col-span-3 flex justify-end">
                    {item.type === "Native" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono border border-[#22C55E] text-[#22C55E] bg-[#22C55E1A]">
                        Native
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono border border-[#20E7F2] text-[#20E7F2] bg-[#20E7F20F]">
                        Connector
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bottom Monospace Disclaimer Text */}
          <motion.p
            variants={itemVariants}
            className="text-[10px] font-mono text-gray-500 leading-relaxed max-w-lg"
          >
            ZoikoVertex does not replace your MarTech stack. It provides the
            governed orchestration and evidence layer that connects workflows,
            approvals, and outcomes across the tools you already operate.
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}
