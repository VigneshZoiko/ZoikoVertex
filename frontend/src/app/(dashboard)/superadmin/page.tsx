"use client";

import { Shield, Construction, Clock, Building2, Users, Activity, Database } from "lucide-react";
import Link from "next/link";

const mockFeatures = [
  { icon: Building2, label: "Cluster Scaling", desc: "Auto-provision new enterprise clusters", eta: "Q3 2026" },
  { icon: Users, label: "Role Inheritance", desc: "Granular permission propagation across orgs", eta: "Q3 2026" },
  { icon: Activity, label: "Health Dashboards", desc: "Per-cluster telemetry and uptime monitoring", eta: "Q4 2026" },
  { icon: Database, label: "Backup Orchestration", desc: "Centralized backup scheduling and restore", eta: "Q4 2026" },
];

export default function GovernanceNodeUpcoming() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500">Governance Node</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center">
            <Construction className="w-10 h-10 mr-4 text-amber-500" />
            Next-Gen Governance
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2 text-lg">
            Advanced enterprise cluster management is being re-engineered. Access core controls from&nbsp;
            <Link href="/superadmin/analytics" className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300 transition-colors">Platform Overview</Link>.
          </p>
        </div>
        <div className="px-4 py-2 bg-gray-100 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700 rounded-lg text-xs font-mono text-gray-500 dark:text-zinc-500">
          COMING SOON
        </div>
      </div>

      {/* Mock feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockFeatures.map((feat, i) => (
          <div key={i} className="bg-gray-50 dark:bg-zinc-900/40 border border-gray-200 dark:border-zinc-800/50 rounded-3xl p-6 flex items-start gap-5 opacity-60">
            <div className="p-3 bg-indigo-500/10 rounded-2xl shrink-0">
              <feat.icon className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{feat.label}</h3>
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500">
                  <Clock className="w-3 h-3" />
                  {feat.eta}
                </span>
              </div>
              <p className="text-gray-500 dark:text-zinc-500 text-sm mt-1">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Redirect hint */}
      <div className="bg-indigo-500/5 border border-indigo-500/10 p-8 rounded-3xl text-center">
        <Shield className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Organization Controls Active</h3>
        <p className="text-gray-500 dark:text-zinc-400 max-w-xl mx-auto">
          Pause, resume, and delete operations for existing clusters are available now in the&nbsp;
          <Link href="/superadmin/analytics" className="text-indigo-400 font-bold underline underline-offset-2 hover:text-indigo-300 transition-colors">
            Platform Overview
          </Link>.
        </p>
      </div>
    </div>
  );
}
