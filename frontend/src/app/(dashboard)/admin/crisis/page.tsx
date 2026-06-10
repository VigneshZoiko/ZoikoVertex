"use client";

import { Siren } from "lucide-react";

export default function CrisisConsolePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
        <Siren className="w-8 h-8 text-red-400" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Crisis Console</h1>
      <p className="text-[#888888] text-base max-w-xl leading-relaxed mb-2">
        Emergency access surface for authorized crisis commanders — pause scheduled publishing, open crisis approvals, annotate crisis windows, and route post-incident review.
      </p>
      <p className="text-[#555555] text-sm font-medium text-red-500/60">Activation requires dual authorization. All actions are time-boxed and fully audited.</p>
    </div>
  );
}
