"use client";

import { useState } from "react";
import { 
  CreditCard, Zap, ShieldCheck, CheckCircle2, 
  ArrowRight, Crown, Layers, Building2,
  Clock, Download, ExternalLink, Sliders
} from "lucide-react";

export default function BillingPage() {
  const [plan, setPlan] = useState('ENTERPRISE');

  const plans = [
    {
      name: 'FREE',
      price: '$0',
      desc: 'Individual experimentation and learning.',
      features: ['1 Autonomous Agent', 'Basic Content Generation', 'Standard Governance Library'],
      color: 'text-slate-400',
      button: 'Current Plan'
    },
    {
      name: 'PRO',
      price: '$299',
      desc: 'Advanced control for growing agencies.',
      features: ['10 Autonomous Agents', 'Predictive Risk Intelligence', 'Sovereign Evidence Vault', 'Custom Brand Profiles'],
      color: 'text-indigo-400',
      button: 'Upgrade to Pro'
    },
    {
      name: 'ENTERPRISE',
      price: 'Custom',
      desc: 'Full-scale intelligence for global organizations.',
      features: ['Unlimited Agents', 'Immutable Audit Ledger', 'Forensic Performance Engine', 'Multi-Workspace Control', '24/7 Mission Support'],
      color: 'text-cyan-400',
      button: 'Contact Success Team'
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 pb-32 bg-black min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3 italic">
            <CreditCard className="w-8 h-8 text-indigo-500" />
            Billing & Architecture
          </h1>
          <p className="text-[#888] mt-1 text-sm font-medium uppercase tracking-widest">Manage your enterprise scaling and license access</p>
        </div>
        <div className="px-6 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center gap-2">
           <Crown className="w-4 h-4 text-indigo-400" />
           <span className="text-[10px] font-black text-white uppercase tracking-widest">Enterprise Access Active</span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((p, i) => (
          <div key={i} className={`bg-[#050505] border ${p.name === plan ? 'border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.1)]' : 'border-slate-900'} rounded-[3rem] p-10 flex flex-col space-y-8 group transition-all`}>
             <div className="space-y-2">
                <div className={`text-[10px] font-black uppercase tracking-[0.4em] ${p.color}`}>{p.name} PLAN</div>
                <div className="text-4xl font-black text-white tracking-tighter">{p.price}<span className="text-sm text-slate-500 font-medium tracking-normal">/mo</span></div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{p.desc}</p>
             </div>

             <div className="space-y-4 flex-1">
                {p.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-3">
                     <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                     <span className="text-xs text-slate-300 font-medium">{f}</span>
                  </div>
                ))}
             </div>

             <button className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
               p.name === plan ? 'bg-indigo-600 text-white cursor-default' : 'bg-black border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'
             }`}>
                {p.name === plan ? 'Active Account' : p.button}
             </button>
          </div>
        ))}
      </div>

      {/* Usage Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
         <div className="lg:col-span-8 bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-10">
            <div className="flex items-center gap-4">
               <Sliders className="w-5 h-5 text-indigo-400" />
               <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Resource Utilization</h2>
            </div>

            <div className="space-y-8">
               {[
                 { label: 'Autonomous Agents', current: 12, limit: 100, color: 'bg-indigo-500' },
                 { label: 'Governance Computes', current: 842, limit: 5000, color: 'bg-cyan-500' },
                 { label: 'Evidence Storage', current: 42, limit: 500, color: 'bg-emerald-500' },
               ].map((u, i) => (
                 <div key={i} className="space-y-3">
                    <div className="flex justify-between items-end">
                       <div>
                          <div className="text-xs font-bold text-white">{u.label}</div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest">{u.current} / {u.limit} units used</div>
                       </div>
                       <div className="text-xs font-black text-white">{Math.round((u.current / u.limit) * 100)}%</div>
                    </div>
                    <div className="h-1.5 w-full bg-black rounded-full overflow-hidden border border-slate-900">
                       <div className={`h-full ${u.color}`} style={{ width: `${(u.current / u.limit) * 100}%` }} />
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="lg:col-span-4 space-y-8">
            <div className="bg-[#050505] border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-8 relative overflow-hidden">
               <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Payment Method</h3>
               <div className="p-6 bg-black border border-slate-800 rounded-3xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                        <Building2 className="w-5 h-5" />
                     </div>
                     <div>
                        <div className="text-xs font-bold text-white">Corporate Invoice</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Ending in ****4291</div>
                     </div>
                  </div>
                  <button className="text-indigo-400 hover:text-indigo-300 transition-colors">
                     <ArrowRight className="w-4 h-4" />
                  </button>
               </div>
               
               <button className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                  Manage Billing
               </button>
            </div>

            <div className="bg-slate-950/50 border border-slate-900 rounded-[3rem] p-8 text-center space-y-4">
               <Download className="w-8 h-8 text-slate-600 mx-auto" />
               <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                  Historical invoices and usage logs are available in the audit ledger.
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
