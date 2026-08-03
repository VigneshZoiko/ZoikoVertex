"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
} as const;

export default function LegalPrepublicationNotice() {
  return (
    <section className="w-full bg-[#C9A84C40] border-y border-[#C9A84CB2]/20 py-4 px-4 sm:px-8 font-mono">
      <motion.div
        className="max-w-6xl w-full mx-auto flex items-start gap-3.5"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {/* Warning Icon */}
        <AlertTriangle
          className="w-4 h-4 shrink-0 mt-0.5"
          style={{ color: "#C9A84C" }}
        />

        {/* Legal Disclaimer Text */}
        <p
          className="text-xs leading-relaxed tracking-[0.3px] font-medium"
          style={{ color: "#C9A84C" }}
        >
          <strong className="font-bold">
            Pre-publication notice for legal and product review.
          </strong>{" "}
          This DPA page reflects intended contractual positions and must be
          reviewed by counsel for all target jurisdictions before publication.
          Processing categories, subprocessors, transfer mechanisms, retention
          periods, and security commitments must reflect implemented practices.
          No legally binding obligation arises from this public page alone — the
          executed customer agreement and DPA govern.
        </p>
      </motion.div>
    </section>
  );
}
