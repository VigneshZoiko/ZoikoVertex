"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Bot,
  Shield,
  User,
  Target,
  BrainCircuit,
  MessageSquare,
  Link2,
  FileCheck,
  AlertTriangle,
  Loader2,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  AGENT_TYPES,
  AGENT_MODES,
  AGENT_ACTIONS,
  CHANNELS,
  AGENT_TEMPLATES,
} from "@/lib/agentAuthority";
import StatusBadge from "@/components/ui/StatusBadge";

interface Member {
  id: string;
  full_name: string;
  email: string;
}

interface Prompt {
  id: string;
  name: string;
  status: string;
  risk_level?: string;
}

interface Workflow {
  id: string;
  name: string;
  status: string;
  risk_level?: string;
}

interface Policy {
  id: string;
  name: string;
  status: string;
  risk_level?: string;
}

interface KnowledgeSource {
  id: string;
  name: string;
  status: string;
  risk_level?: string;
}

interface AgentTemplateData {
  name?: string;
  purpose?: string;
  type?: string;
  mode?: string;
  risk_level?: string;
  permitted_actions?: string[];
  prohibited_actions?: string[];
  linked_prompts?: string[];
  linked_workflows?: string[];
  linked_policies?: string[];
  linked_knowledge_sources?: string[];
  linked_channels?: string[];
  evidence_required?: boolean;
  approval_required?: boolean;
}

interface CreateAgentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-populate wizard fields from an imported JSON template */
  initialData?: AgentTemplateData;
}

const STEPS = [
  { id: 1, title: "Identity", icon: Bot },
  { id: 2, title: "Type & Mode", icon: BrainCircuit },
  { id: 3, title: "Channels", icon: Globe },
  { id: 4, title: "DRI", icon: User },
  { id: 5, title: "Permissions", icon: Shield },
  { id: 6, title: "Resources", icon: Link2 },
  { id: 7, title: "Checklist", icon: FileCheck },
  { id: 8, title: "Sandbox", icon: ShieldCheck },
  { id: 9, title: "Release", icon: Check },
];

const SANDBOX_CHECKS = [
  {
    id: "offensive",
    label: "Offensive Language",
    description: "Detects profanity, slurs, and inappropriate content",
  },
  {
    id: "harmful",
    label: "Harmful Language",
    description: "Identifies harassment, threats, and dangerous content",
  },
  {
    id: "sexual",
    label: "Sexual Content",
    description: "Adult content and NSFW material detection",
  },
  {
    id: "violence",
    label: "Violence / Self-Harm",
    description: "Violent imagery, self-harm, and dangerous content",
  },
  {
    id: "brand_drift",
    label: "Brand Drift",
    description: "Verifies alignment with brand voice and guidelines",
  },
  {
    id: "platform_format",
    label: "Platform Format",
    description: "Validates character limits and format requirements",
  },
  {
    id: "knowledge_grounding",
    label: "Knowledge Grounding",
    description: "Confirms responses reference attached knowledge",
  },
  {
    id: "unsupported_claims",
    label: "Unsupported Claims",
    description: "Flags statements without evidence or sources",
  },
  {
    id: "competitor",
    label: "Competitor Risk",
    description: "Detects competitor mentions and comparative claims",
  },
  {
    id: "policy_drift",
    label: "Policy Drift",
    description: "Checks against linked policy rules and constraints",
  },
  {
    id: "confidential",
    label: "Confidential Data",
    description: "Prevents exposure of sensitive information",
  },
];

const APPROVER_MAPPING: Record<string, { roles: string[]; sla: string }> = {
  low: { roles: ["Campaign Owner"], sla: "24 hours for standard review" },
  medium: {
    roles: ["Campaign Owner", "AI Governance Lead"],
    sla: "48 hours for standard review",
  },
  high: {
    roles: ["Campaign Owner", "AI Governance Lead", "Brand Governance Lead"],
    sla: "72 hours for elevated review",
  },
  critical: {
    roles: [
      "Campaign Owner",
      "AI Governance Lead",
      "Brand Governance Lead",
      "Compliance Reviewer",
      "Security Admin",
    ],
    sla: "96 hours for critical review",
  },
};

