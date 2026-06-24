"use client";

// ============================================================
// Knowledge Base — Governed source-of-truth control surface.
//
//   Knowledge Base
//     ├── Collections   (create / edit / delete / open · name · description · source count)
//     ├── Sources       (create-as-DRAFT / delete / open · Active⇄Retired toggle)
//     └── Source Content (opens like a FILE: status banner on top, source options —
//                         name · type · author · keywords · citation · match action —
//                         editable inline in the header with separate edit controls,
//                         content editable in the body, evidence history)
//
// Governance flow:
//   • A source is ONLY created as a DRAFT. No approve/review/block is chosen at
//     creation — it lands in the Review Queue for the Admin / Workspace Owner.
//   • The Admin / Workspace Owner later Approves it → a green "Approved" status
//     banner shows above the source content. Block / Review are admin-only too.
//   • Match Action (runtime rule) + author/keywords/citation live in metadata,
//     so no DB schema change is required.
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import { useRoleContext } from "@/lib/context/RoleContext";
import { supabase, isSupabaseReady } from "@/lib/supabase";
import { api } from "@/lib/api";
import {
  Database,
  FolderPlus,
  Folder,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Eye,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Clock,
  Archive,
  Tag,
  Search,
  X,
  Check,
  Loader2,
  History,
  Layers,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Upload,
  ArrowLeftRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type MatchAction = "APPROVE" | "REVIEW" | "BLOCK";

interface OwnerRecord {
  email: string;
  username: string;
  until: string; // ISO date ownership left this person
}

interface PendingTransfer {
  to_email: string;
  to_username: string;
  requested_at: string;
  requested_by?: string;
}

interface SourceMetadata {
  author?: string;
  author_email?: string;
  owner_email?: string;
  owner_username?: string;
  pending_transfer?: PendingTransfer | null;
  owner_history?: OwnerRecord[];
  keywords?: string[];
  match_action?: MatchAction;
  citation_reference?: string;
  governance_category?: string;
  [k: string]: unknown;
}

interface KBCollection {
  id: string;
  name: string;
  description?: string;
  source_count?: number;
  created_at?: string;
}

interface KBSource {
  id: string;
  collection_id: string;
  title: string;
  source_type?: string;
  content?: string;
  status?: string;
  owner_name?: string;
  created_by?: string;
  metadata?: SourceMetadata;
  created_at?: string;
  updated_at?: string;
}

interface KBReview {
  id: string;
  source_id: string;
  reviewer_id?: string;
  review_type?: string;
  decision?: string;
  comments?: string;
  completed_at?: string;
  created_at?: string;
}

interface OrgMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role?: string;
}

const SOURCE_TYPES = [
  "MANUAL_ARTICLE",
  "POLICY",
  "BRAND_GUIDE",
  "FAQ",
  "PRODUCT_FACT",
  "LEGAL_CLAIM",
  "PDF",
  "URL",
];

// Governance categories — align a source with the runtime governance path it
// supports (mirrors the 5 governed prompts / Test Center possibilities).
// Changing this on an approved source forces admin / workspace-owner re-approval.
const GOVERNANCE_CATEGORIES: { id: string; label: string }[] = [
  { id: "BASIC_CONTENT", label: "Basic Content" },
  { id: "CLAIM_VALIDATION", label: "Claim Validation" },
  { id: "KNOWLEDGE_VERIFICATION", label: "Knowledge Verification" },
  { id: "HIGH_RISK_REVIEW", label: "High-Risk Review" },
  { id: "POLICY_SAFETY", label: "Policy / Safety" },
];
const GOV_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(GOVERNANCE_CATEGORIES.map((c) => [c.id, c.label]));

// ─────────────────────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────────────────────
const isRetired = (s?: KBSource) => s?.status === "RETIRED";
const isBlocked = (s?: KBSource) => s?.status === "QUARANTINED" || s?.status === "REJECTED";
const isReview = (s?: KBSource) =>
  s?.status === "DRAFT" || s?.status === "REVIEW_REQUIRED" || s?.status === "PROCESSING";
const isApproved = (s?: KBSource) => s?.status === "APPROVED" || s?.status === "ACTIVE";
const isActiveLive = (s?: KBSource) => s?.status === "ACTIVE";

const meta = (s?: KBSource): SourceMetadata => s?.metadata || {};
const getKeywords = (s?: KBSource): string[] =>
  Array.isArray(meta(s).keywords) ? (meta(s).keywords as string[]) : [];
const getAuthor = (s?: KBSource): string => (meta(s).author as string) || s?.owner_name || "";
const getAuthorEmail = (s?: KBSource): string => {
  const m = meta(s);
  if (m.author_email) return m.author_email as string;
  // The backend stamps owner_name with the creator's email at creation time.
  if (s?.owner_name && s.owner_name.includes("@")) return s.owner_name;
  return "";
};
const getCitation = (s?: KBSource): string => (meta(s).citation_reference as string) || "";
const getGovernanceCategory = (s?: KBSource): string => (meta(s).governance_category as string) || "";
// AI-assisted governance classification (stored in metadata — no new columns).
const getAiCategory = (s?: KBSource): string => (meta(s).ai_suggested_governance_category as string) || "";
const getAiConfidence = (s?: KBSource): number => Number(meta(s).ai_category_confidence) || 0;
const getAiReason = (s?: KBSource): string => (meta(s).ai_category_reason as string) || "";
const getAiMatchAction = (s?: KBSource): string => (meta(s).ai_suggested_match_action as string) || "";
const getCategoryReviewStatus = (s?: KBSource): string => (meta(s).category_review_status as string) || "";
const isCategoryUnresolved = (s?: KBSource): boolean => ["mismatch", "review_required"].includes(getCategoryReviewStatus(s));

// Current owner (updated on an approved ownership transfer; defaults to creator).
const getOwnerName = (s?: KBSource): string => (meta(s).owner_username as string) || getAuthor(s);
const getOwnerEmail = (s?: KBSource): string => (meta(s).owner_email as string) || getAuthorEmail(s);
const getPendingTransfer = (s?: KBSource): PendingTransfer | null => meta(s).pending_transfer || null;
const getOwnerHistory = (s?: KBSource): OwnerRecord[] => (Array.isArray(meta(s).owner_history) ? (meta(s).owner_history as OwnerRecord[]) : []);

// Validate a transfer target against real org/workspace members: the email must
// belong to a member AND the username must match that member's name.
type MatchResult = { ok: true; member: OrgMember } | { ok: false; reason: "no_email" | "name_mismatch"; member?: OrgMember };
function matchMember(members: OrgMember[], email: string, username: string): MatchResult {
  const e = email.trim().toLowerCase();
  const u = username.trim().toLowerCase();
  const byEmail = members.find((m) => (m.email || "").toLowerCase() === e);
  if (!byEmail) return { ok: false, reason: "no_email" };
  if ((byEmail.full_name || "").trim().toLowerCase() !== u) return { ok: false, reason: "name_mismatch", member: byEmail };
  return { ok: true, member: byEmail };
}

