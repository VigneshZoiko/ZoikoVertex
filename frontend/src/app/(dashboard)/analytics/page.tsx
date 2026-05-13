"use client";

import { useState, useMemo } from "react";
import { 
  BarChart3, PieChart, Activity, TrendingUp, 
  ArrowUpRight, ArrowDownRight, Globe, Users,
  Zap, ShieldCheck, Target, MousePointer2,
  Calendar, Filter, Download, Share2,
  Layers, Compass, Eye, Sparkles
} from "lucide-react";

const PULSE_MOCK_DATA = [65, 45, 75, 55, 85, 40, 60, 90, 70, 50, 80, 45, 65, 55, 75, 40, 85, 60, 50, 70];

export default function AnalyticsPage() {
  const pulseData = PULSE_MOCK_DATA;
  
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 pb-32 bg-black min-h-screen">
      {/* Hero: Analytics Command Center */}
      <div className="relative overflow-hidden bg-slate-950 border border-purple-500/30 rounded-[4rem] p-16 shadow-[0_0_100px_rgba(168,85,247,0.15)]">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 blur-[200px] rounded-full -mr-80 -mt-80 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/5 blur-[150px] rounded-full -ml-40 -mb-40" />
        
        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-16">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-purple-500/5 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2 shadow-inner backdrop-blur-md">
              <TrendingUp className="w-4 h-4 animate-bounce" />
              Vertex Intelligence Analytics Active
            </div>
            <h1 className="text-7xl font-black text-white tracking-tighter leading-[0.85] drop-shadow-2xl">
              Performance <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600 italic">Forensics.</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed max-w-2xl font-medium tracking-tight">
              Decode the resonance of every deployment. Our multi-dimensional analytics engine 
              correlates governance patterns with audience engagement in real-time.
            </p>
            <div className="flex flex-wrap items-center gap-8 pt-4">
              <div className="flex flex-col">
                <span className="text-white font-black text-3xl tracking-tighter">1.2M</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Reach</span>
              </div>
              <div className="w-px h-12 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-purple-400 font-black text-3xl tracking-tighter">+24.2%</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resonance Lift</span>
              </div>
              <div className="w-px h-12 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-indigo-400 font-black text-3xl tracking-tighter">84.5</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quality Score</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
             <button className="px-10 py-5 bg-white text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-purple-600 hover:text-white transition-all shadow-xl active:scale-95 group">
                <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" /> Export Report
             </button>
             <button className="p-5 bg-slate-900 border border-slate-800 rounded-[2rem] text-slate-400 hover:text-white hover:border-slate-600 transition-all shadow-2xl">
                <Share2 className="w-6 h-6" />
             </button>
          </div>
        </div>
      </div>

      {/* Strategic Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Engagement Rate', value: '4.8%', icon: MousePointer2, color: 'text-purple-400', trend: '+1.2%', trendUp: true },
          { label: 'Brand Sentiment', value: 'Positive', icon: ShieldCheck, color: 'text-indigo-400', trend: '+8%', trendUp: true },
          { label: 'Global Reach', value: '842k', icon: Globe, color: 'text-emerald-400', trend: '-2%', trendUp: false },
          { label: 'Conversion Lift', value: '12.4%', icon: Zap, color: 'text-amber-400', trend: '+4%', trendUp: true },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-950 border border-slate-900 rounded-[2.5rem] p-8 hover:border-purple-500/40 transition-all group shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <stat.icon className="w-24 h-24" />
            </div>
            <div className="flex items-center justify-between mb-8 relative z-10">
               <div className={`p-4 rounded-2xl bg-black border border-slate-800 ${stat.color} group-hover:scale-110 transition-transform shadow-inner`}>
                  <stat.icon className="w-6 h-6" />
               </div>
               <div className="flex flex-col items-end">
                  <div className="text-3xl font-black text-white tracking-tighter">{stat.value}</div>
                  <div className={`text-[10px] font-black flex items-center gap-1 mt-1 ${stat.trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                     {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                     {stat.trend}
                  </div>
               </div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 group-hover:text-slate-200 transition-colors relative z-10">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main Intelligence Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Engagement Pulse Chart */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-10 relative overflow-hidden">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <Activity className="w-5 h-5 text-purple-400" />
                 <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Engagement Pulse</h2>
              </div>
              <div className="flex bg-black p-1 rounded-xl border border-slate-800">
                 {['24H', '7D', '30D', '90D'].map(p => (
                   <button key={p} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${p === '7D' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                      {p}
                   </button>
                 ))}
              </div>
           </div>

           <div className="h-64 bg-black/40 rounded-[2.5rem] border border-slate-900/60 p-10 flex items-end justify-between gap-4 shadow-inner relative overflow-hidden">
              {/* Simulated Pulse Line */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5">
                 <Target className="w-64 h-64 text-purple-500" />
              </div>
              
              {pulseData.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group/bar">
                   <div 
                     className="w-full bg-gradient-to-t from-purple-600/20 to-purple-400 rounded-full group-hover/bar:from-purple-500 group-hover/bar:to-purple-300 transition-all duration-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]" 
                     style={{ height: `${h}%` }}
                   />
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-800 group-hover/bar:bg-purple-500 transition-all" />
                </div>
              ))}
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl text-center">
                 <div className="text-2xl font-black text-white">84.2k</div>
                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Peak Concurrent</div>
              </div>
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl text-center">
                 <div className="text-2xl font-black text-purple-400">12.5%</div>
                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Avg Click-Through</div>
              </div>
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl text-center">
                 <div className="text-2xl font-black text-white">4.2m</div>
                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Impressions</div>
              </div>
           </div>
        </div>

        {/* Audience Radar & Insights */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-slate-950 border border-slate-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10">Resonance Matrix</h3>
              
              <div className="relative aspect-square flex items-center justify-center mb-10">
                 {/* Visual Radar Simulator */}
                 <div className="absolute inset-0 rounded-full border border-slate-900 border-dashed animate-[spin_30s_linear_infinite]" />
                 <div className="absolute inset-8 rounded-full border border-purple-500/10" />
                 <div className="absolute inset-16 rounded-full border border-purple-500/5" />
                 
                 <div className="relative z-10 grid grid-cols-2 gap-4">
                    <div className="text-center p-4">
                       <div className="text-xs font-black text-white uppercase tracking-widest">Viral</div>
                       <div className="text-lg font-black text-purple-400">92%</div>
                    </div>
                    <div className="text-center p-4 border-l border-slate-900">
                       <div className="text-xs font-black text-white uppercase tracking-widest">Loyal</div>
                       <div className="text-lg font-black text-emerald-400">84%</div>
                    </div>
                    <div className="text-center p-4 border-t border-slate-900">
                       <div className="text-xs font-black text-white uppercase tracking-widest">Brand</div>
                       <div className="text-lg font-black text-indigo-400">100%</div>
                    </div>
                    <div className="text-center p-4 border-t border-l border-slate-900">
                       <div className="text-xs font-black text-white uppercase tracking-widest">Global</div>
                       <div className="text-lg font-black text-amber-400">76%</div>
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="p-5 bg-purple-900/10 border border-purple-500/20 rounded-2xl flex items-start gap-4">
                    <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
                    <div>
                       <div className="text-[10px] font-black text-white uppercase tracking-widest">AI Insight</div>
                       <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1 italic">
                          &quot;High-risk creative assets are showing a 2x engagement lift in the EU market.&quot;
                       </p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Platform Distribution */}
           <div className="bg-slate-950 border border-slate-800 rounded-[3rem] p-10 shadow-2xl space-y-8">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Omni-Channel Mix</h3>
              <div className="space-y-6">
                 {[
                   { name: 'Instagram', value: 45, color: 'bg-purple-500' },
                   { name: 'X (Twitter)', value: 30, color: 'bg-slate-200' },
                   { name: 'LinkedIn', value: 25, color: 'bg-indigo-600' },
                 ].map((p, i) => (
                   <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.name}</span>
                         <span className="text-[10px] font-black text-white uppercase tracking-widest">{p.value}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                         <div className={`h-full ${p.color} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} style={{ width: `${p.value}%` }} />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