export default function CreateAgentWizard({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: CreateAgentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitAction, setSubmitAction] = useState<
    "draft" | "approval" | "deploy" | null
  >(null);
  // ── FIX: track submit success/error state for user feedback ──
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>(
    [],
  );
  const [showTemplates, setShowTemplates] = useState(true);

  // ── FIX: manual resource input state ──
  const [manualInputs, setManualInputs] = useState({
    prompt: "",
    workflow: "",
    policy: "",
    knowledge: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    purpose: "",
    type: "content",
    mode: "draft_only",
    risk_level: "medium",
    primary_dri_id: "",
    backup_dri_id: "",
    workspace_id: "",
    org_id: "",
    permitted_actions: [] as string[],
    prohibited_actions: [] as string[],
    linked_prompts: [] as string[],
    linked_workflows: [] as string[],
    linked_policies: [] as string[],
    linked_knowledge_sources: [] as string[],
    linked_channels: [] as string[],
    evidence_required: true,
    approval_required: true,
  });

  const [actionInput, setActionInput] = useState({
    permitted: "",
    prohibited: "",
  });

  // ── FIX: reset state (and apply template pre-population) when wizard opens ──
  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
      setSubmitSuccess(null);
      setCurrentStep(1);
      if (initialData) {
        setFormData((prev) => ({
          ...prev,
          name: initialData.name ?? prev.name,
          purpose: initialData.purpose ?? prev.purpose,
          type: initialData.type ?? prev.type,
          mode: initialData.mode ?? prev.mode,
          risk_level: initialData.risk_level ?? prev.risk_level,
          permitted_actions: initialData.permitted_actions ?? prev.permitted_actions,
          prohibited_actions: initialData.prohibited_actions ?? prev.prohibited_actions,
          linked_prompts: initialData.linked_prompts ?? prev.linked_prompts,
          linked_workflows: initialData.linked_workflows ?? prev.linked_workflows,
          linked_policies: initialData.linked_policies ?? prev.linked_policies,
          linked_knowledge_sources: initialData.linked_knowledge_sources ?? prev.linked_knowledge_sources,
          linked_channels: initialData.linked_channels ?? prev.linked_channels,
          evidence_required: initialData.evidence_required ?? prev.evidence_required,
          approval_required: initialData.approval_required ?? prev.approval_required,
        }));
        setShowTemplates(false); // skip the template picker — go straight to step 1
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      try {
        const [membersRes, contextRes] = await Promise.allSettled([
          api.get("/api/v1/team/members"),
          api.get("/api/v1/user/context"),
        ]);

        if (membersRes.status === "fulfilled" && membersRes.value.success) {
          setMembers(membersRes.value.data);
        }
        if (contextRes.status === "fulfilled" && contextRes.value.success) {
          setFormData((prev) => ({
            ...prev,
            org_id: contextRes.value.data.org_id || "",
            workspace_id: contextRes.value.data.workspace_id || "",
          }));
        }

        let workspaceId =
          contextRes.status === "fulfilled" && contextRes.value.success
            ? contextRes.value.data.workspace_id || ""
            : "";

        if (!workspaceId) {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const { data: member } = await supabase
              .from("workspace_members")
              .select("workspace_id")
              .eq("user_id", user.id)
              .maybeSingle();

            workspaceId = member?.workspace_id || "";
          }
        }

        if (!workspaceId) {
          setPrompts([]);
          setWorkflows([]);
          setPolicies([]);
          setKnowledgeSources([]);
          return;
        }

        const [promptRes, workflowRes, knowledgeRes] = await Promise.allSettled(
          [
            supabase
              .from("prompts")
              .select("id, name, status, risk_tier")
              .eq("workspace_id", workspaceId)
              .limit(50),
            supabase
              .from("workflow_templates")
              .select("id, name, status, risk_level")
              .eq("workspace_id", workspaceId)
              .limit(50),
            supabase
              .from("knowledge_sources")
              .select("id, title, status, risk_tier")
              .eq("workspace_id", workspaceId)
              .limit(50),
          ],
        );

        if (promptRes.status === "fulfilled") {
          setPrompts(
            (promptRes.value.data || []).map((row) => ({
              id: row.id,
              name: row.name,
              status: row.status,
              risk_level: (row as { risk_tier?: string }).risk_tier,
            })),
          );
        } else {
          setPrompts([]);
        }

        if (workflowRes.status === "fulfilled") {
          setWorkflows(workflowRes.value.data || []);
        } else {
          setWorkflows([]);
        }

        // Fetch governance rules as the policy list for step 6
        try {
          const policiesRes = await api.get("/api/v1/governance/rules");
          if (policiesRes?.success && Array.isArray(policiesRes.data)) {
            setPolicies(
              policiesRes.data.map((r: any) => ({
                id: r.id,
                name: r.name || r.rule_name || r.title || "Governance Rule",
                status: r.status || "ACTIVE",
                risk_level: r.risk_level || r.risk_tier,
              })),
            );
          } else {
            setPolicies([]);
          }
        } catch {
          setPolicies([]);
        }

        if (knowledgeRes.status === "fulfilled") {
          setKnowledgeSources(
            (knowledgeRes.value.data || []).map((row) => ({
              id: row.id,
              name: (row as { title?: string }).title || "Untitled",
              status: row.status,
              risk_level: (row as { risk_tier?: string }).risk_tier,
            })),
          );
        } else {
          setKnowledgeSources([]);
        }
      } catch (err) {
        console.warn("Wizard data fetch partially failed", err);
      }
    };
    fetchData();
  }, [isOpen]);

  const handleBack = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(null);
    if (currentStep === 2 && !showTemplates) {
      setShowTemplates(true);
      setCurrentStep(1);
    } else if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, showTemplates]);

  const handleNext = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(null);
    if (currentStep === 1 && showTemplates) {
      setShowTemplates(false);
    } else if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, showTemplates]);

  const handleTemplateSelect = (template: (typeof AGENT_TEMPLATES)[number]) => {
    setFormData((prev) => ({
      ...prev,
      type: template.defaultType,
      mode: template.defaultMode,
      risk_level: template.defaultRisk,
      permitted_actions: [...template.defaultActions],
      prohibited_actions: [...template.defaultProhibited],
      linked_channels: [...template.defaultChannels],
    }));
    setShowTemplates(false);
  };

  const toggleChannel = (channelId: string) => {
    setFormData((prev) => ({
      ...prev,
      linked_channels: prev.linked_channels.includes(channelId)
        ? prev.linked_channels.filter((c) => c !== channelId)
        : [...prev.linked_channels, channelId],
    }));
  };

  const toggleAction = (actionId: string, type: "permitted" | "prohibited") => {
    const key =
      type === "permitted" ? "permitted_actions" : "prohibited_actions";
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].includes(actionId)
        ? prev[key].filter((a) => a !== actionId)
        : [...prev[key], actionId],
    }));
  };

  const toggleLinked = (
    id: string,
    type: "prompt" | "workflow" | "policy" | "knowledge",
  ) => {
    const key =
      type === "prompt"
        ? "linked_prompts"
        : type === "workflow"
          ? "linked_workflows"
          : type === "policy"
            ? "linked_policies"
            : "linked_knowledge_sources";
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter((i) => i !== id)
        : [...prev[key], id],
    }));
  };

  // ── FIX: manual resource helpers ──
  const addManualResource = (
    type: "prompt" | "workflow" | "policy" | "knowledge",
    value: string,
  ) => {
    if (!value.trim()) return;
    const key =
      type === "prompt"
        ? "linked_prompts"
        : type === "workflow"
          ? "linked_workflows"
          : type === "policy"
            ? "linked_policies"
            : "linked_knowledge_sources";
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].includes(value.trim())
        ? prev[key]
        : [...prev[key], value.trim()],
    }));
    setManualInputs((prev) => ({ ...prev, [type]: "" }));
  };

  const removeManualResource = (
    type: "prompt" | "workflow" | "policy" | "knowledge",
    id: string,
  ) => {
    const key =
      type === "prompt"
        ? "linked_prompts"
        : type === "workflow"
          ? "linked_workflows"
          : type === "policy"
            ? "linked_policies"
            : "linked_knowledge_sources";
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].filter((i) => i !== id),
    }));
  };

  const checklist = [
    {
      key: "identity",
      label: "Identity fields complete",
      done: Boolean(formData.name && formData.primary_dri_id && formData.type),
    },
    {
      key: "channels",
      label: "At least one channel selected",
      done: formData.linked_channels.length > 0,
    },
    {
      key: "permissions",
      label: "At least one action permitted",
      done: formData.permitted_actions.length > 0,
    },
    {
      key: "prompt",
      label: "At least one prompt attached",
      done: formData.linked_prompts.length > 0,
    },
    {
      key: "workflow",
      label: "At least one workflow assigned",
      done: formData.linked_workflows.length > 0,
    },
    {
      key: "knowledge",
      label: "At least one knowledge source attached",
      done: formData.linked_knowledge_sources.length > 0,
    },
    {
      key: "evidence",
      label: "Evidence capture enabled",
      done: formData.evidence_required,
    },
    {
      key: "approval",
      label: "Approval gate configured",
      done: formData.approval_required,
    },
  ];

  const checklistComplete = checklist.filter((c) => c.done).length;
  const allChecklistDone = checklist.every((c) => c.done);

  const approvers =
    APPROVER_MAPPING[formData.risk_level] || APPROVER_MAPPING.medium;

  const resolveWorkspaceContext = useCallback(async () => {
    let workspaceId = formData.workspace_id;
    let orgId = formData.org_id;

    try {
      const ctx = await api.get("/api/v1/user/context");
      if (ctx?.success && ctx?.data) {
        workspaceId = ctx.data.workspace_id || workspaceId;
        orgId = ctx.data.org_id || orgId;
      }
    } catch {
      // Fall through to direct Supabase fallback
    }

    if (!workspaceId || !orgId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: member } = await supabase
          .from("workspace_members")
          .select("workspace_id, workspaces(org_id)")
          .eq("user_id", user.id)
          .maybeSingle();

        workspaceId = member?.workspace_id || workspaceId;
        const workspace =
          member?.workspaces && Array.isArray(member.workspaces)
            ? member.workspaces[0]
            : member?.workspaces;
        const workspaceOrgId =
          workspace &&
          typeof workspace === "object" &&
          "org_id" in workspace &&
          typeof workspace.org_id === "string"
            ? workspace.org_id
            : "";
        orgId = workspaceOrgId || orgId;
      }
    }

    setFormData((prev) => ({
      ...prev,
      workspace_id: workspaceId || "",
      org_id: orgId || "",
    }));

    return { workspaceId, orgId };
  }, [formData.org_id, formData.workspace_id]);

  const handleSubmit = async (
    action: "draft" | "approval" | "deploy" = "draft",
  ) => {
    setSubmitError(null);
    setSubmitSuccess(null);
    setLoading(true);
    setSubmitAction(action);

    try {
      // ── STEP 1: Ensure workspace_id / org_id are populated ──────────────────
      // If the context fetch on mount failed (race condition, slow network, etc.)
      // these will still be "". Re-fetch now, right before submitting.
      const resolvedContext = await resolveWorkspaceContext();
      let workspaceId = resolvedContext.workspaceId;
      let orgId = resolvedContext.orgId;

      if (!workspaceId || !orgId) {
        try {
          const ctx = await api.get("/api/v1/user/context");
          if (ctx?.success && ctx?.data) {
            workspaceId = ctx.data.workspace_id || workspaceId;
            orgId = ctx.data.org_id || orgId;
            // Also update formData state so subsequent submits don't re-fetch
            setFormData((prev) => ({
              ...prev,
              workspace_id: workspaceId,
              org_id: orgId,
            }));
          }
        } catch {
          // Context fetch failed — proceed with whatever we have.
          // The backend will return a clear validation error if still missing.
        }
      }

      // ── STEP 2: Build clean payload — all fields the backend schema requires ─
      const payload: Record<string, unknown> = {
        // Required strings
        name: formData.name.trim(),
        type: formData.type,
        mode: formData.mode,
        risk_level: formData.risk_level,
        workspace_id: workspaceId || undefined,
        org_id: orgId || undefined,

        // Optional strings — send null when empty, never undefined
        purpose: formData.purpose.trim() || null,

        // Optional FK strings — send only when present
        primary_dri_id: formData.primary_dri_id,
        backup_dri_id: formData.backup_dri_id || undefined,

        // Booleans
        evidence_required: formData.evidence_required,
        approval_required: formData.approval_required,

        // Arrays — always send (empty array is valid; undefined is not)
        permitted_actions: formData.permitted_actions,
        prohibited_actions: formData.prohibited_actions,
        linked_channels: formData.linked_channels,
        linked_prompts: formData.linked_prompts,
        linked_workflows: formData.linked_workflows,
        linked_policies: formData.linked_policies,
        linked_knowledge_sources: formData.linked_knowledge_sources,
      };

      // ── DEV logging ─────────────────────────────────────────────────────────
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[CreateAgentWizard] POST /api/v1/agents payload:",
          JSON.stringify(payload, null, 2),
        );
      }

      // ── STEP 3: Submit ───────────────────────────────────────────────────────
      const result = await api.post("/api/v1/agents", payload);

      // ── STEP 3a: Detect expired/missing session before any other branching
      if (result?.code === "AUTH_EXPIRED" || result?.status === 401) {
        setSubmitError(
          result?.error ||
            "Your session has expired. Please log in again to create the agent.",
        );
        setTimeout(() => {
          if (typeof window !== "undefined") {
            const redirect = encodeURIComponent(window.location.pathname);
            window.location.href = `/login?redirect=${redirect}`;
          }
        }, 1500);
        return;
      }

      if (result?.success) {
        const agentId = result?.data?.id;

        if ((action === "approval" || action === "deploy") && agentId) {
          const approvalRes = await api.post(
            `/api/v1/agents/${agentId}/approval/request`,
            {
              notes:
                action === "deploy"
                  ? `Created from Agent Studio and queued for approval before deployment for ${formData.name}.`
                  : `Created from Agent Studio and submitted for approval for ${formData.name}.`,
            },
          );

          if (!approvalRes?.success) {
            throw new Error(
              typeof approvalRes?.error === "string"
                ? approvalRes.error
                : "Agent was created, but the approval workflow could not be started.",
            );
          }
        }

        const msgs: Record<string, string> = {
          draft: `Agent "${formData.name}" saved as draft.`,
          approval: `Agent "${formData.name}" was created and submitted for approval.`,
          deploy: `Agent "${formData.name}" was created and queued for approval. Deployment unlocks after approval.`,
        };
        setSubmitSuccess(msgs[action]);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        const raw = result?.error || result?.message || result?.detail || "";
        const isServerCrash =
          typeof raw === "string" &&
          (raw.toLowerCase().includes("internal server error") ||
            raw === "" ||
            raw === "Internal Server Error");

        // Pull the nested PostgREST error detail if present
        const pgrst = result?.data?.error;
        const pgrstDetail =
          pgrst && typeof pgrst === "object"
            ? `PostgREST: ${pgrst.message || ""} (code: ${pgrst.code || "?"})`
            : null;

        if (isServerCrash) {
          setSubmitError(
            pgrstDetail
              ? `Backend error — ${pgrstDetail}. Most likely cause: a column in the agents table is missing (linked_prompts, linked_workflows, linked_policies, or linked_knowledge_sources). Run the migration below.`
              : "The server crashed (500). Check backend logs — likely a missing DB column or null FK constraint.",
          );
        } else {
          const clean =
            typeof raw === "string"
              ? raw.replace(/Invalid input:\s*/gi, "")
              : "The server rejected the request. Check all required fields.";
          setSubmitError(pgrstDetail ? `${clean} — ${pgrstDetail}` : clean);
        }
        console.error("[CreateAgentWizard] API rejected payload:", result);
      }
    } finally {
      setLoading(false);
      setSubmitAction(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--card)] border border-[var(--card-border)] w-full max-w-3xl mx-4 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--surface)]/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Hire New Agent</h2>
              <p className="text-xs text-[var(--foreground-muted)]">
                Step {currentStep} of {STEPS.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--surface-hover)] rounded-full transition-all"
          >
            <X className="w-5 h-5 text-[var(--foreground-muted)]" />
          </button>
        </div>

        {/* ── Step indicator ── */}
        <div className="px-6 py-3 bg-[var(--surface)]/30 border-b border-[var(--card-border)] flex gap-2 overflow-x-auto shrink-0">
          {STEPS.map((step) => {
            const done = currentStep > step.id;
            const active = currentStep === step.id;
            return (
              <div key={step.id} className="flex items-center gap-1.5 shrink-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                    done
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : active
                        ? "bg-indigo-500 border-indigo-500 text-white"
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)]"
                  }`}
                >
                  {done ? <Check className="w-3 h-3" /> : step.id}
                </div>
                <span
                  className={`text-xs font-semibold shrink-0 ${
                    done
                      ? "text-emerald-500"
                      : active
                        ? "text-[var(--foreground)]"
                        : "text-[var(--foreground-muted)]"
                  }`}
                >
                  {step.title}
                </span>
                {step.id < STEPS.length && (
                  <div className="w-3 h-[1px] bg-[var(--border)] ml-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ── Step 1: Identity + Templates ── */}
          {currentStep === 1 && showTemplates && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">
                  Choose a Template (Optional)
                </label>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Start with a pre-configured agent type or build from scratch
                  below.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {AGENT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="flex items-start gap-3 p-3 rounded-xl border bg-[var(--background)] border-[var(--border)] hover:border-indigo-500/50 transition-all text-left"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-xs text-[var(--foreground)]">
                          {template.label}
                        </div>
                        <div className="text-[10px] text-[var(--foreground-muted)] mt-1 line-clamp-2">
                          {template.description}
                        </div>
                        <div className="flex gap-1.5 mt-2">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              template.defaultRisk === "low"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : template.defaultRisk === "medium"
                                  ? "bg-amber-500/10 text-amber-500"
                                  : "bg-rose-500/10 text-rose-500"
                            }`}
                          >
                            {template.defaultRisk.toUpperCase()}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                            {template.defaultMode.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowTemplates(false)}
                className="w-full py-2 text-xs font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-dashed border-[var(--border)] rounded-xl transition-all"
              >
                Skip templates — Build from scratch
              </button>
            </div>
          )}

          {currentStep === 1 && !showTemplates && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">
                  Agent Name
                </label>
                <input
                  type="text"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-[var(--foreground)]"
                  placeholder="e.g. Nexus Content Lead"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">
                  Business Purpose
                </label>
                <textarea
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all h-28 resize-none text-[var(--foreground)]"
                  placeholder="What is this agent's primary objective?"
                  value={formData.purpose}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      purpose: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">
                  Risk Level
                </label>
                <div className="flex gap-3">
                  {["low", "medium", "high", "critical"].map((risk) => (
                    <button
                      key={risk}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, risk_level: risk }))
                      }
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        formData.risk_level === risk
                          ? risk === "low"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                            : risk === "medium"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                              : risk === "high"
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                                : "bg-rose-600/10 border-rose-600/30 text-rose-600"
                          : "bg-[var(--background)] border-[var(--border)] text-[var(--foreground-muted)]"
                      }`}
                    >
                      {risk.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowTemplates(true)}
                className="text-xs text-indigo-500 hover:underline"
              >
                ← Browse templates
              </button>
            </div>
          )}

          {/* ── Step 2: Type & Mode ── */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">
                  Agent Type
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {AGENT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, type: type.id }))
                      }
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        formData.type === type.id
                          ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500"
                          : "bg-[var(--background)] border-[var(--border)] hover:border-indigo-500/50"
                      }`}
                    >
                      <Target
                        className={`w-5 h-5 shrink-0 ${formData.type === type.id ? "text-indigo-500" : "text-[var(--foreground-muted)]"}`}
                      />
                      <div>
                        <div className="font-semibold text-sm text-[var(--foreground)]">
                          {type.label}
                        </div>
                        <div className="text-[11px] text-[var(--foreground-muted)]">
                          {type.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">
                  Autonomy Mode
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {AGENT_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, mode: mode.id }))
                      }
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                        formData.mode === mode.id
                          ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500"
                          : "bg-[var(--background)] border-[var(--border)] hover:border-indigo-500/50"
                      }`}
                    >
                      <BrainCircuit
                        className={`w-5 h-5 mt-0.5 shrink-0 ${formData.mode === mode.id ? "text-indigo-500" : "text-[var(--foreground-muted)]"}`}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-[var(--foreground)]">
                          {mode.label}
                        </div>
                        <div className="text-[11px] text-[var(--foreground-muted)]">
                          {mode.description}
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded border shrink-0 ${formData.mode === mode.id ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)]"}`}
                      >
                        {mode.targetLevel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Channels ── */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">
                    Channel Scope <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-[var(--foreground-muted)]">
                    {formData.linked_channels.length} selected
                  </span>
                </div>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Select which platforms this agent can operate on.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {CHANNELS.map((channel) => {
                    const selected = formData.linked_channels.includes(
                      channel.id,
                    );
                    return (
                      <button
                        key={channel.id}
                        onClick={() => toggleChannel(channel.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          selected
                            ? "bg-indigo-500/10 border-indigo-500/30"
                            : "bg-[var(--background)] border-[var(--border)] hover:border-indigo-500/30"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{channel.icon}</span>
                          <span className="text-xs font-semibold text-[var(--foreground)]">
                            {channel.label}
                          </span>
                        </div>
                        <div className="text-[9px] text-[var(--foreground-muted)]">
                          {channel.maxChars.toLocaleString()} chars
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: DRI ── */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">
                  Primary DRI <span className="text-rose-500">*</span>
                </label>
                <select
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 outline-none transition-all text-[var(--foreground)]"
                  value={formData.primary_dri_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      primary_dri_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Select a team member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id} className="text-black">
                      {m.full_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-emerald-500 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Responsible for all agent actions and policy compliance.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">
                  Backup DRI
                </label>
                <select
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 px-4 outline-none transition-all text-[var(--foreground)]"
                  value={formData.backup_dri_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      backup_dri_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Select a backup</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id} className="text-black">
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── Step 5: Permissions ── */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-emerald-500">
                    Permitted Actions
                  </label>
                  <span className="text-[10px] text-[var(--foreground-muted)]">
                    {formData.permitted_actions.length} selected
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {AGENT_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        if (!formData.prohibited_actions.includes(action.id)) {
                          toggleAction(action.id, "permitted");
                        }
                      }}
                      disabled={formData.prohibited_actions.includes(action.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        formData.permitted_actions.includes(action.id)
                          ? `bg-emerald-500/10 border-emerald-500/30 text-emerald-500`
                          : formData.prohibited_actions.includes(action.id)
                            ? "bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)] opacity-30 cursor-not-allowed"
                            : "bg-[var(--background)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-indigo-500/30"
                      }`}
                    >
                      <div className="text-xs font-bold">{action.label}</div>
                      <div className="text-[9px] uppercase tracking-widest mt-0.5 opacity-60">
                        {action.risk}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-rose-500">
                    Prohibited Actions
                  </label>
                  <span className="text-[10px] text-[var(--foreground-muted)]">
                    {formData.prohibited_actions.length} selected
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {AGENT_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        if (!formData.permitted_actions.includes(action.id)) {
                          toggleAction(action.id, "prohibited");
                        }
                      }}
                      disabled={formData.permitted_actions.includes(action.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        formData.prohibited_actions.includes(action.id)
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                          : formData.permitted_actions.includes(action.id)
                            ? "bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)] opacity-30 cursor-not-allowed"
                            : "bg-[var(--background)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-rose-500/30"
                      }`}
                    >
                      <div className="text-xs font-bold">{action.label}</div>
                      <div className="text-[9px] uppercase tracking-widest mt-0.5 opacity-60">
                        {action.risk}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 6: Resources (with manual input) ── */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              {(
                [
                  {
                    key: "prompt" as const,
                    label: "Prompts",
                    items: prompts,
                    icon: MessageSquare,
                    linked: formData.linked_prompts,
                    placeholder: "Enter prompt name or ID, press Enter",
                    hint: "e.g. Brand Voice Prompt v2",
                  },
                  {
                    key: "workflow" as const,
                    label: "Workflows",
                    items: workflows,
                    icon: BrainCircuit,
                    linked: formData.linked_workflows,
                    placeholder: "Enter workflow name or ID, press Enter",
                    hint: "e.g. Campaign Launch Workflow",
                  },
                  {
                    key: "policy" as const,
                    label: "Policies",
                    items: policies,
                    icon: Shield,
                    linked: formData.linked_policies,
                    placeholder: "Enter policy name or ID, press Enter",
                    hint: "e.g. Brand Safety Policy",
                  },
                  {
                    key: "knowledge" as const,
                    label: "Knowledge Sources",
                    items: knowledgeSources,
                    icon: FileCheck,
                    linked: formData.linked_knowledge_sources,
                    placeholder:
                      "Enter knowledge source name or ID, press Enter",
                    hint: "e.g. Brand Guidelines KB",
                  },
                ] as const
              ).map(
                ({
                  key,
                  label,
                  items,
                  icon: Icon,
                  linked,
                  placeholder,
                  hint,
                }) => (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-indigo-400" />
                      <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">
                        {label}
                      </label>
                      <span className="text-[10px] text-[var(--foreground-muted)]">
                        ({linked.length} attached)
                      </span>
                    </div>

                    {/* Manual input — always visible */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl py-2.5 px-4 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-[var(--foreground-muted)]"
                        placeholder={placeholder}
                        value={manualInputs[key]}
                        onChange={(e) =>
                          setManualInputs((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addManualResource(key, manualInputs[key]);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          addManualResource(key, manualInputs[key])
                        }
                        disabled={!manualInputs[key].trim()}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--foreground-muted)]">
                      💡 {hint}
                    </p>

                    {/* Attached tags */}
                    {linked.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {linked.map((id) => {
                          const matched = items.find(
                            (it) => it.id === id || it.name === id,
                          );
                          return (
                            <div
                              key={id}
                              className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full px-3 py-1 text-xs font-semibold"
                            >
                              <Check className="w-3 h-3" />
                              <span>{matched?.name || id}</span>
                              <button
                                type="button"
                                onClick={() => removeManualResource(key, id)}
                                className="ml-1 hover:text-rose-400 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Fetched items list */}
                    {items.length > 0 ? (
                      <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
                        {items.map((item) => {
                          const selected = linked.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleLinked(item.id, key)}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                                selected
                                  ? "bg-indigo-500/10 border-indigo-500/30"
                                  : "bg-[var(--background)] border-[var(--border)] hover:border-indigo-500/30"
                              }`}
                            >
                              <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge status={item.status} />
                                {selected && (
                                  <Check className="w-3 h-3 text-indigo-500" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-[var(--foreground-muted)] italic">
                        No {label.toLowerCase()} found in workspace — use the
                        input above to add manually.
                      </p>
                    )}
                    <div className="border-b border-[var(--border)]" />
                  </div>
                ),
              )}
            </div>
          )}

          {/* ── Step 7: Checklist ── */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  Activation Checklist
                </h3>
                <span className="text-xs text-[var(--foreground-muted)] ml-auto">
                  {checklistComplete}/{checklist.length} complete
                </span>
              </div>
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center gap-3 p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl"
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        item.done
                          ? "bg-emerald-500 text-white"
                          : "bg-[var(--surface)] border border-[var(--border)]"
                      }`}
                    >
                      {item.done && <Check className="w-3 h-3" />}
                    </div>
                    <span
                      className={`text-xs font-medium ${item.done ? "text-emerald-500" : "text-[var(--foreground-muted)]"}`}
                    >
                      {item.label}
                    </span>
                    {!item.done && (
                      <span className="text-[9px] text-amber-500 ml-auto">
                        Action required in step{" "}
                        {item.key === "identity"
                          ? 1
                          : item.key === "channels"
                            ? 3
                            : item.key === "permissions"
                              ? 5
                              : item.key === "prompt" ||
                                  item.key === "workflow" ||
                                  item.key === "knowledge"
                                ? 6
                                : 7}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {!allChecklistDone && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-500">
                    Complete all checklist items to enable full deployment. You
                    can still save as draft or request approval.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 8: Sandbox ── */}
          {currentStep === 8 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">
                    Sandbox Safety Tests
                  </h3>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mb-4">
                  These mandatory safety checks will run automatically after
                  agent creation, before activation.
                </p>
                <div className="space-y-2">
                  {SANDBOX_CHECKS.map((check) => (
                    <div
                      key={check.id}
                      className="flex items-center gap-3 p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg"
                    >
                      <div className="w-4 h-4 rounded border border-indigo-500/30 bg-indigo-500/5 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-[var(--foreground)]">
                          {check.label}
                        </div>
                        <div className="text-[9px] text-[var(--foreground-muted)]">
                          {check.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-500">
                      Target Autonomy Level
                    </div>
                    <div className="text-lg font-black text-[var(--foreground)]">
                      {formData.mode === "draft_only"
                        ? "L0 - No Autonomy"
                        : formData.mode === "recommend_only"
                          ? "L1 - Recommend Only"
                          : formData.mode === "shadow"
                            ? "L2 - Shadow Mode"
                            : formData.mode === "human_approval_required"
                              ? "L3 - Approval Required"
                              : "L4 - Limited Autonomy"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-[var(--foreground-muted)]">
                      Risk Tier
                    </div>
                    <div
                      className={`text-lg font-black ${
                        formData.risk_level === "low"
                          ? "text-emerald-500"
                          : formData.risk_level === "medium"
                            ? "text-amber-500"
                            : "text-rose-500"
                      }`}
                    >
                      {formData.risk_level.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-[var(--surface)]/50 border border-[var(--border)] rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs text-[var(--foreground-muted)]">
                  Sandbox tests run in a contained environment. Agent will
                  remain in <strong>Draft</strong> status until all tests pass.
                </span>
              </div>
            </div>
          )}

          {/* ── Step 9: Release ── */}
          {currentStep === 9 && (
            <div className="space-y-5 animate-in zoom-in-95 duration-300">
              <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm flex items-center gap-2 text-[var(--foreground)]">
                  <Bot className="w-5 h-5 text-indigo-500" />
                  Agent Operating Contract
                </h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  {[
                    { label: "Agent", value: formData.name },
                    { label: "Type", value: formData.type },
                    { label: "Mode", value: formData.mode.replace(/_/g, " ") },
                    { label: "Risk", value: formData.risk_level },
                    {
                      label: "Primary DRI",
                      value: members.find(
                        (m) => m.id === formData.primary_dri_id,
                      )?.full_name,
                    },
                    {
                      label: "Channels",
                      value: `${formData.linked_channels.length} selected`,
                    },
                    {
                      label: "Actions",
                      value: `${formData.permitted_actions.length} permitted, ${formData.prohibited_actions.length} prohibited`,
                    },
                    {
                      label: "Prompts",
                      value: `${formData.linked_prompts.length} attached`,
                    },
                    {
                      label: "Workflows",
                      value: `${formData.linked_workflows.length} assigned`,
                    },
                    {
                      label: "Knowledge",
                      value: `${formData.linked_knowledge_sources.length} sources`,
                    },
                    {
                      label: "Evidence",
                      value: formData.evidence_required
                        ? "Enabled"
                        : "Disabled",
                    },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">
                        {row.label}
                      </div>
                      <div className="font-semibold text-[var(--foreground)] text-xs">
                        {row.value || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {process.env.NODE_ENV !== "production" && currentStep === 9 && (
                <details className="rounded-xl border border-[var(--border)] bg-[var(--background)] text-[10px]">
                  <summary className="px-4 py-2 cursor-pointer font-bold text-[var(--foreground-muted)] select-none">
                    🛠 Debug: Payload preview (dev only)
                  </summary>
                  <pre className="px-4 pb-3 text-[var(--foreground-muted)] overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(
                      {
                        name: formData.name || "(empty — REQUIRED)",
                        purpose: formData.purpose || null,
                        type: formData.type,
                        mode: formData.mode,
                        risk_level: formData.risk_level,
                        status: "DRAFT / IN_REVIEW / ACTIVE",
                        primary_dri_id:
                          formData.primary_dri_id || "(empty — REQUIRED)",
                        backup_dri_id: formData.backup_dri_id || "(not set)",
                        workspace_id:
                          formData.workspace_id || "(empty — may cause 500)",
                        org_id: formData.org_id || "(empty — may cause 500)",
                        permitted_actions: formData.permitted_actions,
                        prohibited_actions: formData.prohibited_actions,
                        linked_channels: formData.linked_channels,
                        linked_prompts: formData.linked_prompts,
                        linked_workflows: formData.linked_workflows,
                        linked_policies: formData.linked_policies,
                        linked_knowledge_sources:
                          formData.linked_knowledge_sources,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              )}

              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-amber-500">
                    Required Approvers ({formData.risk_level} risk)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {approvers.roles.map((role) => (
                    <span
                      key={role}
                      className="px-2 py-1 text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded"
                    >
                      {role}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-[var(--foreground-muted)]">
                  SLA: {approvers.sla}
                </div>
              </div>

              {formData.prohibited_actions.length > 0 && (
                <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                  <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">
                    Hard Prohibitions
                  </div>
                  <div className="text-[11px] text-[var(--foreground-muted)]">
                    Agent is prohibited from:{" "}
                    {formData.prohibited_actions.join(", ")}
                  </div>
                </div>
              )}

              {/* ── FIX: inline success message ── */}
              {submitSuccess && (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in fade-in duration-200">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <p className="text-sm font-medium text-emerald-500">
                    {submitSuccess}
                  </p>
                </div>
              )}

              {/* ── FIX: inline error message ── */}
              {submitError && (
                <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in fade-in duration-200">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-rose-500">
                      Submission failed
                    </p>
                    <p className="text-xs text-rose-400">{submitError}</p>
                    <p className="text-[10px] text-[var(--foreground-muted)]">
                      Check your connection and try again. Your form data is
                      preserved.
                    </p>
                  </div>
                </div>
              )}

              {/* ── FIX: checklist warning if not all done ── */}
              {!allChecklistDone && !submitSuccess && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-amber-500 font-semibold">
                      Checklist incomplete ({checklistComplete}/
                      {checklist.length})
                    </p>
                    <p className="text-[10px] text-amber-400 mt-0.5">
                      &quot;Queue for Approval&quot; requires a complete checklist. You
                      can still save as draft or request approval now.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-[var(--card-border)] bg-[var(--surface)]/50 flex justify-between items-center shrink-0">
          <button
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[var(--foreground-muted)] hover:text-[var(--foreground)] disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep < STEPS.length ? (
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !showTemplates && !formData.name) ||
                (currentStep === 3 && formData.linked_channels.length === 0) ||
                (currentStep === 4 && !formData.primary_dri_id)
              }
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            /* ── FIX: Release step buttons — all three always enabled, errors shown inline ── */
            <div className="flex gap-2">
              {/* Save as Draft — always available, no checklist gate */}
              <button
                onClick={() => handleSubmit("draft")}
                disabled={loading || !!submitSuccess}
                className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] px-4 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {loading && submitAction === "draft" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileCheck className="w-4 h-4" />
                )}
                {loading && submitAction === "draft"
                  ? "Saving..."
                  : "Save as Draft"}
              </button>

              {/* Request Approval — always available, no checklist gate */}
              <button
                onClick={() => handleSubmit("approval")}
                disabled={loading || !!submitSuccess}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50"
              >
                {loading && submitAction === "approval" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                {loading && submitAction === "approval"
                  ? "Requesting..."
                  : "Request Approval"}
              </button>

              {/* Deploy After Approval — gated on checklist, shows tooltip if incomplete */}
              <div className="relative group">
                <button
                  onClick={() => handleSubmit("deploy")}
                  disabled={loading || !allChecklistDone || !!submitSuccess}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && submitAction === "deploy" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Queuing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Queue for Approval
                    </>
                  )}
                </button>
                {/* ── FIX: tooltip explaining why deploy is disabled ── */}
                {!allChecklistDone && (
                  <div className="absolute bottom-full right-0 mb-2 w-52 p-2 bg-[var(--card)] border border-[var(--card-border)] rounded-xl text-[10px] text-[var(--foreground-muted)] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Complete all {checklist.length} checklist items to enable
                    approval queueing. ({checklistComplete}/{checklist.length}{" "}
                    done)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
