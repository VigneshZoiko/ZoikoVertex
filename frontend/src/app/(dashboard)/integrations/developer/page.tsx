"use client";

import { Terminal } from "lucide-react";

export default function DeveloperConsolePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-500/10 flex items-center justify-center mb-6">
        <Terminal className="w-8 h-8 text-slate-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-3">Developer Console</h1>
      <p className="text-[#888888] text-base max-w-xl leading-relaxed mb-2">
        API keys, webhook configuration, sandbox access, integration logs, and technical diagnostics for engineering teams.
      </p>
      <p className="text-[#555555] text-sm">This surface is under active development.</p>
    </div>
  );
}
