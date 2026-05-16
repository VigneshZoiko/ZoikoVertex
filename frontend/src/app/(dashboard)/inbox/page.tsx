"use client";

import { Inbox } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-6">
        <Inbox className="w-8 h-8 text-sky-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-3">Inbox & Engagement</h1>
      <p className="text-[#888888] text-base max-w-xl leading-relaxed mb-2">
        Manage inbound DMs, comments, and mentions. Escalate sensitive interactions and route community workflows.
      </p>
      <p className="text-[#555555] text-sm">This surface is under active development.</p>
    </div>
  );
}
