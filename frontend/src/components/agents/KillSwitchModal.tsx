"use client";

import { useState } from "react";
import { 
  AlertOctagon, 
  ShieldAlert, 
  ZapOff, 
  X, 
  CheckCircle,
  AlertTriangle,
  Lock,
  Loader2
} from "lucide-react";

interface KillSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
}

export default function KillSwitchModal({ isOpen, onClose, onActivated }: KillSwitchModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");

  if (!isOpen) return null;

  const handleActivate = async () => {
    setLoading(true);
    // Simulate emergency suspension
    await new Promise(r => setTimeout(r, 2000));
    setLoading(false);
    setStep(3);
    onActivated();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-rose-950/40 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[var(--card)] border-2 border-rose-500/50 w-full max-w-md rounded-[2.5rem] shadow-[0_0_50px_rgba(244,63,94,0.3)] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-8 bg-rose-500 text-white text-center space-y-2">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2 animate-pulse">
            <ZapOff className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">Emergency Kill Switch</h2>
          <p className="text-rose-100 text-xs font-medium uppercase tracking-widest">Protocol 99 — Full Fleet Suspension</p>
        </div>

        <div className="p-8 space-y-6">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex gap-4">
                <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
                <p className="text-xs text-rose-600 font-medium leading-relaxed">
                  Activating the Kill Switch will immediately suspend execution for <strong>all agents</strong> across all workspaces. This action is logged and reported to the Board of Directors.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-rose-500">Authorization Code</label>
                <input 
                  type="text" 
                  className="w-full bg-rose-500/5 border-2 border-rose-500/20 rounded-2xl py-4 px-6 text-center text-xl font-black tracking-[0.5em] text-rose-600 outline-none focus:border-rose-500 transition-all placeholder:text-rose-200"
                  placeholder="SUSPEND"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                />
              </div>
              <button 
                onClick={() => setStep(2)}
                disabled={confirmationCode !== "SUSPEND"}
                className="w-full py-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-600/30"
              >
                INITIALIZE SUSPENSION
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
              <div>
                <h3 className="font-bold text-lg">Broadcasting Suspension...</h3>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">Disconnecting agent execution kernels and freezing state machines.</p>
              </div>
              <div className="flex flex-col gap-2">
                {['Halting Social Agents...', 'Freezing Research Pipelines...', 'Locking Model API Keys...'].map((task, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-[var(--foreground-muted)]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {task}
                  </div>
                ))}
              </div>
              <button 
                onClick={handleActivate}
                className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest animate-pulse"
              >
                CONFIRM FINAL HALT
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-emerald-600">Fleet Suspended</h3>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">All agents are now in <strong>OFFLINE</strong> mode. Manual override required for restoration.</p>
              </div>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl font-black uppercase tracking-widest"
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-[var(--surface)] border-t border-[var(--card-border)] flex items-center justify-center gap-2">
          <Lock className="w-3 h-3 text-[var(--foreground-muted)]" />
          <span className="text-[9px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">Enterprise Security Protocol Active</span>
        </div>
      </div>
    </div>
  );
}