function StatusBadge({ source }: { source?: KBSource }) {
  if (isBlocked(source)) return <Chip cls="bg-rose-500/10 text-rose-400 border-rose-500/20" icon={<Ban className="w-3 h-3" />} label="Blocked" />;
  if (isRetired(source)) return <Chip cls="bg-surface text-foreground-muted border-border" icon={<Archive className="w-3 h-3" />} label="Retired" />;
  if (isReview(source)) return <Chip cls="bg-amber-500/10 text-amber-400 border-amber-500/20" icon={<Clock className="w-3 h-3" />} label="Draft" />;
  if (isActiveLive(source)) return <Chip cls="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" icon={<CheckCircle2 className="w-3 h-3" />} label="Active" />;
  if (isApproved(source)) return <Chip cls="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" icon={<ShieldCheck className="w-3 h-3" />} label="Approved" />;
  return <Chip cls="bg-surface text-foreground-muted border-border" icon={null} label={source?.status || "Draft"} />;
}

// Governance category shown beside the status. Indigo = governance metadata.
function GovCategoryChip({ source }: { source?: KBSource }) {
  const cat = getGovernanceCategory(source);
  if (!cat) return null;
  return <Chip cls="bg-indigo-500/10 text-indigo-300 border-indigo-500/20" icon={<ShieldCheck className="w-3 h-3" />} label={GOV_CATEGORY_LABEL[cat] || cat} />;
}

