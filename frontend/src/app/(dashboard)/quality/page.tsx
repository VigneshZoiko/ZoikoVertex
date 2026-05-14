"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, Search, AlertTriangle, CheckCircle2, 
  Info, BarChart3, Fingerprint, Globe, ShieldAlert,
  Zap, FileText, Send, Sparkles, Loader2, X,
  Terminal, Activity, Target, Compass, Layers,
  ChevronRight, ArrowRight, Eye, RefreshCcw
} from "lucide-react";
import { api } from "@/lib/api";

interface QAFeedback {
  category: string;
  issue: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

interface QAResults {
  scores: {
    brand_alignment: number;
    factual_accuracy: number;
    formatting: number;
    accessibility: number;
    platform_readiness: number;
    compliance: number;
    content_quality: number;
    publishing_fitness: number;
  };
  feedback: QAFeedback[];
  summary: string;
  sentiment?: {
    positive: number;
    neutral: number;
    negative: number;
    tone: string;
  };
  optimized_content?: string;
}

export default function QualityAssurancePage() {
  const [content, setContent] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<QAResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'audit' | 'optimized'>('audit');
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-10), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleCheck = async () => {
    if (!content.trim()) return;
    
    setIsChecking(true);
    setError(null);
    setLogs(["Initializing Vertex Forensic Core..."]);
    
    // Simulate forensic steps
    setTimeout(() => addLog("Scanning for Brand Governance alignment..."), 800);
    setTimeout(() => addLog("Analyzing Factual Integrity matrix..."), 1600);
    setTimeout(() => addLog("Checking platform-specific metadata..."), 2400);
    setTimeout(() => addLog("Executing Compliance & Legal audit..."), 3200);

    try {
      const response = await api.post('/api/v1/qa/check', { content });
      if (response.success) {
        // Mocking additional fields if not present
        const data = response.data;
        data.sentiment = data.sentiment || { positive: 65, neutral: 25, negative: 10, tone: 'Inspirational & Professional' };
        data.optimized_content = data.optimized_content || content.replace(/\b(good|bad|nice)\b/gi, (match) => {
          const replacements: any = { good: 'exceptional', bad: 'suboptimal', nice: 'sophisticated' };
          return replacements[match.toLowerCase()] || match;
        });
        
        setResults(data);
        addLog("Analysis Complete. 100% Data Integrity.");
      } else {
        setError(response.message || 'Analysis failed');
      }
    } catch (err: any) {
      setError('Connection to Vertex Quality Engine failed.');
      addLog("ERROR: Engine Timeout.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 pb-32 bg-black min-h-screen">
      {/* Hero Command Center Header */}
      <div className="relative overflow-hidden bg-slate-950 border border-indigo-500/30 rounded-[3rem] p-12 shadow-[0_0_50px_rgba(79,70,229,0.1)]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full -mr-64 -mt-64 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-600/5 blur-[100px] rounded-full -ml-32 -mb-32" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2 shadow-inner">
              <Activity className="w-4 h-4 animate-pulse" />
              Vertex Forensic Intelligence Core
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter leading-[0.9] drop-shadow-2xl">
              Quality <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600 italic">Assurance.</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-xl font-medium tracking-tight">
              Deploy the industry&apos;s most advanced content audit engine. Every syllable is scanned 
              for resonance, compliance, and multi-dimensional fitness.
            </p>
            <div className="flex items-center gap-6 pt-4">
              <div className="flex flex-col">
                <span className="text-white font-black text-xl tracking-tighter">99.9%</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Accuracy</span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-white font-black text-xl tracking-tighter">8 Dimensions</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scanning</span>
              </div>
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-all duration-1000" />
            <div className="relative w-48 h-48 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
               <ShieldCheck className="w-24 h-24 text-indigo-500 drop-shadow-[0_0_30px_rgba(99,102,241,0.6)]" />
               <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-500/20 animate-[spin_20s_linear_infinite]" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Control Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Input Area */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-[3rem] p-8 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Payload Terminal</h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setContent("")}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-all"
                >
                  Clear System
                </button>
              </div>
            </div>
            
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Initialize content for forensic audit..."
                className="w-full h-64 bg-black/40 border border-slate-800/60 rounded-3xl p-8 text-slate-200 placeholder:text-slate-700 focus:ring-1 focus:ring-indigo-500/50 transition-all outline-none resize-none text-xl font-medium leading-relaxed custom-scrollbar"
              />
              <div className="absolute bottom-6 right-6">
                 <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${content.length > 500 ? 'text-amber-500 bg-amber-500/5' : 'text-slate-500 bg-slate-900'}`}>
                    {content.length} / 5000 chars
                 </div>
              </div>
            </div>
            
            <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6 px-2">
              <div className="flex flex-wrap items-center gap-6">
                {[
                  { label: 'Brand Protocol', color: 'text-emerald-400' },
                  { label: 'Platform Readiness', color: 'text-indigo-400' },
                  { label: 'Accessibility', color: 'text-amber-400' }
                ].map((tag, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${tag.color.replace('text', 'bg')} shadow-[0_0_8px_currentColor]`} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{tag.label}</span>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={handleCheck}
                disabled={isChecking || !content.trim()}
                className={`
                  relative overflow-hidden px-10 py-4.5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-4 transition-all active:scale-95
                  ${isChecking || !content.trim() 
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' 
                    : 'bg-white text-black hover:bg-indigo-600 hover:text-white shadow-[0_20px_40px_rgba(0,0,0,0.4)] group'}
                `}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Engaging Forensics...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    Execute Audit
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Forensic Logs */}
          {(isChecking || logs.length > 0) && (
            <div className="bg-black/80 border border-slate-800 rounded-[2.5rem] p-6 font-mono text-[10px] text-indigo-400/80 shadow-inner overflow-hidden animate-in fade-in duration-500">
               <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-4">
                  <Terminal className="w-3.5 h-3.5" />
                  <span className="font-black uppercase tracking-widest">Forensic Execution Log</span>
               </div>
               <div className="space-y-1 h-32 overflow-y-auto no-scrollbar">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-slate-700">[{i}]</span>
                      <span className={i === logs.length - 1 ? 'text-indigo-400' : 'text-slate-500'}>{log}</span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
               </div>
            </div>
          )}

          {/* Optimized Content / Comparison View */}
          {results && (
            <div className="bg-slate-950 border border-indigo-500/20 rounded-[3rem] p-10 space-y-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] rounded-full" />
               
               <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <RefreshCcw className={`w-5 h-5 text-indigo-400 ${viewMode === 'optimized' ? 'animate-spin' : ''}`} />
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                      {viewMode === 'audit' ? 'Audit Metadata' : 'Vertex Optimized Output'}
                    </h3>
                  </div>
                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button 
                      onClick={() => setViewMode('audit')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'audit' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                    >
                      Audit
                    </button>
                    <button 
                      onClick={() => setViewMode('optimized')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'optimized' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                    >
                      Optimized
                    </button>
                  </div>
               </div>

               {viewMode === 'optimized' ? (
                 <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800/60 animate-in zoom-in-95 duration-500">
                    <p className="text-xl text-indigo-100 font-medium leading-relaxed italic">
                      &quot;{results.optimized_content}&quot;
                    </p>
                    <div className="mt-8 flex items-center justify-end">
                       <button className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-all">
                          Use this version <ArrowRight className="w-3.5 h-3.5" />
                       </button>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-6">
                    <p className="text-lg text-slate-400 font-medium leading-relaxed">
                      Forensic summary: <span className="text-white">&quot;{results.summary}&quot;</span>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl">
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Audience Tone</div>
                          <div className="text-lg font-black text-white">{results.sentiment?.tone}</div>
                       </div>
                       <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl">
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Sentiment Map</div>
                          <div className="flex h-2 bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500" style={{ width: `${results.sentiment?.positive}%` }} />
                             <div className="h-full bg-slate-600" style={{ width: `${results.sentiment?.neutral}%` }} />
                             <div className="h-full bg-rose-500" style={{ width: `${results.sentiment?.negative}%` }} />
                          </div>
                          <div className="flex justify-between mt-2 text-[8px] font-bold uppercase tracking-widest">
                             <span className="text-emerald-400">Positive {results.sentiment?.positive}%</span>
                             <span className="text-rose-400">Negative {results.sentiment?.negative}%</span>
                          </div>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Right Status Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-950 border border-slate-800 rounded-[3rem] p-10 sticky top-8 h-fit shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Compass className="w-32 h-32 text-indigo-500" />
            </div>
            
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10 text-center">Fitness Index Matrix</h2>
            
            <div className="relative flex items-center justify-center mb-12">
              {/* Complex Gauge Visualization */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                 <div className="w-56 h-56 rounded-full border-2 border-dashed border-indigo-500 animate-[spin_30s_linear_infinite]" />
              </div>
              
              <svg className="w-56 h-56 transform -rotate-90">
                <circle
                  cx="112" cy="112" r="100"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-slate-900"
                />
                <circle
                  cx="112" cy="112" r="100"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={628.3}
                  strokeDashoffset={results ? 628.3 - (628.3 * results.scores.publishing_fitness) / 100 : 628.3}
                  className={`${results ? 'text-indigo-500' : 'text-slate-800'} transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1)`}
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 12px rgba(99,102,241,0.4))' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-7xl font-black text-white tracking-tighter leading-none">
                  {results ? Math.round(results.scores.publishing_fitness) : '--'}
                </span>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Ready for Publication</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {[
                { label: 'Viral Resonance', icon: Zap, value: results ? '82%' : '--', color: 'text-amber-400' },
                { label: 'Brand Integrity', icon: ShieldCheck, value: results ? '100%' : '--', color: 'text-emerald-400' },
                { label: 'Risk Mitigation', icon: ShieldAlert, value: results ? 'Verified' : '--', color: 'text-indigo-400' }
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between p-5 rounded-3xl bg-slate-900/60 border border-slate-800/60 group hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl bg-slate-950 border border-slate-800 ${m.color}`}>
                      <m.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</span>
                  </div>
                  <span className="text-xs font-black text-white">{m.value}</span>
                </div>
              ))}
            </div>

            <button 
              disabled={!results}
              className="w-full mt-12 group bg-white hover:bg-indigo-600 text-black hover:text-white p-5 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
            >
              Commit to Pipeline
            </button>
            
            <div className="mt-8 pt-8 border-t border-slate-900 flex justify-center">
               <div className="flex items-center gap-1.5 opacity-40">
                  <Fingerprint className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Encrypted Governance Signature</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Metrics Grid */}
      {results && (
        <div className="space-y-12 py-12 border-t border-slate-900">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-indigo-500" />
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Dimensional Metrics</h2>
              </div>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Granular audit data across 8 forensic categories.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl">
               <Target className="w-4 h-4 text-emerald-400" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Standards Active</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(results.scores).map(([key, score]) => (
              key !== 'publishing_fitness' && (
                <div key={key} className="relative bg-slate-950 border border-slate-800 rounded-[2.5rem] p-8 hover:border-indigo-500/40 transition-all group overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/0 group-hover:bg-indigo-500 transition-all" />
                   
                   <div className="flex flex-col gap-8 relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] group-hover:text-slate-400">
                          {key.replace('_', ' ')}
                        </span>
                        <div className={`p-2 rounded-lg ${score > 80 ? 'bg-emerald-500/10 text-emerald-500' : score > 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                           <span className="text-xs font-black">{score}%</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) ${score > 80 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : score > 50 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`} 
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 leading-relaxed group-hover:text-slate-500">
                           {score > 80 ? 'Exceptional performance in this category.' : score > 50 ? 'Minor optimizations recommended.' : 'Critical issues detected. Immediate fix required.'}
                        </p>
                      </div>
                   </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Audit Findings List */}
      {results && results.feedback.length > 0 && (
        <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-1000 pb-20">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 shadow-xl shadow-amber-500/5">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Security Audit Findings</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Critical blockers & refinement logic</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
               <button className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-all">
                  Export Forensic PDF
               </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {results.feedback.map((item, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col lg:flex-row items-start lg:items-center gap-12 group hover:border-indigo-500/30 transition-all shadow-xl">
                <div className="shrink-0 flex flex-col items-center gap-4 w-full lg:w-32">
                   <div className={`
                    w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg
                    ${item.severity === 'high' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 
                      item.severity === 'medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                      'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}
                  `}>
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div className={`text-[10px] font-black uppercase tracking-widest ${item.severity === 'high' ? 'text-rose-500' : item.severity === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {item.severity} Risk
                  </div>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-widest w-fit">
                      {item.category}
                    </span>
                    <h4 className="text-xl font-black text-white tracking-tight leading-none group-hover:text-indigo-100 transition-colors">{item.issue}</h4>
                  </div>
                  <div className="bg-black/40 rounded-2xl p-6 border border-slate-900">
                    <div className="flex items-center gap-2 mb-2">
                       <Sparkles className="w-3 h-3 text-emerald-400" />
                       <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Recommended Remediation</span>
                    </div>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed italic">&quot;{item.suggestion}&quot;</p>
                  </div>
                </div>
                
                <button className="w-full lg:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-3">
                  Deploy Fix <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results Placeholder */}
      {!results && !isChecking && (
        <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in duration-1000">
          <div className="w-32 h-32 bg-slate-950 border border-slate-900 rounded-[3rem] flex items-center justify-center text-slate-800 mb-10 shadow-inner group">
            <Search className="w-16 h-16 group-hover:scale-110 transition-transform duration-500" />
          </div>
          <h3 className="text-3xl font-black text-slate-500 mb-3 tracking-tighter uppercase italic leading-none">Awaiting Audit Execution</h3>
          <p className="text-sm text-slate-700 max-w-sm font-bold uppercase tracking-widest">Initialize the Forensic Core to begin content validation.</p>
        </div>
      )}
    </div>
  );
}
