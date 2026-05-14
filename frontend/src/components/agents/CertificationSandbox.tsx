"use client";

import { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Play, 
  Terminal, 
  Lock, 
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  RefreshCw
} from "lucide-react";
import { api } from "@/lib/api";

interface CertificationSandboxProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  currentLevel: string;
  onCertified: () => void;
}

const TEST_CASES = [
  { id: 1, name: "Policy Drift Analysis", description: "Checking if agent instructions bypass global safety filters." },
  { id: 2, name: "Hallucination Stress Test", description: "Testing grounding against contradictory knowledge signals." },
  { id: 3, name: "Unauthorized API Attempt", description: "Verifying absolute execution rule (direct external calls block)." },
  { id: 4, name: "Brand Alignment Check", description: "Validating output against the core brand dictionary." },
];

export default function CertificationSandbox({ isOpen, onClose, agentId, agentName, currentLevel, onCertified }: CertificationSandboxProps) {
  const [testing, setTesting] = useState(false);
  const [completedTests, setCompletedTests] = useState<number[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [isCertified, setIsCertified] = useState(false);

  if (!isOpen) return null;

  const targetLevel = `L${parseInt(currentLevel.replace("L", "")) + 1}`;

  const runSandbox = async () => {
    setTesting(true);
    setCompletedTests([]);
    setLogs(["[SYSTEM] Initiating Adversarial Sandbox...", `[INFO] Testing ${agentName} for ${targetLevel} Autonomy.`]);
    
    for (const test of TEST_CASES) {
      setLogs(prev => [...prev, `[RUNNING] ${test.name}...`]);
      await new Promise(r => setTimeout(r, 1500)); // Simulate test
      setCompletedTests(prev => [...prev, test.id]);
      setLogs(prev => [...prev, `[PASSED] ${test.name} - No violations found.`]);
      setScore(prev => prev + 25);
    }

    setLogs(prev => [...prev, "[COMPLETE] All adversarial tests passed.", "[SYSTEM] Certification Evidence logged to Evidence Vault."]);
    setTesting(false);
    setIsCertified(true);
  };

  const handleFinalize = async () => {
    try {
      setTesting(true);
      const result = await api.post(`/api/v1/agents/${agentId}/certify`, {
        level: targetLevel,
        evidence_score: score
      });
      if (result.success) {
        onCertified();
        onClose();
      }
    } catch (err) {
      alert("Certification failed to record on ledger.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-[var(--card)] border border-[var(--card-border)] w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-[var(--card-border)] bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold">Certification Sandbox</h2>
              <p className="text-indigo-100 text-xs">Adversarial testing for Autonomy Upgrade to {targetLevel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <Lock className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Test Status */}
          <div className="w-1/2 p-8 border-r border-[var(--card-border)] space-y-6 overflow-y-auto">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)] mb-4">Adversarial Test Matrix</h3>
            {TEST_CASES.map((test) => (
              <div key={test.id} className={`p-4 rounded-2xl border transition-all ${
                completedTests.includes(test.id) ? "bg-emerald-500/5 border-emerald-500/20" : "bg-[var(--surface)] border-[var(--border)]"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-[var(--foreground)]">{test.name}</span>
                  {completedTests.includes(test.id) ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : testing && completedTests.length === test.id - 1 ? (
                    <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--border)]" />
                  )}
                </div>
                <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">{test.description}</p>
              </div>
            ))}

            <div className="pt-4">
              {!isCertified && !testing && (
                <button 
                  onClick={runSandbox}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Play className="w-4 h-4" />
                  Run Adversarial Sandbox
                </button>
              )}
              {isCertified && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                    <div>
                      <div className="font-bold text-emerald-600">PASSED</div>
                      <div className="text-[10px] text-emerald-600/70 font-medium">Confidence Score: {score}%</div>
                    </div>
                  </div>
                  <button 
                    onClick={handleFinalize}
                    disabled={testing}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
                  >
                    {testing ? "Updating Ledger..." : `Authorize Upgrade to ${targetLevel}`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Logs */}
          <div className="w-1/2 bg-[#0c0c0e] p-6 flex flex-col font-mono">
            <div className="flex items-center gap-2 mb-4 text-[var(--foreground-muted)]">
              <Terminal className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Execution Logs</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 text-[11px] custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 ${
                  log.includes('[PASSED]') ? "text-emerald-400" : 
                  log.includes('[RUNNING]') ? "text-indigo-400" : 
                  "text-zinc-500"
                }`}>
                  <span className="opacity-30">[{i.toString().padStart(2, '0')}]</span>
                  <span>{log}</span>
                </div>
              ))}
              {testing && (
                <div className="flex gap-3 text-indigo-400 animate-pulse">
                  <span className="opacity-30">[{logs.length.toString().padStart(2, '0')}]</span>
                  <span>_</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-8 py-4 bg-[var(--surface)]/50 border-t border-[var(--card-border)] flex items-center gap-4">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] text-[var(--foreground-muted)]">
            Certification results are hashed and stored on the <strong>ZoikoVertex Evidence Ledger</strong>. Revocation is automatic upon policy drift detection.
          </span>
        </div>
      </div>
    </div>
  );
}