function Chip({ cls, icon, label }: { cls: string; icon: React.ReactNode; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function KnowledgeBasePage() {
  const { role, isSuperAdmin, fullName } = useRoleContext();
  const isApprover = isSuperAdmin || ["ADMIN", "WORKSPACE_OWNER"].includes((role || "").toUpperCase());

  // Current user — stamped as the source author (username) + creator email on create,
  // and used to decide who may edit (creator only, besides admin / workspace owner).
  const [myEmail, setMyEmail] = useState("");
  const [myId, setMyId] = useState("");
  useEffect(() => {
    if (!isSupabaseReady) return;
    let cancelled = false;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) return;
        setMyEmail(data?.user?.email || "");
        setMyId(data?.user?.id || "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Edit rights follow OWNERSHIP: the admin / workspace owner, OR the current
  // owner (which moves when an ownership transfer is approved). Everyone else
  // gets a read-only view.
  const canEditSource = useCallback(
    (s?: KBSource): boolean => {
      if (!s) return false;
      if (isApprover) return true;
      const ownerEmail = getOwnerEmail(s).toLowerCase();
      if (!!myEmail && ownerEmail === myEmail.toLowerCase()) return true;
      // Fallback for older rows with no resolvable owner email yet.
      if (!ownerEmail && myId && s.created_by === myId) return true;
      return false;
    },
    [isApprover, myId, myEmail],
  );

  const [collections, setCollections] = useState<KBCollection[]>([]);
  const [sources, setSources] = useState<KBSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reviews, setReviews] = useState<KBReview[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);

  const [collectionModal, setCollectionModal] = useState<{ open: boolean; edit?: KBCollection }>({ open: false });
  const [createSourceOpen, setCreateSourceOpen] = useState(false);
  const [transferModal, setTransferModal] = useState<{ open: boolean; source?: KBSource }>({ open: false });
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "danger" | "warning" | "info";
    confirmLabel: string;
    requireReason?: boolean;
    onConfirm: (reason?: string) => void;
  } | null>(null);

  const flash = useCallback((kind: "ok" | "err", text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Data fetch ────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    try {
      const [colRes, srcRes, memRes] = await Promise.all([
        api.listKnowledgeCollections(),
        api.listKnowledgeSources(),
        api.listTeamMembers().catch(() => null),
      ]);
      if (colRes?.success) setCollections(colRes.data || []);
      if (srcRes?.success) setSources(srcRes.data || []);
      if (memRes?.success) setMembers(memRes.data || []);
    } catch {
      flash("err", "Failed to load Knowledge Base.");
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!selectedSourceId) {
      setReviews([]);
      return;
    }
    let cancelled = false;
    api
      .listKnowledgeReviews(selectedSourceId)
      .then((r) => {
        if (!cancelled && r?.success) setReviews(r.data || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedSourceId, sources]);

  // ── Derived ───────────────────────────────────────────────
  const sourcesByCollection = useMemo(() => {
    const map = new Map<string, KBSource[]>();
    for (const s of sources) {
      const arr = map.get(s.collection_id) || [];
      arr.push(s);
      map.set(s.collection_id, arr);
    }
    return map;
  }, [sources]);

  const collectionSources = useMemo(() => {
    if (!selectedCollectionId) return [];
    const list = sourcesByCollection.get(selectedCollectionId) || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (s) => s.title?.toLowerCase().includes(q) || getAuthor(s).toLowerCase().includes(q) || getKeywords(s).some((k) => k.toLowerCase().includes(q)),
    );
  }, [selectedCollectionId, sourcesByCollection, search]);

  const selectedSource = useMemo(() => sources.find((s) => s.id === selectedSourceId), [sources, selectedSourceId]);
  const transferRequests = useMemo(() => sources.filter((s) => getPendingTransfer(s)), [sources]);

  const summary = useMemo(
    () => ({
      collections: collections.length,
      sources: sources.length,
      active: sources.filter(isActiveLive).length,
      retired: sources.filter(isRetired).length,
      review: sources.filter(isReview).length,
      blocked: sources.filter(isBlocked).length,
    }),
    [collections, sources],
  );

  // ── Mutations ─────────────────────────────────────────────
  const saveCollection = async (name: string, description: string) => {
    setBusy("collection");
    try {
      if (collectionModal.edit) {
        await api.updateKnowledgeCollection(collectionModal.edit.id, { name, description });
        flash("ok", "Collection updated.");
      } else {
        await api.createKnowledgeCollection({ name, description });
        flash("ok", "Collection created.");
      }
      setCollectionModal({ open: false });
      await refreshAll();
    } catch {
      flash("err", "Could not save collection.");
    } finally {
      setBusy(null);
    }
  };

  // Create as DRAFT only — no governance choice at creation. Opens it as a file.
  // Optional upload: JSON / TXT are read in the browser so their content opens
  // straight in the editor; PDF / Word are uploaded for the backend to extract.
  const createDraftSource = async (title: string, sourceType: string, file?: File | null, fileText?: string | null, governanceCategory?: string) => {
    if (!selectedCollectionId) return;
    setBusy("source");
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("source_type", sourceType);
      fd.append("metadata", JSON.stringify({ author: fullName || myEmail || "", author_email: myEmail, keywords: [], ...(governanceCategory ? { governance_category: governanceCategory } : {}) }));

      let attached = "no file";
      if (fileText != null && fileText.length > 0) {
        // JSON / TXT already read in the browser → straight into the content.
        fd.append("content", fileText);
        attached = `${fileText.length} chars`;
      } else if (file) {
        // PDF / DOC / DOCX → backend extracts the text.
        fd.append("content", "");
        fd.append("file", file);
        attached = `file: ${file.name}`;
      } else {
        fd.append("content", "");
      }

      const res = await api.createKnowledgeSource(selectedCollectionId, fd);
      if (!res?.success) {
        flash("err", typeof res?.error === "string" ? res.error : "Could not create source.");
        return;
      }
      setCreateSourceOpen(false);
      await refreshAll();
      if (res.data?.id) setSelectedSourceId(res.data.id);
      flash("ok", `Draft created (${attached}).`);
    } catch {
      flash("err", "Could not create source. For PDF / Word, make sure it's a valid file.");
    } finally {
      setBusy(null);
    }
  };

  // Inline field saves (used by the file-style header + content editor).
  const patchSourceTop = useCallback(
    async (s: KBSource, top: Record<string, unknown>) => {
      try {
        const r = await api.updateKnowledgeSource(s.id, top);
        if (!r?.success) throw new Error("save failed");
        await refreshAll();
      } catch {
        flash("err", "Could not save change.");
        throw new Error("save failed");
      }
    },
    [refreshAll, flash],
  );

  const patchSourceMeta = useCallback(
    async (s: KBSource, metaPatch: SourceMetadata) => {
      try {
        const r = await api.updateKnowledgeSource(s.id, { metadata: { ...meta(s), ...metaPatch } });
        if (!r?.success) throw new Error("save failed");
        await refreshAll();
      } catch {
        flash("err", "Could not save change.");
        throw new Error("save failed");
      }
    },
    [refreshAll, flash],
  );

  // Governance category change. If the source is already approved/active, the
  // change invalidates that approval — status drops to REVIEW_REQUIRED so the
  // admin / workspace owner must re-approve it (same gate as initial approval).
  const changeGovernanceCategory = useCallback(
    async (s: KBSource, category: string) => {
      if (category === getGovernanceCategory(s)) return;
      setBusy(s.id);
      try {
        const needsReapproval = isApproved(s); // APPROVED or ACTIVE
        const top: Record<string, unknown> = { metadata: { ...meta(s), governance_category: category } };
        if (needsReapproval) top.status = "REVIEW_REQUIRED";
        const r = await api.updateKnowledgeSource(s.id, top);
        if (!r?.success) throw new Error("save failed");
        await refreshAll();
        flash(
          "ok",
          needsReapproval
            ? `Governance category changed — "${s.title}" needs admin / workspace-owner re-approval.`
            : `Governance category updated for "${s.title}".`,
        );
      } catch {
        flash("err", "Could not update the governance category.");
      } finally {
        setBusy(null);
      }
    },
    [refreshAll, flash],
  );

  // ── AI-assisted governance classification ──────────────────
  // Groq primary / Gemini optional fallback (backend). Result is stored in the
  // source metadata and surfaced as a reminder in the source header.
  const [classifying, setClassifying] = useState(false);
  const autoClassified = useRef<Set<string>>(new Set());

  const classifyGovernance = useCallback(
    async (s: KBSource, opts?: { silent?: boolean }) => {
      setClassifying(true);
      try {
        const r = await api.classifySourceGovernance(s.id);
        if (r?.success) {
          await refreshAll();
          if (!opts?.silent) {
            flash("ok", r.classified === false ? "AI check unavailable (no classifier configured)." : "AI governance check complete.");
          }
        } else if (!opts?.silent) {
          flash("err", "AI governance check failed.");
        }
      } catch {
        if (!opts?.silent) flash("err", "AI governance check failed.");
      } finally {
        setClassifying(false);
      }
    },
    [refreshAll, flash],
  );

  // Admin / workspace owner resolves the category check: accept / keep / review.
  const decideGovernance = useCallback(
    async (s: KBSource, decision: "accept" | "keep" | "review", reason?: string) => {
      setBusy(s.id);
      try {
        const r = await api.decideSourceGovernance(s.id, { decision, reason });
        if (r?.success) {
          await refreshAll();
          flash("ok", decision === "review" ? "Source sent for review." : decision === "accept" ? "AI suggestion accepted." : "Selection kept.");
        } else {
          flash("err", (r?.error as string) || "Could not resolve the category check.");
        }
      } catch {
        flash("err", "Could not resolve the category check.");
      } finally {
        setBusy(null);
      }
    },
    [refreshAll, flash],
  );

  // Auto-run the AI governance check once per source when opened and not yet
  // classified. Silent; the backend no-ops on empty content. Stored on first run
  // so reopening shows the saved result without re-calling the model.
  useEffect(() => {
    if (!selectedSource) return;
    if (getAiCategory(selectedSource)) return;
    if (autoClassified.current.has(selectedSource.id)) return;
    autoClassified.current.add(selectedSource.id);
    void classifyGovernance(selectedSource, { silent: true });
  }, [selectedSource, classifyGovernance]);

  const runSourceAction = async (
    source: KBSource,
    action: "approve" | "review" | "block" | "activate" | "retire" | "delete",
    reason?: string,
  ) => {
    setBusy(source.id);
    try {
      switch (action) {
        case "approve":
          await api.approveKnowledgeSource(source.id);
          flash("ok", `"${source.title}" approved.`);
          break;
        case "review":
          await api.updateKnowledgeSource(source.id, { status: "REVIEW_REQUIRED" });
          flash("ok", `"${source.title}" sent to review.`);
          break;
        case "block":
          await api.quarantineKnowledgeSource(source.id);
          flash("ok", `"${source.title}" blocked.`);
          break;
        case "activate":
          await api.activateKnowledgeSource(source.id);
          flash("ok", `"${source.title}" is now active.`);
          break;
        case "retire":
          await api.retireKnowledgeSource(source.id);
          flash("ok", `"${source.title}" retired.`);
          break;
        case "delete":
          await api.deleteKnowledgeSource(source.id);
          flash("ok", `"${source.title}" deleted.`);
          if (selectedSourceId === source.id) setSelectedSourceId(null);
          break;
      }
      void reason;
      await refreshAll();
    } catch {
      flash("err", `Could not ${action} the source.`);
    } finally {
      setBusy(null);
    }
  };

  // ── Ownership transfer ────────────────────────────────────
  // Owner requests a transfer (target email + username) → goes to the admin /
  // workspace-owner queue. Admin allows (ownership moves, prior owner recorded
  // in history) or blocks (request cleared).
  const requestTransfer = async (source: KBSource, toEmail: string, toUsername: string) => {
    // Authenticate the target: must be a real member of this org/workspace AND
    // the username must match that member.
    const match = matchMember(members, toEmail, toUsername);
    if (!match.ok) {
      // Generic message — do not disclose whether the email exists or its owner.
      flash("err", "No organization member matches that email and username.");
      return;
    }
    if (toEmail.trim().toLowerCase() === getOwnerEmail(source).toLowerCase()) {
      flash("err", "That user already owns this source.");
      return;
    }
    setBusy(source.id);
    try {
      await patchSourceMeta(source, {
        pending_transfer: { to_email: match.member.email || toEmail, to_username: match.member.full_name || toUsername, requested_at: new Date().toISOString(), requested_by: myEmail },
      });
      setTransferModal({ open: false });
      flash("ok", `Transfer to ${match.member.full_name || toUsername} sent to the admin / workspace owner for approval.`);
    } catch {
      /* patchSourceMeta already surfaced the error */
    } finally {
      setBusy(null);
    }
  };

  // Allow/block run server-side: the backend re-verifies org membership, hands
  // over ownership, records history, and notifies the new owner.
  const allowTransfer = async (source: KBSource) => {
    const pt = getPendingTransfer(source);
    if (!pt) return;
    setBusy(source.id);
    try {
      const res = await api.decideKnowledgeTransfer(source.id, "allow");
      if (!res?.success) {
        flash("err", typeof res?.error === "string" ? res.error : "Could not complete the transfer.");
        return;
      }
      await refreshAll();
      flash("ok", `Ownership transferred to ${pt.to_username}. They have been notified.`);
    } catch {
      flash("err", "Could not complete the transfer.");
    } finally {
      setBusy(null);
    }
  };

  const blockTransfer = async (source: KBSource) => {
    setBusy(source.id);
    try {
      const res = await api.decideKnowledgeTransfer(source.id, "block");
      if (!res?.success) {
        flash("err", typeof res?.error === "string" ? res.error : "Could not block the transfer.");
        return;
      }
      await refreshAll();
      flash("ok", "Transfer request blocked.");
    } catch {
      flash("err", "Could not block the transfer.");
    } finally {
      setBusy(null);
    }
  };

  const deleteCollection = async (c: KBCollection) => {
    setBusy(c.id);
    try {
      await api.deleteKnowledgeCollection(c.id);
      flash("ok", "Collection deleted.");
      if (selectedCollectionId === c.id) {
        setSelectedCollectionId(null);
        setSelectedSourceId(null);
      }
      await refreshAll();
    } catch {
      flash("err", "Could not delete collection.");
    } finally {
      setBusy(null);
    }
  };

  // ── Confirm helpers ───────────────────────────────────────
  const confirmDeleteSource = (s: KBSource) =>
    setConfirm({
      open: true,
      title: "Delete source",
      message: `Delete "${s.title}"? This removes the source, but its evidence history remains preserved for audit.`,
      variant: "danger",
      confirmLabel: "Delete source",
      onConfirm: () => {
        setConfirm(null);
        runSourceAction(s, "delete");
      },
    });

  const confirmDeleteCollection = (c: KBCollection) =>
    setConfirm({
      open: true,
      title: "Delete collection",
      message: `Delete "${c.name}" and unlink its sources? Source evidence history is preserved.`,
      variant: "danger",
      confirmLabel: "Delete collection",
      onConfirm: () => {
        setConfirm(null);
        deleteCollection(c);
      },
    });

  const confirmBlock = (s: KBSource) =>
    setConfirm({
      open: true,
      title: "Block source",
      message: `Block "${s.title}"? Agents will be prevented from using or citing it until it is reviewed again.`,
      variant: "danger",
      confirmLabel: "Block",
      requireReason: true,
      onConfirm: (reason) => {
        setConfirm(null);
        runSourceAction(s, "block", reason);
      },
    });

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 rounded-2xl shrink-0">
            <Database className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Knowledge Base</h1>
            <p className="text-sm text-[var(--foreground-muted)]">Governed source-of-truth for agents — collections, sources, and approved content.</p>
          </div>
        </div>
        <button
          onClick={refreshAll}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <SummaryCard label="Collections" value={summary.collections} icon={<Layers className="w-4 h-4" />} tone="indigo" />
        <SummaryCard label="Sources" value={summary.sources} icon={<FileText className="w-4 h-4" />} tone="sky" />
        <SummaryCard label="Active" value={summary.active} icon={<CheckCircle2 className="w-4 h-4" />} tone="emerald" />
        <SummaryCard label="Retired" value={summary.retired} icon={<Archive className="w-4 h-4" />} tone="zinc" />
        <SummaryCard label="Review" value={summary.review} icon={<Clock className="w-4 h-4" />} tone="amber" />
        <SummaryCard label="Blocked" value={summary.blocked} icon={<Ban className="w-4 h-4" />} tone="rose" />
      </div>

      {/* Review Queue lives in the Approval Console (/governance/reviews) now. */}

      {/* Ownership Transfer Requests — admin / workspace owner allows or blocks. */}
      {transferRequests.length > 0 && (
        <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
            <span className="flex items-center gap-2 text-sm font-semibold text-indigo-300">
              <ArrowLeftRight className="w-4 h-4" /> Ownership Transfer Requests
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">{transferRequests.length} pending</span>
            </span>
            <span className="text-[11px] text-[var(--foreground-muted)]">{isApprover ? "You can allow or block" : "Awaiting admin / workspace owner"}</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {transferRequests.map((s) => {
              const pt = getPendingTransfer(s); if (!pt) return null;
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <ArrowLeftRight className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">{s.title}</p>
                    <p className="text-[11px] text-[var(--foreground-muted)] truncate">
                      {getOwnerName(s) || getOwnerEmail(s)} → <span className="text-indigo-300">{pt.to_username}</span> ({pt.to_email})
                    </p>
                  </div>
                  <button
                    onClick={() => { setSelectedCollectionId(s.collection_id); setSelectedSourceId(s.id); }}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 px-2 py-1"
                  >
                    Open
                  </button>
                  {isApprover ? (
                    <>
                      <ActionBtn tone="emerald" label="Allow" busy={busy === s.id} onClick={() => allowTransfer(s)} icon={<ShieldCheck className="w-3.5 h-3.5" />} />
                      <ActionBtn tone="rose" label="Block" busy={busy === s.id} onClick={() => blockTransfer(s)} icon={<Ban className="w-3.5 h-3.5" />} />
                    </>
                  ) : (
                    <span className="text-[10px] text-[var(--foreground-muted)] italic px-2">Pending approval</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Collections */}
        <section className="lg:col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" /> Collections
            </h2>
            <button onClick={() => setCollectionModal({ open: true })} className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300">
              <FolderPlus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          <div className="p-3 space-y-2 overflow-y-auto max-h-[640px]">
            {loading ? (
              <Skeleton rows={4} />
            ) : collections.length === 0 ? (
              <EmptyState icon={<Layers className="w-6 h-6" />} title="No collections yet" hint="Create a collection to group your sources." action="Create collection" onAction={() => setCollectionModal({ open: true })} />
            ) : (
              collections.map((c) => {
                const count = sourcesByCollection.get(c.id)?.length ?? c.source_count ?? 0;
                const active = selectedCollectionId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCollectionId(c.id);
                      setSelectedSourceId(null);
                    }}
                    className={`group cursor-pointer rounded-xl border p-3 transition ${active ? "border-indigo-500/40 bg-indigo-500/10" : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--border-hover)]"}`}
                  >
                    <div className="flex items-start gap-2">
                      <Folder className={`w-4 h-4 mt-0.5 shrink-0 ${active ? "text-indigo-400" : "text-[var(--foreground-muted)]"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">{c.name}</p>
                        {c.description && <p className="text-[11px] text-[var(--foreground-muted)] line-clamp-2">{c.description}</p>}
                        <p className="text-[10px] text-[var(--foreground-muted)] mt-1">{count} source{count === 1 ? "" : "s"}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition">
                        <IconBtn title="Edit" onClick={(e) => { e.stopPropagation(); setCollectionModal({ open: true, edit: c }); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </IconBtn>
                        <IconBtn title="Delete" danger onClick={(e) => { e.stopPropagation(); confirmDeleteCollection(c); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconBtn>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Sources — narrows when a source is open so the content pane gets ~half the width */}
        <section className={`${selectedSource ? "lg:col-span-3" : "lg:col-span-9"} rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" /> Sources
              {selectedCollectionId && <span className="text-[11px] font-normal text-[var(--foreground-muted)]">· {collections.find((c) => c.id === selectedCollectionId)?.name}</span>}
            </h2>
            <button disabled={!selectedCollectionId} onClick={() => setCreateSourceOpen(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus className="w-3.5 h-3.5" /> New source
            </button>
          </div>

          {selectedCollectionId && (
            <div className="px-4 py-2 border-b border-[var(--border)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sources, author, tags…" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none" />
              </div>
            </div>
          )}

          <div className="p-3 space-y-2 overflow-y-auto max-h-[600px]">
            {!selectedCollectionId ? (
              <EmptyState icon={<Folder className="w-6 h-6" />} title="Open a collection" hint="Select a collection on the left to see its sources." />
            ) : collectionSources.length === 0 ? (
              <EmptyState icon={<FileText className="w-6 h-6" />} title="No sources here" hint="Add a source — it is created as a draft and submitted for approval." action="Create source" onAction={() => setCreateSourceOpen(true)} />
            ) : (
              collectionSources.map((s) => {
                const open = selectedSourceId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSourceId(s.id)}
                    className={`cursor-pointer rounded-xl border p-3 transition ${open ? "border-sky-500/40 bg-sky-500/5" : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--border-hover)]"} ${isRetired(s) ? "opacity-45 grayscale" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">{s.title}</p>
                        <p className="text-[11px] text-[var(--foreground-muted)]">{s.source_type || "—"} · by {getAuthor(s) || "—"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge source={s} />
                        <GovCategoryChip source={s} />
                      </div>
                    </div>

                    {getKeywords(s).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {getKeywords(s).slice(0, 6).map((k) => (
                          <span key={k} className="px-1.5 py-0.5 rounded-md bg-[var(--surface-hover)] text-[10px] text-[var(--foreground-muted)]">#{k}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-end mt-2.5">
                      <div className="flex items-center gap-1">
                        {canEditSource(s) && (
                          <ToggleActiveRetired source={s} busy={busy === s.id} disabled={isReview(s) || isBlocked(s) || isCategoryUnresolved(s)} onActivate={(e) => { e.stopPropagation(); runSourceAction(s, "activate"); }} onRetire={(e) => { e.stopPropagation(); runSourceAction(s, "retire"); }} />
                        )}
                        <IconBtn title="Open" onClick={(e) => { e.stopPropagation(); setSelectedSourceId(s.id); }}>
                          <Eye className="w-3.5 h-3.5" />
                        </IconBtn>
                        {canEditSource(s) && (
                          <IconBtn title="Delete source" danger onClick={(e) => { e.stopPropagation(); confirmDeleteSource(s); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </IconBtn>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Source Content — expands to ~half the width as a tall, clean reading pane.
            Only rendered when a source is open, so closing returns the layout to normal. */}
        {selectedSource && (
          <section className="lg:col-span-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col lg:h-[80vh] lg:sticky lg:top-4 self-start">
            {/* Title bar — the source name lives here as the heading (no extra block) */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] shrink-0">
              <FileText className="w-4 h-4 text-violet-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <InlineText
                  big
                  hideLabel
                  label="Source Name"
                  value={selectedSource.title}
                  placeholder="Untitled source"
                  readOnly={!canEditSource(selectedSource)}
                  onSave={(v) => patchSourceTop(selectedSource, { title: v })}
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusBadge source={selectedSource} />
                <GovCategoryChip source={selectedSource} />
              </div>
              <button onClick={() => setSelectedSourceId(null)} title="Close" className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata strip — one clean professional line */}
            <div className="shrink-0 px-4 py-2 border-b border-[var(--border)] flex flex-wrap items-center gap-x-4 gap-y-2">
              <MetaInline label="Type" value={selectedSource.source_type || "MANUAL_ARTICLE"} options={SOURCE_TYPES} readOnly={!canEditSource(selectedSource)} onSave={(v) => patchSourceTop(selectedSource, { source_type: v })} />
              <MetaInline label="Author" value={getAuthor(selectedSource)} readOnly={!canEditSource(selectedSource)} onSave={(v) => patchSourceMeta(selectedSource, { author: v })} />
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Owner</span>
                <span className="text-xs text-[var(--foreground)] truncate max-w-[200px]" title={getOwnerEmail(selectedSource)}>{getOwnerEmail(selectedSource) || "—"}</span>
              </span>
              <MetaInline label="Citation" value={getCitation(selectedSource)} readOnly={!canEditSource(selectedSource)} onSave={(v) => patchSourceMeta(selectedSource, { citation_reference: v })} />
              {/* Governance Category — changing it on an approved source forces re-approval. */}
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] shrink-0">Governance Category</span>
                {canEditSource(selectedSource) ? (
                  <select
                    value={getGovernanceCategory(selectedSource)}
                    disabled={busy === selectedSource.id}
                    onChange={(e) => changeGovernanceCategory(selectedSource, e.target.value)}
                    className="bg-[var(--background)] border border-[var(--border)] rounded px-1.5 py-0.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--border-hover)]"
                  >
                    <option value="">— none —</option>
                    {GOVERNANCE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                ) : (
                  <span className={`text-xs ${getGovernanceCategory(selectedSource) ? "text-[var(--foreground)] font-medium" : "italic text-[var(--foreground-muted)]"}`}>
                    {GOV_CATEGORY_LABEL[getGovernanceCategory(selectedSource)] || "—"}
                  </span>
                )}
              </span>
              {/* Tags inline */}
              <span className="inline-flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</span>
                {getKeywords(selectedSource).length === 0 && !canEditSource(selectedSource) && <span className="text-[11px] italic text-[var(--foreground-muted)]">none</span>}
                {getKeywords(selectedSource).map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--surface-hover)] text-[10px] text-[var(--foreground)]">
                    #{k}
                    {canEditSource(selectedSource) && (
                      <button onClick={() => patchSourceMeta(selectedSource, { keywords: getKeywords(selectedSource).filter((x) => x !== k) })} className="text-[var(--foreground-muted)] hover:text-rose-400">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                ))}
                {canEditSource(selectedSource) && (
                  <TagAdd onAdd={(t) => { if (!getKeywords(selectedSource).includes(t)) patchSourceMeta(selectedSource, { keywords: [...getKeywords(selectedSource), t] }); }} />
                )}
              </span>
            </div>

            {/* Action bar — owner / admin only, thin row */}
            {(canEditSource(selectedSource) || isApprover) && (
              <div className="shrink-0 px-4 py-2 border-b border-[var(--border)] flex flex-wrap items-center gap-1.5">
                {canEditSource(selectedSource) &&
                  (getPendingTransfer(selectedSource) ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-[11px] text-indigo-300">
                      <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" /> Transfer pending to {(getPendingTransfer(selectedSource)?.to_username ?? 'Unknown')}
                    </span>
                  ) : (
                    <button onClick={() => setTransferModal({ open: true, source: selectedSource })} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition">
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
                    </button>
                  ))}
                {isApprover && (
                  <>
                    <ActionBtn tone="emerald" label="Approve" icon={<ShieldCheck className="w-3.5 h-3.5" />} busy={busy === selectedSource.id} disabled={isApproved(selectedSource)} onClick={() => runSourceAction(selectedSource, "approve")} />
                    <ActionBtn tone="rose" label="Block" icon={<Ban className="w-3.5 h-3.5" />} busy={busy === selectedSource.id} onClick={() => confirmBlock(selectedSource)} />
                  </>
                )}
              </div>
            )}

            {/* AI governance check — smart reminder in the source header */}
            {(() => {
              const aiCat = getAiCategory(selectedSource);
              const userCat = getGovernanceCategory(selectedSource);
              const status = getCategoryReviewStatus(selectedSource);
              const unresolved = isCategoryUnresolved(selectedSource);
              if (!aiCat) {
                if (classifying) {
                  return (
                    <div className="shrink-0 px-4 py-2 border-b border-[var(--border)] flex items-center gap-2 text-[11px] text-[var(--foreground-muted)]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running AI governance check…
                    </div>
                  );
                }
                return null;
              }
              const detail = (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px]">
                  <span><span className="text-[var(--foreground-muted)]">User Selected:</span> <b className="text-[var(--foreground)]">{GOV_CATEGORY_LABEL[userCat] || "— none —"}</b></span>
                  <span><span className="text-[var(--foreground-muted)]">AI Suggested:</span> <b className="text-[var(--foreground)]">{GOV_CATEGORY_LABEL[aiCat] || aiCat}</b></span>
                  <span><span className="text-[var(--foreground-muted)]">Confidence:</span> <b className="text-[var(--foreground)]">{getAiConfidence(selectedSource)}%</b></span>
                  {getAiMatchAction(selectedSource) && <span><span className="text-[var(--foreground-muted)]">Suggested Match Action:</span> <b className="text-[var(--foreground)]">{getAiMatchAction(selectedSource)}</b></span>}
                </div>
              );
              return (
                <div className={`shrink-0 px-4 py-2.5 border-b ${unresolved ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/25 bg-emerald-500/5"} space-y-1.5`}>
                  <div className="flex items-center gap-2">
                    {unresolved ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    <span className={`text-[11px] font-semibold ${unresolved ? "text-amber-300" : "text-emerald-300"}`}>
                      {unresolved ? "Category mismatch detected. This source may require stricter governance." : "AI check passed — category appears correct."}
                    </span>
                    {canEditSource(selectedSource) && (
                      <button onClick={() => classifyGovernance(selectedSource)} disabled={classifying} className="ml-auto inline-flex items-center gap-1 text-[10px] text-[var(--foreground-muted)] hover:text-[var(--foreground)] disabled:opacity-50">
                        {classifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Re-check
                      </button>
                    )}
                  </div>
                  {detail}
                  {getAiReason(selectedSource) && (
                    <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed"><span className="font-semibold">Reason:</span> {getAiReason(selectedSource)}</p>
                  )}
                  {unresolved && isApprover && (
                    /* Admin / workspace owner = the reviewer: adopt AI, or keep the user's selection. */
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <ActionBtn tone="emerald" label="Accept AI Suggestion" icon={<CheckCircle2 className="w-3.5 h-3.5" />} busy={busy === selectedSource.id} onClick={() => decideGovernance(selectedSource, "accept")} />
                      <ActionBtn tone="zinc" label="Keep My Selection" icon={<ShieldCheck className="w-3.5 h-3.5" />} busy={busy === selectedSource.id} onClick={() => decideGovernance(selectedSource, "keep", window.prompt("Reason for keeping your selected category (recorded in evidence):") || "")} />
                    </div>
                  )}
                  {unresolved && !isApprover && canEditSource(selectedSource) && (
                    /* Source editor (non-admin): adopt AI, or escalate so an admin can decide. */
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <ActionBtn tone="emerald" label="Accept AI Suggestion" icon={<CheckCircle2 className="w-3.5 h-3.5" />} busy={busy === selectedSource.id} onClick={() => decideGovernance(selectedSource, "accept")} />
                      <ActionBtn tone="amber" label="Send to Review" icon={<Clock className="w-3.5 h-3.5" />} busy={busy === selectedSource.id} onClick={() => decideGovernance(selectedSource, "review")} />
                    </div>
                  )}
                  {unresolved && !isApprover && !canEditSource(selectedSource) && (
                    <p className="text-[10px] text-[var(--foreground-muted)] italic">An admin / workspace owner must resolve this before the source can be activated.</p>
                  )}
                </div>
              );
            })()}

            {/* Scrollable body — content dominates, like a clean text file */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {!canEditSource(selectedSource) && (
                <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface-hover)]/40 border border-[var(--border)] text-[10px] text-[var(--foreground-muted)]">
                  <Eye className="w-3 h-3 shrink-0" /> View only — only the creator or an admin / workspace owner can edit this source.
                </div>
              )}
              <ContentEditor source={selectedSource} readOnly={!canEditSource(selectedSource)} onSave={(content) => patchSourceTop(selectedSource, { content })} />

              {/* History */}
              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                {getOwnerHistory(selectedSource).length > 0 && (
                  <div className="mb-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] flex items-center gap-1 mb-1.5">
                      <ArrowLeftRight className="w-3 h-3" /> Previous Owners
                    </span>
                    <ol className="space-y-1.5">
                      {getOwnerHistory(selectedSource).slice(0, 2).map((o, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="min-w-0 truncate text-[var(--foreground)]">
                            {o.username || o.email}
                            {o.username && o.email ? <span className="text-[var(--foreground-muted)]"> · {o.email}</span> : null}
                          </span>
                          <span className="shrink-0 text-[10px] text-[var(--foreground-muted)]">
                            transferred {o.until ? new Date(o.until).toLocaleDateString() : "—"}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] flex items-center gap-1 mb-1.5">
                  <History className="w-3 h-3" /> Evidence History
                </span>
                <EvidenceHistory source={selectedSource} reviews={reviews} />
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[120] rounded-xl px-4 py-3 text-sm font-medium shadow-lg border ${toast.kind === "ok" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"}`}>
          {toast.text}
        </div>
      )}

      {/* Modals */}
      {collectionModal.open && <CollectionModal edit={collectionModal.edit} busy={busy === "collection"} onClose={() => setCollectionModal({ open: false })} onSave={saveCollection} />}
      {createSourceOpen && <CreateSourceModal busy={busy === "source"} onClose={() => setCreateSourceOpen(false)} onCreate={createDraftSource} />}
      {transferModal.open && transferModal.source && (
        <TransferModal
          source={transferModal.source}
          members={members}
          currentOwnerEmail={getOwnerEmail(transferModal.source)}
          busy={busy === transferModal.source.id}
          onClose={() => setTransferModal({ open: false })}
          onSubmit={(email, username) => requestTransfer(transferModal.source as KBSource, email, username)}
        />
      )}
      <ConfirmActionModal
        open={!!confirm?.open}
        variant={confirm?.variant || "danger"}
        title={confirm?.title || ""}
        message={confirm?.message || ""}
        confirmLabel={confirm?.confirmLabel}
        requireReason={confirm?.requireReason}
        reasonPlaceholder="Reason (recorded in evidence history)…"
        loading={!!busy}
        onConfirm={(reason) => confirm?.onConfirm(reason)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Inline file-style editors
// ─────────────────────────────────────────────────────────────
function InlineText({
  label,
  value,
  onSave,
  big,
  placeholder,
  icon,
  readOnly,
  hideLabel,
}: {
  label: string;
  value: string;
  onSave: (v: string) => Promise<void>;
  big?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  readOnly?: boolean;
  hideLabel?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setVal(value);
  }, [value, editing]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(val.trim());
      setEditing(false);
    } catch {
      /* keep editing on failure */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {!hideLabel && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] flex items-center gap-1">
          {icon}
          {label}
        </span>
      )}
      {editing && !readOnly ? (
        <div className="flex items-center gap-1.5 mt-1">
          <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className={`flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[var(--foreground)] focus:border-[var(--border-hover)] focus:outline-none ${big ? "text-base font-bold" : "text-sm"}`}
          />
          <button onClick={save} disabled={saving} className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setEditing(false)} className="w-7 h-7 rounded-lg border border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] flex items-center justify-center">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="group flex items-center gap-2 mt-0.5">
          <span className={`min-w-0 truncate ${big ? "text-base font-bold text-[var(--foreground)]" : "text-sm text-[var(--foreground)]"} ${!value ? "italic text-[var(--foreground-muted)]" : ""}`}>
            {value || placeholder || "—"}
          </span>
          {!readOnly && (
            <button onClick={() => setEditing(true)} title={`Edit ${label}`} className="opacity-0 group-hover:opacity-100 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition">
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Compact inline metadata field — "LABEL value" on one line, click to edit.
// Supports free text or a select (when `options` is provided).
function MetaInline({ label, value, options, placeholder, onSave, readOnly }: { label: string; value: string; options?: string[]; placeholder?: string; onSave: (v: string) => Promise<void>; readOnly?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setVal(value);
  }, [value, editing]);

  const commit = async (next: string) => {
    setSaving(true);
    try {
      await onSave(next.trim());
      setEditing(false);
    } catch {
      /* keep editing */
    } finally {
      setSaving(false);
    }
  };

  const display = options ? (value || "").replace(/_/g, " ") : value;

  return (
    <span className="group inline-flex items-center gap-1.5 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] shrink-0">{label}</span>
      {editing && !readOnly ? (
        options ? (
          <select
            autoFocus
            defaultValue={value}
            disabled={saving}
            onChange={(e) => commit(e.target.value)}
            onBlur={() => setEditing(false)}
            className="bg-[var(--background)] border border-[var(--border)] rounded px-1.5 py-0.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--border-hover)]"
          >
            {options.map((o) => (
              <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
            ))}
          </select>
        ) : (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commit(val); if (e.key === "Escape") setEditing(false); }}
              placeholder={placeholder}
              className="bg-[var(--background)] border border-[var(--border)] rounded px-1.5 py-0.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--border-hover)] w-36"
            />
            <button onClick={() => commit(val)} disabled={saving} className="text-emerald-400 hover:text-emerald-300">{saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}</button>
            <button onClick={() => setEditing(false)} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"><X className="w-3 h-3" /></button>
          </span>
        )
      ) : (
        <>
          <span className={`text-xs truncate max-w-[180px] ${value ? "text-[var(--foreground)] font-medium" : "italic text-[var(--foreground-muted)]"}`} title={display}>{display || placeholder || "—"}</span>
          {!readOnly && (
            <button onClick={() => setEditing(true)} title={`Edit ${label}`} className="opacity-0 group-hover:opacity-100 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition shrink-0">
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
        </>
      )}
    </span>
  );
}

// Tiny inline "+tag" input for the metadata strip.
function TagAdd({ onAdd }: { onAdd: (t: string) => void }) {
  const [v, setV] = useState("");
  const commit = () => {
    const t = v.trim();
    if (t) onAdd(t);
    setV("");
  };
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
      onBlur={commit}
      placeholder="+ tag"
      className="bg-[var(--background)] border border-[var(--border)] rounded-md px-1.5 py-0.5 text-[10px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none w-16"
    />
  );
}

function ContentEditor({ source, onSave, readOnly }: { source: KBSource; onSave: (content: string) => Promise<void>; readOnly?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(source.content || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setVal(source.content || "");
  }, [source.content, source.id, editing]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(val);
      setEditing(false);
    } catch {
      /* keep editing */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] flex items-center gap-1">
          <FileText className="w-3 h-3" /> Content
        </span>
        {readOnly ? null : !editing ? (
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-400 hover:text-violet-300">
            <Pencil className="w-3 h-3" /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(false)} className="text-[11px] font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)]">Cancel</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <textarea
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          rows={10}
          placeholder="Write the source content here…"
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none resize-y"
        />
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap min-h-[360px]">
          {source.content?.trim() ? source.content : <span className="text-[var(--foreground-muted)] italic">No content yet — click Edit to add it.</span>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Small UI primitives
// ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  const tones: Record<string, string> = {
    indigo: "text-indigo-400 bg-indigo-500/10",
    sky: "text-sky-400 bg-sky-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    zinc: "text-foreground-muted bg-zinc-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    rose: "text-rose-400 bg-rose-500/10",
  };
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${tones[tone]}`}>{icon}</div>
      <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
      <p className="text-[11px] text-[var(--foreground-muted)]">{label}</p>
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--border)] bg-[var(--surface)] transition hover:bg-[var(--surface-hover)] ${danger ? "text-[var(--foreground-muted)] hover:text-rose-400 hover:border-rose-500/30" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}
    >
      {children}
    </button>
  );
}

function ActionBtn({ tone, label, icon, onClick, busy, disabled }: { tone: "emerald" | "amber" | "rose" | "zinc"; label: string; icon: React.ReactNode; onClick: () => void; busy?: boolean; disabled?: boolean }) {
  const tones = { emerald: "bg-emerald-600 hover:bg-emerald-500", amber: "bg-amber-600 hover:bg-amber-500", rose: "bg-rose-600 hover:bg-rose-500", zinc: "bg-zinc-600 hover:bg-zinc-500" };
  return (
    <button onClick={onClick} disabled={busy || disabled} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]}`}>
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function ToggleActiveRetired({ source, busy, disabled, onActivate, onRetire }: { source: KBSource; busy?: boolean; disabled?: boolean; onActivate: (e: React.MouseEvent) => void; onRetire: (e: React.MouseEvent) => void }) {
  // Retired → green "Activate" (bring it back, live again).
  // Not retired → neutral "Retire" (counts toward the Retired total once retired).
  const retired = isRetired(source);
  return (
    <button
      title={retired ? "Retired — click to activate" : "Active — click to retire"}
      role="switch"
      aria-checked={!retired}
      disabled={busy || disabled}
      onClick={retired ? onActivate : onRetire}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-semibold border transition disabled:opacity-40 disabled:cursor-not-allowed ${retired ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-surface text-foreground-muted border-border"}`}
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : retired ? <CheckCircle2 className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
      {retired ? "Activate" : "Retire"}
    </button>
  );
}

function EvidenceHistory({ source, reviews }: { source: KBSource; reviews: KBReview[] }) {
  // Real review events + derived lifecycle events.
  // TODO(backend): a dedicated evidence-events endpoint would give richer history.
  const events: { label: string; detail: string; at?: string; tone: string; dot: string }[] = [];
  if (source.created_at) events.push({ label: "Created", detail: `by ${getAuthor(source) || "—"}`, at: source.created_at, tone: "text-sky-400", dot: "bg-sky-400" });
  for (const r of reviews) {
    const approved = r.decision === "APPROVED";
    const rejected = r.decision === "REJECTED";
    events.push({
      label: approved ? "Approved" : rejected ? "Rejected" : r.review_type || "Reviewed",
      detail: r.comments || r.review_type || "",
      at: r.completed_at || r.created_at,
      tone: approved ? "text-emerald-400" : rejected ? "text-rose-400" : "text-amber-400",
      dot: approved ? "bg-emerald-400" : rejected ? "bg-rose-400" : "bg-amber-400",
    });
  }
  if (source.updated_at && source.updated_at !== source.created_at) events.push({ label: `Status: ${source.status}`, detail: "last updated", at: source.updated_at, tone: "text-violet-400", dot: "bg-violet-400" });

  if (events.length === 0) return <p className="text-[11px] text-[var(--foreground-muted)] italic">No evidence events yet.</p>;

  return (
    <ol className="space-y-2">
      {events
        .sort((a, b) => (b.at || "").localeCompare(a.at || ""))
        .map((e, i) => (
          <li key={i} className="flex gap-2 text-[11px]">
            <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${e.dot}`} />
            <div className="min-w-0">
              <span className={`font-semibold ${e.tone}`}>{e.label}</span>
              {e.detail && <span className="text-[var(--foreground-muted)]"> — {e.detail}</span>}
              {e.at && <span className="block text-[10px] text-[var(--foreground-muted)]">{new Date(e.at).toLocaleString()}</span>}
            </div>
          </li>
        ))}
    </ol>
  );
}

function EmptyState({ icon, title, hint, action, onAction }: { icon: React.ReactNode; title: string; hint: string; action?: string; onAction?: () => void }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--surface-hover)] flex items-center justify-center text-[var(--foreground-muted)] mb-3">{icon}</div>
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      <p className="text-[11px] text-[var(--foreground-muted)] mt-1">{hint}</p>
      {action && onAction && (
        <button onClick={onAction} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300">
          <Plus className="w-3.5 h-3.5" /> {action}
        </button>
      )}
    </div>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-[var(--surface-hover)] animate-pulse" />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modals
// ─────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h3 className="text-base font-bold text-[var(--foreground)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">{children}</div>
        <div className="flex gap-3 px-6 py-4 border-t border-[var(--border)]">{footer}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none";

// Ask for the new owner's email + username (both required). The request is then
// routed to the admin / workspace-owner queue for allow/block.
function TransferModal({ source, members, currentOwnerEmail, busy, onClose, onSubmit }: { source: KBSource; members: OrgMember[]; currentOwnerEmail: string; busy?: boolean; onClose: () => void; onSubmit: (email: string, username: string) => void }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  const emailFormatOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const ready = emailFormatOk && username.trim().length > 0;
  const match = ready ? matchMember(members, email, username) : null;
  const isSelf = !!email.trim() && email.trim().toLowerCase() === (currentOwnerEmail || "").toLowerCase();
  const valid = !!match?.ok && !isSelf;

  // Privacy-safe feedback: never reveal whether an email exists or who it
  // belongs to. Only a requester who already knows BOTH the exact email and
  // username gets a positive match; every failure returns the same generic text.
  let hint: { text: string; ok: boolean } | null = null;
  if (email.trim() && !emailFormatOk) hint = { text: "Enter a valid email address.", ok: false };
  else if (isSelf) hint = { text: "That user already owns this source.", ok: false };
  else if (match && !match.ok) hint = { text: "No organization member matches that email and username.", ok: false };
  else if (match?.ok) hint = { text: "Verified — this matches a member of your organization.", ok: true };

  return (
    <ModalShell
      title={`Transfer ownership — ${source.title}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)]">Cancel</button>
          <button onClick={() => onSubmit(email.trim(), username.trim())} disabled={!valid || busy} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Request transfer
          </button>
        </>
      }
    >
      <Field label="New owner email *">
        <input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="new.owner@company.com" className={inputCls} />
      </Field>
      <Field label="New owner username *">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="New owner full name" className={inputCls} />
      </Field>

      {hint && (
        <p className={`flex items-center gap-1.5 text-[11px] ${hint.ok ? "text-emerald-400" : "text-rose-400"}`}>
          {hint.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
          {hint.text}
        </p>
      )}

      <p className="text-[11px] text-[var(--foreground-muted)]">
        The new owner must be an existing member of this organization, and the username must match their account. The request is sent to the <span className="font-semibold text-indigo-400">admin / workspace owner</span> — ownership only changes once they allow it, and the current owner is recorded in the source history.
      </p>
    </ModalShell>
  );
}

function CollectionModal({ edit, busy, onClose, onSave }: { edit?: KBCollection; busy?: boolean; onClose: () => void; onSave: (name: string, description: string) => void }) {
  const [name, setName] = useState(edit?.name || "");
  const [description, setDescription] = useState(edit?.description || "");
  return (
    <ModalShell
      title={edit ? "Edit collection" : "Create collection"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)]">Cancel</button>
          <button onClick={() => onSave(name.trim(), description.trim())} disabled={!name.trim() || busy} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {edit ? "Save" : "Create"}
          </button>
        </>
      }
    >
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brand Guidelines" className={inputCls} />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What this collection holds…" className={`${inputCls} resize-none`} />
      </Field>
    </ModalShell>
  );
}

// Create captures ONLY a name + type. The source is created as a DRAFT and
// opens like a file — author, keywords, citation, content, and match action
// are all edited inline in the source header afterwards.
function CreateSourceModal({ busy, onClose, onCreate }: { busy?: boolean; onClose: () => void; onCreate: (title: string, sourceType: string, file?: File | null, fileText?: string | null, governanceCategory?: string) => void }) {
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState("MANUAL_ARTICLE");
  const [governanceCategory, setGovernanceCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);

  const ACCEPT = ".json,.pdf,.txt,.doc,.docx,application/json,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  // Read the file the moment it's picked: JSON/TXT → text into state (so it
  // can't be lost later); PDF/Word → keep the File for the backend to extract.
  const pickFile = async (f: File | null) => {
    setFileText(null);
    setFile(f);
    if (!f) return;
    const name = f.name.toLowerCase();
    const isText = name.endsWith(".json") || name.endsWith(".txt") || f.type === "application/json" || f.type === "text/plain";
    if (isText) {
      try {
        setFileText(await f.text());
      } catch {
        setFileText(null);
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setFileText(null);
  };

  return (
    <ModalShell
      title="Create source"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)]">Cancel</button>
          <button onClick={() => onCreate(title.trim(), sourceType, file, fileText, governanceCategory)} disabled={!title.trim() || busy} className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Create draft
          </button>
        </>
      }
    >
      <Field label="Source Name">
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2026 Pricing Sheet" className={inputCls} onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) onCreate(title.trim(), sourceType, file, fileText, governanceCategory); }} />
      </Field>
      <Field label="Source Type">
        <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className={inputCls}>
          {SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>
      </Field>
      <Field label="Governance Category">
        <select value={governanceCategory} onChange={(e) => setGovernanceCategory(e.target.value)} className={inputCls}>
          <option value="">— none —</option>
          {GOVERNANCE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Upload file (optional) — JSON, PDF, TXT, or Word">
        <input
          type="file"
          accept={ACCEPT}
          onChange={(e) => pickFile(e.target.files?.[0] || null)}
          className="w-full text-xs text-[var(--foreground-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-white file:text-xs file:font-semibold file:cursor-pointer hover:file:bg-sky-500"
        />
        {file && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
            <Upload className="w-3 h-3" /> {file.name}
            {fileText != null && <span className="text-[var(--foreground-muted)]">({fileText.length} chars loaded)</span>}
            <button onClick={clearFile} className="text-[var(--foreground-muted)] hover:text-rose-400">
              <X className="w-3 h-3" />
            </button>
          </p>
        )}
        <p className="text-[10px] text-[var(--foreground-muted)] mt-1">JSON / TXT load straight into the content. PDF / Word are parsed into text. The content stays fully editable after.</p>
      </Field>
      <p className="text-[11px] text-[var(--foreground-muted)]">
        The source is created as a <span className="font-semibold text-amber-400">Draft</span> and sent to the admin / workspace owner for approval. You can edit the content, author, keywords, and citation after it opens.
      </p>
    </ModalShell>
  );
}
