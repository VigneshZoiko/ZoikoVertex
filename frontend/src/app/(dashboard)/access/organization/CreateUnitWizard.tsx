"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { api } from "@/lib/api";

const COLOR_PRESETS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4", "#64748b", "#a16207",
];

const UNIT_TYPES = [
  { value: "department", label: "Department" },
  { value: "region", label: "Region" },
  { value: "team", label: "Team" },
  { value: "division", label: "Division" },
  { value: "project", label: "Project" },
];

interface WorkspaceMember {
  id: string; workspace_member_id?: string;
  full_name: string; email: string; role: string;
}

export default function CreateUnitWizard({ onClose, onCreated }: {
  onClose: () => void; onCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [unitType, setUnitType] = useState("department");
  const [ownerId, setOwnerId] = useState("");
  const [parentId, setParentId] = useState("");
  const [units, setUnits] = useState<{ id: string; name: string; unit_type: string }[]>([]);

  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [availableMembers, setAvailableMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const steps = ["Unit Details", "Assign Members", "Review"];
  const fetchedRef = useRef({ members: false, units: false });

  useEffect(() => {
    if (!fetchedRef.current.members) {
      fetchedRef.current.members = true;
      setLoadingMembers(true);
      api.get("/api/v1/team/members").then((res) => {
        if (res.success !== false) setAvailableMembers(res.data || []);
      }).catch(() => {}).finally(() => setLoadingMembers(false));
    }
    if (!fetchedRef.current.units) {
      fetchedRef.current.units = true;
      api.get("/api/v1/units").then((res) => { if (res.success !== false) setUnits(res.data || []); }).catch(() => {});
    }
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const createRes = await api.post("/api/v1/units", {
        name: name.trim(),
        description: description.trim() || null,
        color,
        unit_type: unitType,
        owner_id: ownerId || null,
        parent_id: parentId || null,
      });

      if (createRes.success === false) {
        setError(String(createRes.error || "Failed to create business unit"));
        setSubmitting(false);
        return;
      }

      onCreated();
      onClose();

      if (selectedMembers.length > 0 && createRes?.data?.id) {
        const results = await Promise.allSettled(selectedMembers.map((mid) =>
          api.post(`/api/v1/units/${createRes.data.id}/members`, { member_id: mid })
        ));
        const failures = results.filter(r => r.status === "rejected");
        if (failures.length > 0) {
          console.warn(`${failures.length} member(s) could not be added to unit ${createRes.data.id}`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create business unit";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm overflow-hidden" onClick={onClose}>
      <div className="w-full max-w-[600px] h-screen max-h-screen bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-[var(--surface)] shrink-0 px-6 py-5 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Create Business Unit</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-1.5">
            {steps.map((s, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-info-text" : "bg-[var(--surface-hover)]"}`} />
            ))}
          </div>
          <p className="text-xs text-[var(--foreground-muted)] mt-2 font-medium">{step + 1}. {steps[step]}</p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
              {error}
              <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
            </div>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1.5 uppercase tracking-wide">Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Marketing, APAC Region"
                  className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-info-border/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1.5 uppercase tracking-wide">Description</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional short description"
                  className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-info-border/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1.5 uppercase tracking-wide">Unit Type</label>
                <select value={unitType} onChange={(e) => setUnitType(e.target.value)}
                  className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-info-border/50 transition-all">
                  {UNIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1.5 uppercase tracking-wide">Owner (optional)</label>
                <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-info-border/50 transition-all">
                  <option value="">— No owner —</option>
                  {availableMembers.map((m) => (
                    <option key={m.id} value={m.workspace_member_id || m.id}>{m.full_name} ({m.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-1.5 uppercase tracking-wide">Parent Unit <span className="font-normal normal-case tracking-normal text-[var(--foreground-muted)]">(optional)</span></label>
                <select value={parentId} onChange={(e) => setParentId(e.target.value)}
                  className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-info-border/50 transition-all">
                  <option value="">— No parent (top-level) —</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.unit_type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground-muted)] mb-2 uppercase tracking-wide">Colour</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button key={c} onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-lg transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-[var(--card)] ring-white scale-110" : "hover:scale-110"}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--foreground-muted)] mb-2">Select workspace members to assign to this unit.</p>
              {loadingMembers ? (
                <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading members…
                </div>
              ) : availableMembers.length === 0 ? (
                <p className="text-sm text-[var(--foreground-muted)]">No members available.</p>
              ) : (
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {availableMembers.map((m) => (
                    <label key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-colors">
                      <input type="checkbox" checked={selectedMembers.includes(m.workspace_member_id || m.id)} onChange={() => toggleMember(m.workspace_member_id || m.id)}
                        className="w-4 h-4 rounded border-[var(--border)] accent-info-text" />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm text-[var(--foreground)] font-medium">{m.full_name}</span>
                        <span className="text-[10px] font-semibold text-[var(--foreground-muted)] uppercase">{m.role}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {selectedMembers.length > 0 && (
                <p className="text-xs text-info-text font-medium">{selectedMembers.length} member(s) selected</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-sm font-semibold text-[var(--foreground)]">{name || "Unnamed Unit"}</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-info-text/10 text-info-text">New</span>
                </div>
                {description && <p className="text-xs text-[var(--foreground-muted)]">{description}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-[var(--foreground-muted)]">Type:</span> <span className="text-[var(--foreground)] font-medium">{UNIT_TYPES.find(t => t.value === unitType)?.label}</span></div>
                  <div><span className="text-[var(--foreground-muted)]">Owner:</span> <span className="text-[var(--foreground)] font-medium">{ownerId ? availableMembers.find(m => (m.workspace_member_id || m.id) === ownerId)?.full_name || "Assigned" : "None"}</span></div>
                  <div><span className="text-[var(--foreground-muted)]">Parent:</span> <span className="text-[var(--foreground)] font-medium">{parentId ? units.find(u => u.id === parentId)?.name || "Unknown" : "Top-level"}</span></div>
                  <div><span className="text-[var(--foreground-muted)]">Members:</span> <span className="text-[var(--foreground)] font-medium">{selectedMembers.length}</span></div>
                </div>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] text-center pt-2">Review the details above. You can edit these later.</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] shrink-0 px-6 py-4 flex items-center justify-between">
          <button onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
            {step > 0 ? "Back" : "Cancel"}
          </button>
          {step < 2 ? (
            <button onClick={() => setStep(step + 1)}
              disabled={step === 0 && !name.trim()}
              className="px-5 py-2 bg-info-text hover:bg-info-text disabled:opacity-50 text-foreground text-sm font-semibold rounded-xl transition-colors">
              Continue
            </button>
          ) : (
            <button onClick={handleCreate} disabled={submitting || !name.trim()}
              className="px-5 py-2 bg-info-text hover:bg-info-text disabled:opacity-50 text-foreground text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Creating…" : "Create Unit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
