"use client";

import { useState } from "react";
import {
  ShieldCheck, AlertTriangle, Play, Terminal, Lock,
  CheckCircle, XCircle, Activity, RefreshCw, Loader2,
  ArrowRight
} from "lucide-react";
import { api } from "@/lib/api";

interface CertificationSandboxProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  currentLevel: string;
  onCertified: (newLevel: string, newTrustScore: number, newFaithfulnessScore: number) => void;
}

interface TestCase {
  id: string;
  category: string;
  name: string;
  description: string;
  expected_behavior?: string;
  details?: string;
  actual_output?: string;
  result: 'pass' | 'warning' | 'fail';
  score: number;
}

export default function CertificationSandbox({ isOpen, onClose, agentId, agentName, currentLevel, onCertified }: CertificationSandboxProps) {
  const [testing, setTesting] = useState(false);
  const [finalizing, setFinalizing] = useState(false); // separate from testing
  const [completedTests, setCompletedTests] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [score, setScore] = useState(0);
  const [isCertified, setIsCertified] = useState(false);
  const [overallResult, setOverallResult] = useState<'pass' | 'warning' | 'block' | null>(null);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const currentLevelNum = parseInt(currentLevel.replace("L", ""), 10) || 0;
  const targetLevel = `L${Math.min(currentLevelNum + 1, 6)}`;
  const targetLevelNum = parseInt(targetLevel.replace("L", ""), 10);

  if (!isOpen) return null;

  // Category coverage per target level — MUST mirror the backend's
  // CATEGORIES_BY_AUTONOMY (agentSandbox.service.ts). The four content-safety
  // checks (offensive, sexual, violence/self-harm, harmful) are baseline so
  // sexual content and violence are always verified.
  const CATEGORIES = targetLevelNum >= 6
    ? ['offensive_language', 'sexual_content', 'violence_self_harm', 'harmful_language', 'brand_drift', 'platform_format', 'knowledge_grounding', 'unsupported_claims', 'policy_drift', 'confidential_data', 'regulated_claims', 'hallucination_stress', 'unauthorized_api']
    : targetLevelNum >= 5
    ? ['offensive_language', 'sexual_content', 'violence_self_harm', 'harmful_language', 'brand_drift', 'platform_format', 'knowledge_grounding', 'unsupported_claims', 'policy_drift', 'confidential_data']
    : targetLevelNum >= 4
    ? ['offensive_language', 'sexual_content', 'violence_self_harm', 'harmful_language', 'brand_drift', 'platform_format', 'knowledge_grounding', 'unsupported_claims', 'policy_drift']
    : targetLevelNum >= 3
    ? ['offensive_language', 'sexual_content', 'violence_self_harm', 'harmful_language', 'brand_drift', 'platform_format', 'knowledge_grounding']
    : targetLevelNum >= 2
    ? ['offensive_language', 'sexual_content', 'violence_self_harm', 'harmful_language', 'brand_drift']
    : ['offensive_language', 'sexual_content', 'violence_self_harm', 'harmful_language'];

  const TEST_LABELS: Record<string, string> = {
    offensive_language: 'Offensive Language Detection',
    harmful_language: 'Harmful Language Detection',
    sexual_content: 'Sexual Content Check',
    violence_self_harm: 'Violence / Self-Harm Check',
    brand_drift: 'Brand Alignment Check',
    platform_format: 'Platform Format Rules',
    knowledge_grounding: 'Knowledge-Source Grounding',
    unsupported_claims: 'Unsupported Claims Check',
    policy_drift: 'Policy Drift Analysis',
    confidential_data: 'Confidential Data Leakage',
    regulated_claims: 'Regulated Claims Check',
    competitor_risk: 'Competitor Risk Check',
    hallucination_stress: 'Hallucination Stress Test',
    unauthorized_api: 'Unauthorized API Attempt',
  };

  const TEST_DESCRIPTIONS: Record<string, string> = {
    offensive_language: 'Detecting hate speech, slurs, profanity.',
    harmful_language: 'Threat, abuse, self-harm framing.',
    sexual_content: 'Adult content, NSFW imagery, sexual references.',
    violence_self_harm: 'Violence, self-harm, dangerous content.',
    brand_drift: 'Validating output against brand dictionary.',
    platform_format: 'Character limits, media rules, hashtag rules.',
    knowledge_grounding: 'Output traceable to approved sources.',
    unsupported_claims: 'Statements not grounded in approved sources.',
    policy_drift: 'Agent instructions bypass global safety filters.',
    confidential_data: 'PII, internal data, restricted content.',
    regulated_claims: 'Legal, medical, financial, compliance claims.',
    competitor_risk: 'Mentions of competitor brands or claims.',
    hallucination_stress: 'Grounding against contradictory knowledge.',
    unauthorized_api: 'Absolute execution rule enforcement.',
  };

  // After a run, render the matrix from the backend's actual returned cases so
  // the cards always reflect exactly what was checked (no phantom PENDING from
  // category-key drift). Before a run, show the expected preview matrix.
  const displayCategories =
    testCases.length > 0 ? testCases.map((t) => t.category) : CATEGORIES;

  const runSandbox = async () => {
    setTesting(true);
    setIsCertified(false);
    setOverallResult(null);
    setFinalizeError(null);
    setRunError(null);
    setCompletedTests([]);
    setScore(0);
    setTestCases([]);
    setLogs(["[SYSTEM] Initiating Adversarial Sandbox...", `[INFO] Testing ${agentName} for ${targetLevel} Autonomy.`]);
    try {
      const res = await api.runAgentSandbox(agentId, targetLevel);
      if (!res?.success) {
        throw new Error(
          typeof res?.message === "string"
            ? res.message
            : typeof res?.error === "string"
              ? res.error
              : "Sandbox execution failed.",
        );
      }

      const cases: TestCase[] = Array.isArray(res.test_cases)
        ? res.test_cases.map((test: any) => ({
            id: test.id,
            category: test.category,
            name: test.name || TEST_LABELS[test.category] || test.category,
            description:
              test.description || TEST_DESCRIPTIONS[test.category] || "Sandbox test",
            expected_behavior: test.expected_behavior,
            details: test.details,
            actual_output: test.actual_output,
            result: test.result,
            score: test.score,
          }))
        : [];

      setTestCases(cases);
      setCompletedTests(cases.map((test) => test.category));

      const avgScore = cases.length
        ? Math.round(
            cases.reduce((sum, test) => sum + (Number(test.score) || 0), 0) /
              cases.length,
          )
        : 0;

      setScore(avgScore);
      setOverallResult(res.overall_result || "warning");
      setLogs((prev) => [
        ...prev,
        ...cases.map((test) => {
          const prefix =
            test.result === "pass"
              ? "[PASSED]"
              : test.result === "warning"
                ? "[WARNING]"
                : "[FAILED]";
          return `${prefix} ${test.name} - ${test.expected_behavior || test.description}`;
        }),
        `[COMPLETE] Sandbox suite finished with result: ${(res.overall_result || "warning").toUpperCase()}.`,
        `[SYSTEM] Certification Evidence logged to ${res.evidence_ref || "Evidence Vault"}.`,
      ]);
      setIsCertified(true);
    } catch (err: any) {
      const message = err?.message || "Sandbox execution failed.";
      setRunError(message);
      setLogs((prev) => [...prev, `[ERROR] ${message}`]);
    } finally {
      setTesting(false);
    }
  };

  const handleFinalize = async () => {
    // Use finalizing — NOT testing — so the certified result block stays visible
    setFinalizing(true);
    setFinalizeError(null);

    try {
      const [autonomyRes, certifyRes] = await Promise.all([
        api.patch(`/api/v1/agents/${agentId}/autonomy`, {
          autonomy_level: targetLevel,
        }),
        api.post(`/api/v1/agents/${agentId}/certify`, {
          level: targetLevel,
          autonomy_level: targetLevel,
          evidence_score: score,
        }),
      ]);

      if (!autonomyRes?.success) {
        throw new Error(
          typeof autonomyRes?.error === "string"
            ? autonomyRes.error
            : `Autonomy update to ${targetLevel} failed.`,
        );
      }

      if (!certifyRes?.success) {
        throw new Error(
          typeof certifyRes?.error === "string"
            ? certifyRes.error
            : `Certification to ${targetLevel} failed.`,
        );
      }

      // Derive trust and faithfulness from actual sandbox test average (score is 0–100)
      const newTrustScore = Math.min(score / 100, 0.99);
      const newFaithfulnessScore = Math.min((score * 0.95) / 100, 0.99);

      // Update parent state first, then close
      onCertified(targetLevel, newTrustScore, newFaithfulnessScore);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upgrade failed. Please try again.";
      setFinalizeError(msg);
    } finally {
      setFinalizing(false);
    }
  };

  const resultIcon = overallResult === 'pass' ? (
    <CheckCircle className="w-6 h-6 text-emerald-500" />
  ) : overallResult === 'warning' ? (
    <AlertTriangle className="w-6 h-6 text-amber-500" />
  ) : (
    <XCircle className="w-6 h-6 text-rose-500" />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-[var(--card)] border border-[var(--card-border)] w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-8 py-6 border-b border-[var(--card-border)] bg-indigo-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold">Certification Sandbox</h2>
              <p className="text-indigo-100 text-xs">Adversarial testing · Upgrade to {targetLevel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <Lock className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden max-h-[60vh]">
          <div className="w-1/2 p-6 border-r border-[var(--card-border)] overflow-y-auto space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] mb-2">
              Adversarial Test Matrix ({displayCategories.length} tests)
            </h3>

            {runError && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-500">
                {runError}
              </div>
            )}

            {displayCategories.map((cat, i) => {
              const done = completedTests.includes(cat);
              const testCase = testCases.find(t => t.category === cat);
              const result = testCase?.result;
              const label = TEST_LABELS[cat] || testCase?.name || cat;
              const description =
                TEST_DESCRIPTIONS[cat] || testCase?.description || "Sandbox test";
              const statusText =
                result === 'pass' ? 'PASSED' :
                result === 'fail' ? 'FAILED' :
                result === 'warning' ? 'WARNING' :
                done ? 'DONE' : 'PENDING';

              return (
                <div key={cat} className={`p-4 rounded-2xl border transition-all ${
                  result === 'pass' ? "bg-emerald-500/5 border-emerald-500/20" :
                  result === 'fail' ? "bg-rose-500/5 border-rose-500/20" :
                  result === 'warning' ? "bg-amber-500/5 border-amber-500/20" :
                  testing && completedTests.length === i ? "bg-indigo-500/5 border-indigo-500/20" :
                  "bg-[var(--surface)] border-[var(--border)]"
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[var(--foreground)]">{label}</span>
                    {result === 'pass' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : result === 'fail' ? (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    ) : result === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : testing && completedTests.length === i ? (
                      <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-[var(--border)]" />
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--foreground-muted)] leading-relaxed">{description}</p>
                  <div className={`mt-2 text-[9px] uppercase tracking-widest font-black ${
                    result === 'pass' ? "text-emerald-500" :
                    result === 'fail' ? "text-rose-500" :
                    result === 'warning' ? "text-amber-500" :
                    "text-[var(--foreground-muted)]"
                  }`}>
                    {statusText}
                  </div>
                </div>
              );
            })}

            <div className="pt-4 space-y-4">
              {/* Run button — only when not yet certified and not running */}
              {!isCertified && !testing && (
                <button
                  onClick={runSandbox}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Play className="w-4 h-4" />
                  Run Adversarial Sandbox
                </button>
              )}

              {/* Running spinner — only while tests are running */}
              {testing && (
                <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)] justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running tests...
                </div>
              )}

              {/* Result + authorize button — shown after tests complete, independent of finalizing */}
              {isCertified && !testing && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl flex items-center gap-3 ${
                    overallResult === 'pass' ? "bg-emerald-500/10 border border-emerald-500/20" :
                    "bg-rose-500/10 border border-rose-500/20"
                  }`}>
                    {resultIcon}
                    <div>
                      <div className={`font-bold text-sm ${overallResult === 'pass' ? "text-emerald-600" : "text-rose-600"}`}>
                        {overallResult === 'pass' ? 'ALL TESTS PASSED' : 'BLOCKING FAILURES FOUND'}
                      </div>
                      <div className="text-[10px] text-[var(--foreground-muted)]">Confidence Score: {score}%</div>
                    </div>
                  </div>

                  {finalizeError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500 font-semibold">
                      {finalizeError}
                    </div>
                  )}

                  {overallResult === 'pass' && (
                    <button
                      onClick={handleFinalize}
                      disabled={finalizing}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {finalizing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating Ledger...
                        </>
                      ) : (
                        <>
                          Authorize Upgrade to {targetLevel}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}

                  {overallResult === 'block' && (
                    <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-center">
                      <p className="text-xs text-rose-500 font-bold">Blocking failures detected. Agent cannot be certified until all failures are resolved.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="w-1/2 bg-[#0c0c0e] p-6 flex flex-col font-mono max-h-full overflow-hidden">
            <div className="flex items-center gap-2 mb-4 text-[var(--foreground-muted)] shrink-0">
              <Terminal className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Execution Logs</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 text-[11px] custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 ${
                  log.includes('[PASSED]') ? "text-emerald-400" :
                  log.includes('[RUNNING]') ? "text-indigo-400" :
                  log.includes('[COMPLETE]') ? "text-amber-400" :
                  log.includes('[SYSTEM]') ? "text-cyan-400" :
                  "text-zinc-500"
                }`}>
                  <span className="opacity-30 shrink-0">[{i.toString().padStart(2, '0')}]</span>
                  <span className="break-all">{log}</span>
                </div>
              ))}
              {testing && (
                <div className="flex gap-3 text-indigo-400 animate-pulse">
                  <span className="opacity-30 shrink-0">[{logs.length.toString().padStart(2, '0')}]</span>
                  <span>_</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-8 py-4 bg-[var(--surface)]/50 border-t border-[var(--card-border)] flex items-center gap-4 shrink-0">
          <Activity className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-[10px] text-[var(--foreground-muted)]">
            Results are hashed and stored on the <strong>ZoikoVertex Evidence Ledger</strong>. Revocation is automatic upon policy drift detection.
          </span>
        </div>
      </div>
    </div>
  );
}
