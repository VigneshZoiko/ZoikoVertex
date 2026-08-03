"use client";

import React from "react";
import { motion } from "framer-motion";

interface QuestionCardProps {
  id: string;
  question: string;
  answer: string;
}

const questionsData: QuestionCardProps[] = [
  {
    id: "Q01",
    question: "Is ZoikoVertex an AI chatbot?",
    answer:
      "No. It's an execution platform where agents, human reviewers, approval workflows, and evidence records work together under enterprise controls.",
  },
  {
    id: "Q02",
    question: "Can humans approve AI outputs before publishing?",
    answer:
      "Yes. Structured approval workflows let reviewers edit, approve, reject, escalate, or request changes before anything moves forward.",
  },
  {
    id: "Q03",
    question: "What does ZoikoVertex store for auditability?",
    answer:
      "Audit events, evidence records, decision references, workflow snapshots, approval outcomes, and retention metadata.",
  },
  {
    id: "Q04",
    question: "How is ROI measured?",
    answer:
      "Time saved, approval cycle reduction, reduced rework, campaign throughput, and governance risk reduction.",
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
} as const;

export default function FeaturedQuestions() {
  return (
    <section className="w-full bg-[#070A11] min-h-screen py-16 px-4 sm:px-8 md:px-12 lg:px-20 font-sans text-white flex flex-col items-center justify-center">
      <motion.div
        className="max-w-6xl w-full mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={containerVariants}
      >
        {/* Header Section */}
        <div className="text-left mb-12 flex flex-col items-start">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-[1px] bg-[#00D2B4]"></span>
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#00D2B4] font-medium">
              FEATURED QUESTIONS
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-[40px] font-bold tracking-tight text-white leading-tight">
            The four questions buyers ask first.
          </h2>
        </div>

        {/* Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 border border-[#1E293B]/80">
          {questionsData.map((item, index) => (
            <a key={item.id} href="#" className="block group">
              <motion.div
                variants={itemVariants}
                className={`p-8 sm:p-10 h-full flex flex-col justify-between border-[#1E293B]/80 transition-colors duration-200 hover:bg-[#111827]/60
                  ${index % 2 === 0 ? "md:border-r" : ""}
                  ${index < 2 ? "md:border-b" : ""}
                  ${index < 3 ? "max-md:border-b" : ""}
                `}
              >
                <div>
                  {/* ID Subtitle */}
                  <span className="block text-[12px] font-mono tracking-[0.15em] text-[#00D2B4] mb-4 font-semibold">
                    {item.id}
                  </span>

                  {/* Question Heading */}
                  <h3 className="text-[18px] sm:text-[19px] font-bold text-white leading-snug mb-4 group-hover:text-[#00D2B4] transition-colors duration-200">
                    {item.question}
                  </h3>
                </div>

                {/* Answer Description */}
                <p className="text-[14px] text-[#94A3B8] leading-relaxed font-normal mt-2">
                  {item.answer}
                </p>
              </motion.div>
            </a>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
