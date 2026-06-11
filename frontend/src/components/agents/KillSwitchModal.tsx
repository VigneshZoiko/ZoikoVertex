// "use client";

// import { useState } from "react";
// import { 
//   AlertOctagon, 
//   ShieldAlert, 
//   ZapOff, 
//   X, 
//   CheckCircle,
//   AlertTriangle,
//   Lock,
//   Loader2
// } from "lucide-react";

// interface KillSwitchModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onActivated: () => void;
// }

// export default function KillSwitchModal({ isOpen, onClose, onActivated }: KillSwitchModalProps) {
//   const [step, setStep] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [confirmationCode, setConfirmationCode] = useState("");

//   if (!isOpen) return null;

//   const handleActivate = async () => {
//     setLoading(true);
//     // Simulate emergency suspension
//     await new Promise(r => setTimeout(r, 2000));
//     setLoading(false);
//     setStep(3);
//     onActivated();
//   };

//   return (
//     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-rose-950/40 backdrop-blur-xl animate-in fade-in duration-300">
//       <div className="bg-[var(--card)] border-2 border-rose-500/50 w-full max-w-md rounded-[2.5rem] shadow-[0_0_50px_rgba(244,63,94,0.3)] overflow-hidden flex flex-col">
        
//         {/* Header */}
//         <div className="p-8 bg-rose-500 text-foreground text-center space-y-2">
//           <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2 animate-pulse">
//             <ZapOff className="w-8 h-8" />
//           </div>
//           <h2 className="text-2xl font-black uppercase tracking-tighter">Emergency Kill Switch</h2>
//           <p className="text-rose-100 text-xs font-medium uppercase tracking-widest">Protocol 99 — Full Fleet Suspension</p>
//         </div>

//         <div className="p-8 space-y-6">
//           {step === 1 && (
//             <div className="space-y-6 animate-in slide-in-from-bottom-4">
//               <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex gap-4">
//                 <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
//                 <p className="text-xs text-rose-600 font-medium leading-relaxed">
//                   Activating the Kill Switch will immediately suspend execution for <strong>all agents</strong> across all workspaces. This action is logged and reported to the Board of Directors.
//                 </p>
//               </div>
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black uppercase tracking-widest text-rose-500">Authorization Code</label>
//                 <input 
//                   type="text" 
//                   className="w-full bg-rose-500/5 border-2 border-rose-500/20 rounded-2xl py-4 px-6 text-center text-xl font-black tracking-[0.5em] text-rose-600 outline-none focus:border-rose-500 transition-all placeholder:text-rose-200"
//                   placeholder="SUSPEND"
//                   value={confirmationCode}
//                   onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
//                 />
//               </div>
//               <button 
//                 onClick={() => setStep(2)}
//                 disabled={confirmationCode !== "SUSPEND"}
//                 className="w-full py-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 text-foreground rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-600/30"
//               >
//                 INITIALIZE SUSPENSION
//               </button>
//             </div>
//           )}

//           {step === 2 && (
//             <div className="space-y-6 text-center animate-in zoom-in-95">
//               <div className="w-20 h-20 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
//               <div>
//                 <h3 className="font-bold text-lg">Broadcasting Suspension...</h3>
//                 <p className="text-xs text-[var(--foreground-muted)] mt-1">Disconnecting agent execution kernels and freezing state machines.</p>
//               </div>
//               <div className="flex flex-col gap-2">
//                 {['Halting Social Agents...', 'Freezing Research Pipelines...', 'Locking Model API Keys...'].map((task, i) => (
//                   <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-[var(--foreground-muted)]">
//                     <Loader2 className="w-3 h-3 animate-spin" />
//                     {task}
//                   </div>
//                 ))}
//               </div>
//               <button 
//                 onClick={handleActivate}
//                 className="w-full py-4 bg-rose-600 text-foreground rounded-2xl font-black uppercase tracking-widest animate-pulse"
//               >
//                 CONFIRM FINAL HALT
//               </button>
//             </div>
//           )}

