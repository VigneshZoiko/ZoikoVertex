"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface CTAButton {
  label: string;
  variant: "primary" | "secondary" | "outline";
  href: string;
}

const buttons: CTAButton[] = [
  { label: "Book a Demo", variant: "primary", href: "/demo-library" },
  {
    label: "Start ROI & Governance Audit",
    variant: "secondary",
    href: "/roi-governance-audit",
  },
  { label: "Contact Sales", variant: "outline", href: "/support" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
} as const;

const buttonVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

export default function UseCasesCta() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#060a12] px-6 py-24 sm:px-10 lg:px-16">
      {/* Radial gradient background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(6,60,70,0.55) 0%, rgba(6,10,18,0) 70%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl text-center">
        {/* Eyebrow label */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-6 flex items-center justify-center gap-3"
        >
          <span className="h-px w-6 bg-cyan-400" />

          <span className="text-[11px] font-semibold tracking-[0.25em] text-cyan-400">
            ZOIKOVERTEX USE CASES
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.1 }}
          className="mb-6 text-[34px] font-bold leading-tight text-white sm:text-[42px]"
        >
          Recognize your pain.
          <br />
          See the proof. Choose
          <br />
          your step.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.2 }}
          className="mx-auto mb-10 max-w-xl text-[14px] leading-relaxed text-slate-400"
        >
          Route to the ZoikoVertex value path that matches your function,
          outcome, and governance need.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {buttons.map((btn) => (
            <motion.button
              key={btn.label}
              variants={buttonVariants}
              type="button"
              onClick={() => router.push(btn.href)}
              className={
                btn.variant === "primary"
                  ? "rounded-lg bg-gradient-to-r cursor-pointer from-[#20E7F2] to-[#00C8F0] px-5 py-3 text-[13px] font-semibold text-[#0a0e1a] transition-colors hover:bg-cyan-300"
                  : btn.variant === "secondary"
                    ? "rounded-lg bg-gradient-to-r cursor-pointer from-[#E8B768] to-[#C8954A] px-5 py-3 text-[13px] font-semibold text-[#0a0e1a] transition-colors hover:bg-amber-300"
                    : "rounded-lg border cursor-pointer border-white/20 bg-transparent px-5 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-white/5"
              }
            >
              {btn.label}
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
