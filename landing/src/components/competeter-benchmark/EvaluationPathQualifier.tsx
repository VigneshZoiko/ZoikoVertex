"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Kanban,
  Mail,
  Bot,
  Workflow,
  BarChart3,
  ArrowRight,
} from "lucide-react";

interface Option {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const evaluationOptions: Option[] = [
  {
    id: "project-management",
    title: "Project / work management tools",
    description: "Asana, Monday, Jira, Notion, ClickUp",
    icon: Kanban,
  },
  {
    id: "marketing-automation",
    title: "Marketing automation platform",
    description: "HubSpot, Marketo, Salesforce Marketing Cloud",
    icon: Mail,
  },
  {
    id: "ai-copilot",
    title: "AI copilot or assistant tools",
    description: "Microsoft Copilot, Google Gemini, Jasper",
    icon: Bot,
  },
  {
    id: "workflow-automation",
    title: "Workflow automation tools",
    description: "Zapier, Make, Power Automate, n8n",
    icon: Workflow,
  },
  {
    id: "bi-analytics",
    title: "BI or analytics dashboards",
    description: "Tableau, Power BI, Looker, Domo",
    icon: BarChart3,
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
} as const;

export default function EvaluationPathQualifier() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  return (
    <section className="w-full bg-[#F4F6FB] py-20 px-4 sm:px-6 md:px-8 font-sans text-slate-900 flex flex-col items-center justify-center">
      <motion.div
        className="max-w-4xl w-full mx-auto text-center mb-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Subheader Badge */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="w-4 h-[1.5px] bg-[#64748B]" />
          <span className="font-mono text-[11px] font-semibold tracking-[0.25em] uppercase text-[#68758A]">
            BUYER QUALIFIER
          </span>
          <span className="w-4 h-[1.5px] bg-[#64748B]" />
        </div>

        {/* Section Heading */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#0B101D] mb-3">
          Find your evaluation path.
        </h2>
        <p className="text-sm sm:text-base text-[#64748B] max-w-lg mx-auto leading-relaxed">
          Four questions. One recommended next step tailored to your buying
          situation.
        </p>
      </motion.div>

      {/* Qualifier Card Component */}
      <motion.div
        className="max-w-2xl w-full mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-[#E2E8F0] overflow-hidden"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Top Progress Bar Line */}
        <div className="w-full bg-[#E2E8F0] h-1">
          <div className="bg-[#00D2B4] h-1 w-1/4 transition-all duration-300 ease-out" />
        </div>

        {/* Card Main Body */}
        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <span className="font-mono text-[11px] font-bold tracking-[0.15em] text-[#94A3B8] uppercase">
              QUESTION 1 OF 4
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-[#0B101D] tracking-tight mt-1">
              What are you evaluating ZoikoVertex against?
            </h3>
          </div>

          {/* Options List */}
          <div className="space-y-3">
            {evaluationOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedOption === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option.id)}
                  type="button"
                  className={`w-full flex items-center gap-4 p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-150 ${
                    isSelected
                      ? "border-[#00D2B4] bg-[#00D2B4]/5 shadow-sm"
                      : "border-[#E8EEF5] bg-[#EEF2F6]/60 hover:bg-[#EEF2F6] hover:border-[#CBD5E1]"
                  }`}
                >
                  {/* Icon Box */}
                  <div
                    className={`p-2 rounded-lg ${isSelected ? "bg-[#00D2B4]/10 text-[#00A890]" : "bg-white text-[#64748B] border border-[#E2E8F0]"}`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>

                  {/* Option Text */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#0F172A] leading-snug">
                      {option.title}
                    </div>
                    <div className="text-[11px] text-[#64748B] truncate mt-0.5 font-normal">
                      {option.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card Footer Bar */}
        <div className="bg-[#EEF2F6]/80 px-6 sm:px-8 py-4 border-t border-[#E2E8F0] flex justify-end">
          <button
            disabled={!selectedOption}
            type="button"
            className={`inline-flex items-center gap-2 font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all duration-150 ${
              selectedOption
                ? "bg-[#0F1929] hover:bg-[#0F172A] text-white shadow-md cursor-pointer"
                : "bg-[#0F1929]/40 text-[#64748B] cursor-not-allowed"
            }`}
          >
            <span className="text-white">Continue</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </motion.div>
    </section>
  );
}