//           {step === 3 && (
//             <div className="space-y-6 text-center animate-in zoom-in-95">
//               <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
//                 <CheckCircle className="w-10 h-10" />
//               </div>
//               <div>
//                 <h3 className="font-bold text-lg text-emerald-600">Fleet Suspended</h3>
//                 <p className="text-xs text-[var(--foreground-muted)] mt-1">All agents are now in <strong>OFFLINE</strong> mode. Manual override required for restoration.</p>
//               </div>
//               <button 
//                 onClick={onClose}
//                 className="w-full py-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl font-black uppercase tracking-widest"
//               >
//                 RETURN TO DASHBOARD
//               </button>
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="p-6 bg-[var(--surface)] border-t border-[var(--card-border)] flex items-center justify-center gap-2">
//           <Lock className="w-3 h-3 text-[var(--foreground-muted)]" />
//           <span className="text-[9px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">Enterprise Security Protocol Active</span>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import {
  ZapOff,
  CheckCircle,
  AlertTriangle,
  Lock,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";

interface KillSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
}

const SUSPENSION_TASKS = [
  "Halting Content Agents...",
  "Freezing Research Pipelines...",
  "Suspending Optimization Agents...",
  "Locking Governance Agents...",
  "Broadcasting workspace-wide SUSPENDED status...",
  "Notifying Agent Architects and Governance Admins...",
];

