"use client";

import React, { useState } from "react";
import { motion, Variants } from "framer-motion";
import {
  Check,
  Shield,
  Layers,
  Sliders,
  FileText,
  BarChart2,
  Lock,
} from "lucide-react";

interface Step {
  id: number;
  title: string;
  description: string;
  layerIndex: number;
}

const STEPS: Step[] = [
  {
    id: 1,
    title: "External request",
    description: "A connected system sends data or a request.",
    layerIndex: 0,
  },
  {
    id: 2,
    title: "Identity validated",
    description: "ZoikoVertex validates identity and connector authorization.",
    layerIndex: 1,
  },
  {
    id: 3,
    title: "Policy evaluated",
    description: "Policy and workflow rules evaluate the request.",
    layerIndex: 1,
  },
  {
    id: 4,
    title: "Workflow executes",
    description:
      "The approved action runs, with a human checkpoint if required.",
    layerIndex: 2,
  },
  {
    id: 5,
    title: "Evidence recorded",
    description: "Evidence and audit records are generated.",
    layerIndex: 3,
  },
  {
    id: 6,
    title: "External confirmation",
    description: "The external platform receives the output and confirms.",
    layerIndex: 5,
  },
];

const LAYERS = [
  {
    title: "Connector Layer",
    description: "Native APIs, webhooks, OAuth, service accounts.",
    icon: <Layers className="w-4 h-4 text-[#20E7F2]" />,
  },
  {
    title: "Policy Layer",
    description: "Brand, approval, autonomy, risk, jurisdiction rules.",
    icon: <Shield className="w-4 h-4 text-[#20E7F2]" />,
  },
  {
    title: "Workflow Layer",
    description: "Approvals, HITL checks, escalation, exceptions.",
    icon: <Sliders className="w-4 h-4 text-[#20E7F2]" />,
  },
  {
    title: "Evidence Layer",
    description: "Events logged, proof stored, decisions linked.",
    icon: <FileText className="w-4 h-4 text-[#20E7F2]" />,
  },
  {
    title: "Observability Layer",
    description: "Sync health, token status, webhook + error rates.",
    icon: <BarChart2 className="w-4 h-4 text-[#20E7F2]" />,
  },
  {
    title: "Security Layer",
    description: "Scopes, secrets, redaction, retention, exports.",
    icon: <Lock className="w-4 h-4 text-[#20E7F2]" />,
  },
];

export default function GovernanceArchitecture() {
  const [activeStep, setActiveStep] = useState<number>(1);

  const handleNextStep = () => {
    setActiveStep((prev) => (prev < STEPS.length ? prev + 1 : 1));
  };

  const containerVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const currentStepData = STEPS.find((s) => s.id === activeStep) || STEPS[0];

  return (
    <div className="relative min-h-screen w-full bg-[#030914] text-slate-300 font-sans antialiased p-6 md:p-12 lg:p-16 flex items-center justify-center overflow-hidden">
      <motion.div
        className="max-w-7xl w-full space-y-10 z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-[#E8B768] font-mono text-xs font-semibold tracking-widest uppercase">
            <span className="w-3 h-[1px] bg-[#E8B768] inline-block" />
            <span>GOVERNED INTEGRATION ARCHITECTURE</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Integrations shouldn&apos;t bypass
            <br />
            governance.
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl leading-relaxed font-normal">
            ZoikoVertex routes connected actions through identity, policy,
            workflow, evidence, and observability controls before they become
            enterprise outcomes. Step a connected request through the fabric.
          </p>
        </div>

        {/* Main Grid Interactive Interactive Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Step Process Navigation */}
          <div className="lg:col-span-5 rounded-2xl bg-gradient-to-b from-[#131C2B] to-[#0B1524] border border-[#7AA0BE]/26 p-4 md:p-6 space-y-3 shadow-2xl">
            {STEPS.map((step) => {
              const isActive = step.id === activeStep;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`cursor-pointer rounded-xl p-3.5 transition-all flex items-start space-x-3.5 border ${
                    isActive
                      ? "bg-gradient-to-r from-[#20E7F2]/10 to-transparent border-[#20E7F2]/40 shadow-[0_0_15px_rgba(32,231,242,0.08)]"
                      : "bg-[#030914]/40 border-transparent hover:border-[#7AA0BE]/20"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                      isActive
                        ? "bg-[#20E7F2] text-[#030914]"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {step.id}
                  </div>
                  <div className="space-y-0.5">
                    <h3
                      className={`text-xs font-bold transition-colors ${
                        isActive ? "text-[#20E7F2]" : "text-slate-300"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Panel: Fabric Viewer & Dynamic State */}
          <div className="lg:col-span-7 rounded-2xl bg-gradient-to-b from-[#131C2B] to-[#0B1524] border border-[#7AA0BE]/26 p-5 md:p-6 space-y-6 shadow-2xl relative overflow-hidden">
            {/* Header of Visualizer */}
            <div className="flex items-center justify-between pb-2 border-b border-[#7AA0BE]/15">
              <span className="text-[11px] font-mono tracking-widest text-[#8B97A6] uppercase font-semibold">
                GOVERNED FABRIC - REQUEST
              </span>
              <span className="text-[10px] font-mono text-[#20E7F2]/80 font-medium">
                SOC-REQ--4471
              </span>
            </div>

            {/* Architecture Stack Layers */}
            <div className="space-y-2">
              {LAYERS.map((layer, index) => {
                const isSelectedLayer = index === currentStepData.layerIndex;
                return (
                  <motion.div
                    key={layer.title}
                    animate={{
                      scale: isSelectedLayer ? 1.01 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className={`rounded-xl p-3.5 flex items-center justify-between border transition-all ${
                      isSelectedLayer
                        ? "bg-[#E8B7680D] border-[#7AA0BE24] shadow-[0_0_20px_rgba(32,231,242,0.12)]"
                        : "bg-[#030914]/50 border-[#7AA0BE]/15 opacity-60"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-lg ${isSelectedLayer ? "bg-[#131C2B] border border-yellow-500" : "bg-[#131C2B] border border-[#7AA0BE]/20"}`}
                      >
                        {layer.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">
                          {layer.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {layer.description}
                        </span>
                      </div>
                    </div>
                    {isSelectedLayer && (
                      <Check className="w-4 h-4 text-[#E8B768] shrink-0" />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Request Meta Panel */}
            <div className="rounded-xl bg-[#030914]/80 border border-[#7AA0BE]/20 p-4 space-y-2.5">
              <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold">
                EXTERNAL REQUEST • MUST SHOW
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Source system</span>
                  <span className="text-white font-medium">
                    LinkedIn • Social
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Permission scope</span>
                  <span className="text-[#20E7F2] font-semibold">
                    publish:campaign
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Timestamp</span>
                  <span className="text-slate-300">14:22:07 UTC</span>
                </div>
              </div>
            </div>

            {/* Step Controls / Footer */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-slate-400">
                Step <span className="text-white font-bold">{activeStep}</span>{" "}
                / 6
              </span>
              <button
                onClick={handleNextStep}
                className="px-5 py-2.5 bg-[#20E7F2] hover:bg-[#1cd2dc] text-[#030914] font-semibold text-xs rounded-lg transition-all shadow-[0_0_15px_rgba(32,231,242,0.25)] hover:shadow-[0_0_20px_rgba(32,231,242,0.4)] active:scale-[0.98]"
              >
                Next step
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
