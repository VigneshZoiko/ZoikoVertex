"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface MotionCardProps {
  number: string;
  badge: string;
  title: string;
  description: string;
  tags: string[];
  imageSrc: string;
  imageAlt: string;
}

const motionsData: MotionCardProps[] = [
  {
    number: "01",
    badge: "IMPLEMENTATION PARTNER",
    title: "Deploy, govern, and scale ZoikoVertex for enterprise customers.",
    description:
      "SIs, consultancies, and transformation firms who deploy ZoikoVertex across workflow design, governance config, approval setup, integration, change management, and adoption. Highest-value motion for enterprise delivery organizations.",
    tags: [
      "Enterprise delivery",
      "Security maturity",
      "Workflow consulting",
      "Customer success process",
    ],
    imageSrc: "/images/partnerships/1.png",
    imageAlt: "Implementation Partner Office Space",
  },
  {
    number: "02",
    badge: "TECHNOLOGY PARTNER",
    title:
      "Integrate your platform into ZoikoVertex or connect ZoikoVertex to your stack.",
    description:
      "SaaS vendors, AI tooling companies, and data platforms with API-first integration capability and shared enterprise customers.",
    tags: ["API maturity", "Security posture", "Shared customers"],
    imageSrc: "/images/partnerships/2.png",
    imageAlt: "Technology Partners Collaborating",
  },
  {
    number: "03",
    badge: "INTEGRATION PARTNER",
    title: "Expand the platform integration surface across enterprise stacks.",
    description:
      "CRM, ERP, DAM, CDP, social, advertising, and workflow systems that reduce customer implementation friction by connecting ZoikoVertex to established enterprise tools.",
    tags: ["Documented API", "Webhook support", "Sandbox available"],
    imageSrc: "/images/partnerships/3.png",
    imageAlt: "Integration Code Interface",
  },
  {
    number: "04",
    badge: "AGENCY PARTNER",
    title:
      "Deliver governed, faster, evidenced campaign execution for enterprise clients.",
    description:
      "Enterprise marketing, social, creative, and brand governance agencies using ZoikoVertex to deliver approval-disciplined, measurable execution for enterprise clients.",
    tags: ["Enterprise client base", "Governance-ready", "Approval operations"],
    imageSrc: "/images/partnerships/4.png",
    imageAlt: "Agency Meeting",
  },
  {
    number: "05",
    badge: "REFERRAL & CO-SELL",
    title:
      "Introduce qualified enterprise accounts and support commercial expansion.",
    description:
      "Consultants, advisors, and ecosystem vendors with enterprise access — deal registration, approved messaging, and commercial terms defined in the partner agreement.",
    tags: [
      "Enterprise relationships",
      "Vertical knowledge",
      "Clear commercial conduct",
    ],
    imageSrc: "/images/partnerships/5.png",
    imageAlt: "Referral Partner Executive",
  },
];

export default function PartnershipMotions() {
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
        duration: 0.5,
        ease: "easeOut",
      },
    },
  } as const;

  return (
    <section className="w-full bg-[#0C1422] text-white py-24 px-6 sm:px-12 md:px-16 lg:px-24 font-sans antialiased">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          {/* Subtitle Accent Line & Text */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-[#2DD4BF]" />
            <span className="text-[#2DD4BF] text-xs tracking-[0.2em] font-medium uppercase font-mono">
              PARTNERSHIP MOTIONS
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
            Five motions. Defined value. Clear commercial terms.
          </h2>

          {/* Subtitle Description */}
          <p className="text-[#FFFFFF85] text-base sm:text-lg max-w-3xl mx-auto font-normal leading-relaxed">
            Each motion has a fit profile, expected contribution, and commercial
            structure. Choose the motion that matches how you deliver value for
            enterprise customers.
          </p>
        </motion.div>

        {/* Cards Wrapper */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col"
        >
          {/* Motion 01: Full Width Featured Card */}
          <motion.div
            variants={itemVariants}
            className="bg-[#0A111E] border border-[#1E293B] rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 group"
          >
            {/* Image Column */}
            <div className="relative lg:col-span-5 min-h-[260px] lg:min-h-full overflow-hidden">
              <Image
                src={motionsData[0].imageSrc}
                alt={motionsData[0].imageAlt}
                fill
                className="object-cover object-center grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-transparent via-transparent to-[#0A111E]/80 lg:to-[#0A111E]" />
            </div>

            {/* Content Column */}
            <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
              <div>
                <span className="text-3xl font-mono font-bold text-[#1E293B] group-hover:text-[#2DD4BF]/40 transition-colors block mb-2">
                  {motionsData[0].number}
                </span>

                <span className="inline-block px-3 py-1 bg-[#083344] border border-[#0891B2]/40 rounded text-[#00E5FF] text-[11px] font-mono tracking-wider font-semibold uppercase mb-4">
                  {motionsData[0].badge}
                </span>

                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 leading-snug">
                  {motionsData[0].title}
                </h3>

                <p className="text-[#94A3B8] text-sm leading-relaxed mb-2 font-normal">
                  {motionsData[0].description}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {motionsData[0].tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full bg-[#111C2E] border border-[#1E293B] text-[#94A3B8] text-xs font-mono"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Connected Grid (Motions 02 through 05) */}
          <div className="grid grid-cols-1 md:grid-cols-2 overflow-hidden border border-[#1E293B] bg-[#0A111E]">
            {motionsData.slice(1).map((item, index) => {
              // Calculate explicit inner borders so adjacent cells connect seamlessly
              const isEven = index % 2 === 0; // Left column (02, 04)
              const isTopRow = index < 2; // Top row of the subgrid (02, 03)

              return (
                <motion.div
                  key={item.number}
                  variants={itemVariants}
                  className={`flex flex-col justify-between group ${
                    isEven ? "md:border-r border-[#1E293B]" : ""
                  } ${isTopRow ? "border-b border-[#1E293B]" : ""}`}
                >
                  <div>
                    {/* Image Section */}
                    <div className="relative w-full h-[180px] overflow-hidden">
                      <Image
                        src={item.imageSrc}
                        alt={item.imageAlt}
                        fill
                        className="object-cover object-center grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A111E] via-[#0A111E]/40 to-transparent" />
                    </div>

                    {/* Body Content */}
                    <div className="p-6 sm:p-8 pb-4">
                      <span className="text-2xl font-mono font-bold text-[#1E293B] group-hover:text-[#2DD4BF]/40 transition-colors block mb-2">
                        {item.number}
                      </span>

                      <span className="inline-block px-2.5 py-1 bg-[#083344] border border-[#0891B2]/40 rounded text-[#00E5FF] text-[10px] font-mono tracking-wider font-semibold uppercase mb-3">
                        {item.badge}
                      </span>

                      <h3 className="text-lg font-semibold text-white mb-3 leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-[#94A3B8] text-xs sm:text-sm leading-relaxed mb-4 font-normal">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex flex-wrap gap-2">
                    {item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-[#111C2E] border border-[#1E293B] text-[#94A3B8] text-xs font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