export default function KillSwitchModal({
  isOpen,
  onClose,
  onActivated,
}: KillSwitchModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInitialize = () => {
    setError(null);
    setStep(2);
    simulateSuspension();
  };

  const simulateSuspension = async () => {
    setLoading(true);
    for (let i = 0; i < SUSPENSION_TASKS.length; i++) {
      await new Promise((r) => setTimeout(r, 420));
      setCompletedTasks(i + 1);
    }
    setLoading(false);
  };

  const handleConfirmHalt = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/v1/governance/risk/emergency-pause", {
        scope: "workspace",
        reason: reason.trim(),
      });
      if (!res?.success) {
        throw new Error(
          typeof res?.error === "string"
            ? res.error
            : "Emergency suspension failed.",
        );
      }
      setStep(3);
      onActivated();
    } catch (err: any) {
      setError(err?.message || "Emergency suspension failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setReason("");
    setCompletedTasks(0);
    setLoading(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-error-bg/40 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[var(--card)] border-2 border-error-border w-full max-w-md rounded-[2.5rem] shadow-[0_0_60px_rgba(244,63,94,0.25)] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-8 bg-gradient-to-br from-error-text to-error-text text-foreground text-center space-y-2">
          <div className="w-16 h-16 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <ZapOff className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">Global Kill Switch</h2>
          <p className="text-error-text text-[10px] font-bold uppercase tracking-[0.28em]">
            Protocol 99 — Workspace-Wide Agent Suspension
          </p>
        </div>

        <div className="p-8 space-y-6">

          {/* STEP 1 — Reason + Confirmation */}
          {step === 1 && (
            <div className="space-y-5 animate-in slide-in-from-bottom-4">
              <div className="p-4 bg-error-bg border border-error-border rounded-2xl flex gap-3">
                <AlertTriangle className="w-5 h-5 text-error-text shrink-0 mt-0.5" />
                <div className="text-xs text-error-text font-medium leading-relaxed space-y-1">
                  <p>
                    Activating the Kill Switch will <strong>immediately suspend ALL active agents</strong> across
                    this workspace. All in-progress workflows will halt.
                  </p>
                  <p>
                    This action is logged to the Evidence Vault and reported to all Agent Architects and
                    Governance Admins. Agents must be manually restored per-agent via the Autonomy Control Center.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.28em] text-error-text">
                  Reason for Emergency Suspension <span className="text-error-text">(required)</span>
                </label>
                <textarea
                  className="w-full bg-error-bg border-2 border-error-border rounded-2xl py-3 px-4 text-sm font-medium text-error-text placeholder:text-error-text outline-none focus:border-error-border transition-all resize-none"
                  placeholder="Describe the reason for suspending all agents (e.g. brand safety incident, security alert, legal hold)..."
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.28em] text-error-text">
                  Authorization — Type <span className="font-black">SUSPEND</span> to confirm
                </label>
                <SuspendInput onValid={handleInitialize} disabled={reason.trim().length < 10} />
              </div>

              <p className="text-[10px] text-error-text text-center font-medium">
                Minimum 10 characters required for the suspension reason before authorization is accepted.
              </p>
            </div>
          )}

          {/* STEP 2 — Broadcasting Suspension */}
          {step === 2 && (
            <div className="space-y-6 animate-in zoom-in-95">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 border-4 border-error-border border-t-error-text rounded-full animate-spin mx-auto" />
                <div>
                  <h3 className="font-bold text-lg text-[var(--foreground)]">Broadcasting Suspension...</h3>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">
                    Disconnecting agent execution kernels and freezing all state machines.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-2.5">
                {SUSPENSION_TASKS.map((task, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2.5 text-xs font-semibold transition-all duration-300 ${
                      i < completedTasks
                        ? "text-success-text"
                        : i === completedTasks
                        ? "text-error-text"
                        : "text-[var(--foreground-muted)] opacity-40"
                    }`}
                  >
                    {i < completedTasks ? (
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    ) : i === completedTasks ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-current shrink-0" />
                    )}
                    {task}
                  </div>
                ))}
              </div>

              {!loading && completedTasks >= SUSPENSION_TASKS.length && (
                <div className="space-y-3">
                  {error && (
                    <div className="rounded-2xl border border-error-border bg-error-bg px-4 py-3 text-xs font-medium text-error-text">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleConfirmHalt}
                    disabled={loading}
                    className="w-full py-4 bg-error-text hover:brightness-110 disabled:opacity-60 text-foreground rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-error-bg/20 animate-pulse"
                  >
                    {loading ? "APPLYING EMERGENCY PAUSE..." : "CONFIRM FINAL HALT"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Confirmed */}
          {step === 3 && (
            <div className="space-y-6 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-success-bg border border-success-border rounded-full flex items-center justify-center text-success-text mx-auto">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-success-text">Fleet Suspended</h3>
                <p className="text-xs text-[var(--foreground-muted)] mt-2 leading-relaxed">
                  All agents are now in <strong className="text-[var(--foreground)]">SUSPENDED</strong> mode.
                  This event has been recorded in the Evidence Vault. Agent Architects and Governance Admins have been notified.
                </p>
                <p className="text-xs text-warning-text mt-2 font-medium">
                  Manual restoration required per-agent via the Autonomy Control Center.
                </p>
              </div>

              <div className="p-3 bg-[var(--background)] rounded-2xl border border-[var(--border)] text-left">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground-muted)] mb-1.5">Recorded Reason</div>
                <p className="text-xs text-[var(--foreground)] font-medium">{reason}</p>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-4 bg-[var(--surface)] border border-[var(--border)] hover:border-error-border rounded-2xl font-black uppercase tracking-widest text-[var(--foreground)] transition-all"
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-[var(--surface)] border-t border-[var(--card-border)] flex items-center justify-center gap-2">
          <Lock className="w-3 h-3 text-[var(--foreground-muted)]" />
          <span className="text-[9px] font-bold text-[var(--foreground-muted)] uppercase tracking-[0.28em]">
            Enterprise Security Protocol — Evidence Vault Active
          </span>
        </div>
      </div>
    </div>
  );
}

// Sub-component: typed "SUSPEND" gating button
function SuspendInput({
  onValid,
  disabled,
}: {
  onValid: () => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const isMatch = value === "SUSPEND";

  return (
    <div className="space-y-3">
      <input
        type="text"
        className="w-full bg-error-bg border-2 border-error-border rounded-2xl py-4 px-6 text-center text-xl font-black tracking-[0.5em] text-error-text outline-none focus:border-error-border transition-all placeholder:text-error-text placeholder:tracking-normal"
        placeholder="SUSPEND"
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
      />
      <button
        onClick={onValid}
        disabled={!isMatch || disabled}
        className="w-full py-4 bg-error-text hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed text-foreground rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-error-bg/20"
      >
        {disabled ? "Enter suspension reason first" : !isMatch ? "Type SUSPEND to unlock" : "INITIALIZE SUSPENSION"}
      </button>
    </div>
  );
}
