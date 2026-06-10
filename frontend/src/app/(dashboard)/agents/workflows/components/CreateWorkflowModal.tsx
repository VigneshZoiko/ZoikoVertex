"use client";

import React, { useState } from "react";
import { X, GitBranch, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

// Per Workflows Document §6.2 (Create Wizard) and §10 (Workflow Template data model).
// Captures the required identity + scope fields needed to spawn a Draft workflow template.

interface CreateWorkflowModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (workflowId: string) => void;
}

const RISK_LEVELS = [
  { value: "low",      label: "Low",      desc: "Tier 1 — owner approval only" },
  { value: "medium",   label: "Medium",   desc: "Tier 2 — owner + brand reviewer" },
  { value: "high",     label: "High",     desc: "Tier 3 — owner + brand + compliance" },
  { value: "critical", label: "Critical", desc: "Tier 4 — three-key approval, executive sign-off" },
];

const WORKFLOW_TYPES = [
  { value: "content_creation",  label: "Content Creation" },
  { value: "content_review",    label: "Content Review" },
  { value: "approval_flow",     label: "Approval Flow" },
  { value: "publishing",        label: "Publishing" },
  { value: "moderation",        label: "Moderation" },
  { value: "reporting",         label: "Reporting" },
  { value: "incident_response", label: "Incident Response" },
  { value: "campaign_handoff",  label: "Campaign Handoff" },
  { value: "custom",            label: "Custom" },
];

const PLATFORMS = ["linkedin", "x", "facebook", "instagram", "tiktok", "youtube", "blog", "internal"];

export default function CreateWorkflowModal({ open, onClose, onCreated }: CreateWorkflowModalProps) {
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [riskLevel, setRiskLevel]     = useState("medium");
  const [type, setType]               = useState("content_creation");
  const [platforms, setPlatforms]     = useState<string[]>([]);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  if (!open) return null;

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const reset = () => {
    setName("");
    setDescription("");
    setRiskLevel("medium");
    setType("content_creation");
    setPlatforms([]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Workflow name is required.");
      return;
    }
    if (trimmedName.length < 3) {
      setError("Name must be at least 3 characters.");
      return;
    }

    setSubmitting(true);
    try {
      // FIX: use api.createWorkflow() so workspace_id + owner_id are
      // injected server-side from req.user (set by authMiddleware).
      // Previously called api.post() directly, which hit the same route
      // but caused confusion; more importantly the response-shape check
      // below now correctly handles both success and error branches.
      const res = await api.createWorkflow({
        name: trimmedName,
        description: description.trim() || undefined,
        risk_level: riskLevel,
        type,
        platforms,
        brand_ids: [],
      });

      // FIX: backend returns { success: true, data: { id } }.
      // Previous code checked res?.data?.id but api.post() already
      // unwraps to the raw JSON, so the shape is exactly { success, data }.
      if (res && res.success === true && res.data?.id) {
        reset();
        onCreated(res.data.id);
        onClose();
        return;
      }

      // Surface whatever error message the backend returned.
      // Handles both { error: string } and { error: { message: string } }.
      const backendMsg =
        typeof res?.error === "object"
          ? res?.error?.message
          : res?.error || res?.message;

      setError(backendMsg || "Failed to create workflow. Please try again.");
    } catch (err: any) {
      setError(err?.message || "Failed to create workflow.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <GitBranch className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Create Workflow</h2>
              <p className="text-xs text-[var(--text-secondary)]">Identity + scope. Builder &amp; gates come next.</p>
            </div>
          </div>
          <button
            onClick={() => { reset(); onClose(); }}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Workflow Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. LinkedIn Campaign Approval Flow"
              className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500/40"
              required
              minLength={3}
              maxLength={120}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do? Who owns it? When does it run?"
              className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500/40 resize-none"
              rows={3}
              maxLength={500}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Workflow Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/40"
              disabled={submitting}
            >
              {WORKFLOW_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Risk Tier <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RISK_LEVELS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRiskLevel(r.value)}
                  disabled={submitting}
                  className={`text-left p-2.5 rounded-xl border transition-colors ${
                    riskLevel === r.value
                      ? "bg-indigo-500/10 border-indigo-500/40 text-[var(--text-primary)]"
                      : "bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                  }`}
                >
                  <p className="text-xs font-semibold">{r.label}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Platforms / Channels
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  disabled={submitting}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium capitalize border transition-colors ${
                    platforms.includes(p)
                      ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400"
                      : "bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { reset(); onClose(); }}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 disabled:cursor-not-allowed text-sm font-semibold text-foreground transition-colors flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}