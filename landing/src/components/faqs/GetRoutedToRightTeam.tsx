"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface RouteCard {
  id: string;
  title: string;
  description: string;
  actionText: string;
  href: string;
}

const routeCards: RouteCard[] = [
  {
    id: "01",
    title: "Buying / enterprise evaluation",
    description:
      "Company size, use case, and timeline — routed to a sales specialist.",
    actionText: "Contact Sales",
    href: "#contact-sales",
  },
  {
    id: "02",
    title: "Product help / admin issue",
    description:
      "Workspace, issue type, and affected feature — routed to Support.",
    actionText: "Contact Support",
    href: "#contact-support",
  },
  {
    id: "03",
    title: "Integration or API question",
    description:
      "System name, data flow, and urgency — routed to Support or Partnerships.",
    actionText: "Ask a Technical Question",
    href: "#tech-question",
  },
  {
    id: "04",
    title: "Compliance or data question",
    description:
      "Jurisdiction and requested documentation — routed to Legal or Sales.",
    actionText: "Request Documentation",
    href: "#request-docs",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
} as const;

export default function GetRoutedToRightTeam() {
  return (
    <section className="w-full bg-[#F6F5EE] py-20 px-4 sm:px-8 md:px-12 lg:px-24 font-sans text-[#111827] flex flex-col items-center justify-center">
      <div className="max-w-6xl w-full mx-auto flex flex-col items-center">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-[1.5px] bg-[#00D2B4]" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.25em] uppercase text-[#00D2B4]">
              STILL NEED HELP
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-[40px] font-bold tracking-tight text-[#0F172A] leading-tight max-w-120">
            Get routed to the right team.
          </h2>
        </div>

        {/* 4-Column Grid using shadow-sm (no border) */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {routeCards.map((card) => (
            <motion.div
              key={card.id}
              variants={cardVariants}
              whileHover={{ y: -3 }}
              className="shadow-sm p-6 sm:p-7 flex flex-col justify-between transition-all duration-200"
            >
              {/* Top Content */}
              <div>
                <span className="font-mono text-xs text-[#00D2B4] font-medium block mb-4">
                  {card.id}
                </span>
                <h3 className="text-[15px] font-bold text-[#0F172A] leading-snug mb-3">
                  {card.title}
                </h3>
                <p className="text-xs sm:text-[13px] leading-relaxed text-[#64748B]">
                  {card.description}
                </p>
              </div>

              {/* Bottom Action Area */}
              <div className="mt-2 pt-4 border-t border-[#DEDACF]">
                <a
                  href={card.href}
                  className="inline-flex items-center justify-between w-full font-mono text-[11px] font-medium text-[#0F172A] hover:text-[#00D2B4] transition-colors duration-150 group"
                >
                  <span>{card.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#0F172A] group-hover:text-[#00D2B4] group-hover:translate-x-0.5 transition-all duration-150" />
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
