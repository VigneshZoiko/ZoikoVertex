"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface PartnerProfileCard {
  badge: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}

const partnerProfiles: PartnerProfileCard[] = [
  {
    badge: "IMPLEMENTATION",
    title: "Deploy & govern for enterprise customers",
    description:
      "SIs and transformation firms delivering governed AI execution for enterprise marketing, retail, and operations.",
    imageSrc: "/images/partnerships/111.jpg",
    imageAlt: "Implementation Partner",
  },
  {
    badge: "TECHNOLOGY",
    title: "Integrate and expand the platform surface",
    description:
      "SaaS vendors and AI tooling companies seeking API-level integration with enterprise governance infrastructure.",
    imageSrc: "/images/partnerships/222.jpg",
    imageAlt: "Technology Partner",
  },
  {
    badge: "AGENCY",
    title: "Deliver governed campaigns at enterprise speed",
    description:
      "Enterprise marketing agencies using ZoikoVertex to deliver faster, evidenced, approval-disciplined campaign execution.",
    imageSrc: "/images/partnerships/333.jpg",
    imageAlt: "Agency Partner",
  },
  {
    badge: "INTEGRATION",
    title: "Expand the integration surface",
    description:
      "CRM, ERP, DAM, and automation platforms expanding ZoikoVertex enterprise stack connectivity.",
    imageSrc: "/images/partnerships/444.jpg",
    imageAlt: "Integration Partner",
  },
  {
    badge: "REFERRAL / CO-SELL",
    title: "Introduce qualified enterprise accounts",
    description:
      "Advisors and consultants introducing enterprise accounts and supporting commercial expansion.",
    imageSrc: "/images/partnerships/555.jpg",
    imageAlt: "Referral Partner",
  },
  {
    badge: "STRATEGIC ALLIANCE",
    title: "Joint GTM, product, and market expansion",
    description:
      "Global platforms and advisory firms with board-level strategic fit for deep joint go-to-market.",
    imageSrc: "/images/partnerships/666.jpg",
    imageAlt: "Strategic Alliance Partner",
  },
];

export default function PartnerProfilesSection() {
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
    <section className="w-full bg-[#0C1422] text-white pt-24 pb-0 font-sans antialiased overflow-hidden">
      {/* Header Container constrained to max-w-6xl for precise alignment */}
      <div className="max-w-6xl mx-auto px-6 sm:px-12 md:px-16 mb-16">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Subtitle Accent Line & Text */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-[#2DD4BF]" />
            <span className="text-[#2DD4BF] text-xs tracking-[0.2em] font-medium uppercase font-mono">
              THE RIGHT PATH FOR EVERY PARTNER TYPE
            </span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight max-w-2xl">
            Six partner profiles. One governed ecosystem.
          </h2>
        </motion.div>
      </div>

      {/* Full Width 6-Column Card Row Container */}
      <div className="w-full px-2 sm:px-4 md:px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 border border-[#1E293B] rounded-t-2xl overflow-hidden divide-y sm:divide-y-0 lg:divide-x divide-[#1E293B] bg-[#0A111E]"
        >
          {partnerProfiles.map((profile, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="relative min-h-[460px] sm:min-h-[520px] flex flex-col justify-end p-6 group overflow-hidden"
            >
              {/* Background Image */}
              <Image
                src={profile.imageSrc}
                alt={profile.imageAlt}
                fill
                className="object-cover object-center grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />

              {/* Dark Gradient Overlay for optimal text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-[#050B14]/80 to-transparent z-10" />

              {/* Content Overlay */}
              <div className="relative z-20">
                {/* Cyan Badge */}
                <span className="text-[#2DD4BF] text-[10px] font-mono tracking-widest uppercase font-semibold block mb-2">
                  {profile.badge}
                </span>

                {/* Card Title */}
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2 leading-snug">
                  {profile.title}
                </h3>

                {/* Card Description */}
                <p className="text-[#94A3B8] text-xs leading-relaxed font-normal">
                  {profile.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
