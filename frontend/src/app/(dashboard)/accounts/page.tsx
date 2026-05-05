"use client";

import { Link as LinkIcon, Plus } from "lucide-react";

export default function AccountsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Connected Accounts</h1>
          <p className="text-zinc-400">Manage OAuth tokens and platform integrations for your workspace.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          Add Connection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Connection Card: LinkedIn */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between h-48">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0A66C2] rounded flex items-center justify-center text-white font-bold text-xl">
                in
              </div>
              <div>
                <h3 className="text-white font-medium">Zoiko Industries</h3>
                <p className="text-xs text-zinc-400">LinkedIn Company Page</p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active
            </span>
          </div>
          
          <div className="flex items-center justify-between border-t border-zinc-800 pt-4 mt-4">
            <p className="text-xs text-zinc-500">Token expires in 45 days</p>
            <button className="text-xs text-zinc-400 hover:text-white transition-colors">Manage</button>
          </div>
        </div>

        {/* Connection Card: Meta */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between h-48">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 rounded flex items-center justify-center text-white font-bold text-xl">
                IG
              </div>
              <div>
                <h3 className="text-white font-medium">@ZoikoOfficial</h3>
                <p className="text-xs text-zinc-400">Instagram Business</p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Re-auth Needed
            </span>
          </div>
          
          <div className="flex items-center justify-between border-t border-zinc-800 pt-4 mt-4">
            <p className="text-xs text-amber-500/70">OAuth token expired</p>
            <button className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">Reconnect</button>
          </div>
        </div>

        {/* Empty State / Add New */}
        <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center h-48 hover:bg-zinc-800/30 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-colors mb-3">
            <LinkIcon className="w-5 h-5" />
          </div>
          <h3 className="text-white font-medium text-sm">Connect new platform</h3>
          <p className="text-xs text-zinc-500 mt-1 text-center">Support for X, TikTok, and YouTube coming soon.</p>
        </div>
      </div>
    </div>
  );
}
