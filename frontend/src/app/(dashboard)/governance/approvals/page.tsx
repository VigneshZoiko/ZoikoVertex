"use client";

import { CheckSquare } from "lucide-react";

export default function ApprovalsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6">
        <CheckSquare className="w-8 h-8 text-green-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-3">Approvals</h1>
      <p className="text-[#888888] text-base max-w-xl leading-relaxed mb-2">
        Formal approval decisions with decision records, approval routing, and authority-scoped authorization by brand, region, and risk level.
      </p>
      <p className="text-[#555555] text-sm">This surface is under active development.</p>
    </div>
  );
}
