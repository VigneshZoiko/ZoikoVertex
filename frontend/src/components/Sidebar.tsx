"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Activity,
  Cpu,
  ImageIcon,
  Calendar,
  ClipboardCheck,
  ShieldCheck,
  ListChecks,
  Gavel,
  AlertOctagon,
  Bot,
  Shield,
  Link2,
  ClipboardList,
  CheckSquare,
  Settings,
  LogOut,
  Users,
  HelpCircle,
  ChevronDown,
  MessageSquare,
  GitBranch,
  LineChart,
  BookOpen,
  MessageSquareCode,
  Scale,
  BookMarked,
  ShieldAlert,
  FileSearch,
  Archive,
  Database,
  Globe,
  Sliders,
  ToggleRight,
  Zap,
  Webhook,
  HeartPulse,
  Building2,
  CreditCard,
  TrendingUp,
  FolderKanban,
  Inbox,
  MonitorPlay,
  Fingerprint,
  Bell,
  Eye,
  Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useRealtimeNotifications } from "@/lib/hooks/useRealtimeNotifications";
import { useDraftGuard } from "@/lib/context/DraftGuardContext";
import { useNotifications } from "@/lib/context/NotificationContext";
import { useRoleContext } from "@/lib/context/RoleContext";
import { usePlan } from "@/lib/hooks/usePlan";
import { type Feature } from "@/lib/planFeatures";
import DiscardModal from "@/components/DiscardModal";
import PlanUpgradeModal from "@/components/PlanUpgradeModal";
import { ROLE_GROUP_MAPPING } from "@/lib/roles";

/* ─────────────────────────────────────────────
   Types
 ───────────────────────────────────────────── */
type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  badge?: boolean;
  dirty?: boolean;
  plan?: Feature;   // minimum feature required; omit = available on all plans
};

type NavGroup = {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
};

/* ─────────────────────────────────────────────
   Navigation structure — strict role mapping per docs
   Canonical order: Command → Media → Validation → Agents → Governance → Integrations → Access → Admin
 ───────────────────────────────────────────── */

// Roles that see every item (convenience constant)
const ALL_ROLES = [
  "ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AGENT_ARCHITECT","AGENT_OPERATOR",
  "KNOWLEDGE_MANAGER","CAMPAIGN_MANAGER","CREATOR","REVIEWER","VALIDATOR","APPROVER",
  "PUBLISHER","COMPLIANCE_REVIEWER","AUDITOR","SECURITY_ADMIN","PRIVACY_ADMIN",
  "BRAND_REVIEWER","DEVELOPER","EXTERNAL_COLLABORATOR","VIEWER",
] as const;

const NAV_GROUPS: NavGroup[] = [
  // ── Platform Owner — internal superadmin only ─────────────────────────────
  {
    id: "platform",
    label: "Platform Owner",
    icon: Shield,
    items: [
      { name: "Governance Node",  href: "/superadmin",           icon: Shield,      roles: ["SUPERADMIN"] },
      { name: "Global Analytics", href: "/superadmin/analytics", icon: LineChart,   roles: ["SUPERADMIN"] },
      { name: "Support Queue",    href: "/superadmin/tickets",   icon: MessageSquare, roles: ["SUPERADMIN"] },
    ],
  },

  // ── Command — executive & operational visibility ──────────────────────────
  {
    id: "command",
    label: "Command",
    icon: LayoutDashboard,
    items: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: [...ALL_ROLES],
      },
      {
        name: "Operations Feed",
        href: "/operations",
        icon: Activity,
        // Live agent/content/publishing event stream — operators & managers
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AGENT_OPERATOR","CAMPAIGN_MANAGER","PUBLISHER"],
      },
      {
        name: "Insights & ROI",
        href: "/analytics",
        icon: TrendingUp,
        // Analytics access: managers, auditors, compliance, publishers
        roles: ["ADMIN","WORKSPACE_OWNER","CAMPAIGN_MANAGER","AUDITOR","COMPLIANCE_REVIEWER","PUBLISHER"],
      },
      {
        name: "Resource Monitoring",
        href: "/resources",
        icon: Cpu,
        // Token/AI spend/compute — technical admins only
        roles: ["ADMIN","WORKSPACE_OWNER","DEVELOPER"],
      },
    ],
  },

  // ── Media Engine — social media production floor ──────────────────────────
  {
    id: "media",
    label: "Media Engine",
    icon: ImageIcon,
    items: [
      {
        name: "Media Vault",
        href: "/library",
        icon: Database,
        // Asset library — creators, reviewers, publishers, auditors (read)
        roles: ["ADMIN","WORKSPACE_OWNER","CAMPAIGN_MANAGER","CREATOR","PUBLISHER","REVIEWER","VALIDATOR","AUDITOR","VIEWER","EXTERNAL_COLLABORATOR"],
      },
      {
        name: "Campaigns",
        href: "/campaigns",
        icon: FolderKanban,
        // Campaigns — creators, reviewers, publishers, externals (assigned work)
        roles: ["ADMIN","WORKSPACE_OWNER","CAMPAIGN_MANAGER","CREATOR","PUBLISHER","REVIEWER","VIEWER","EXTERNAL_COLLABORATOR"],
        plan: "campaigns" as Feature,
      },
      {
        name: "Calendar",
        href: "/calendar",
        icon: Calendar,
        // Publishing schedule — content operators only
        roles: ["ADMIN","WORKSPACE_OWNER","CAMPAIGN_MANAGER","CREATOR","PUBLISHER","VIEWER"],
        plan: "calendar" as Feature,
      },
      {
        name: "Inbox & Engagement",
        href: "/inbox",
        icon: Inbox,
        // Social inbox — operators who manage live engagement
        roles: ["ADMIN","WORKSPACE_OWNER","AGENT_OPERATOR","CAMPAIGN_MANAGER","PUBLISHER","GOVERNANCE_ADMIN"],
        plan: "inbox" as Feature,
      },
      {
        name: "Publishing Hub",
        href: "/publish",
        icon: Globe,
        // Publishing execution — publishers, campaign managers, creators (status view)
        roles: ["ADMIN","WORKSPACE_OWNER","PUBLISHER","CAMPAIGN_MANAGER","CREATOR"],
        dirty: true,
        plan: "publishing" as Feature,
      },
    ],
  },

  // ── Accountability Layer — human-in-the-loop validation ───────────────────
  {
    id: "validation",
    label: "Accountability Layer",
    icon: ClipboardCheck,
    items: [
      {
        name: "Review Queue",
        href: "/queue",
        icon: ClipboardList,
        // All review roles + compliance reviewers who need to monitor
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","REVIEWER","VALIDATOR","APPROVER","BRAND_REVIEWER","CAMPAIGN_MANAGER","COMPLIANCE_REVIEWER"],
        badge: true,
        plan: "review_queue" as Feature,
      },
      {
        name: "Quality Audit",
        href: "/governance/qa",
        icon: ShieldCheck,
        // QA surface — validators, auditors, compliance
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","VALIDATOR","AUDITOR","COMPLIANCE_REVIEWER"],
        plan: "review_queue" as Feature,
      },
      {
        name: "Validation Desk",
        href: "/validation",
        icon: ClipboardCheck,
        // Higher-trust HITL validation — validators and approvers
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","VALIDATOR","APPROVER"],
        plan: "review_queue" as Feature,
      },
      {
        name: "Approvals",
        href: "/governance/approvals",
        icon: CheckSquare,
        // Approval decisions — approvers, validators, compliance (read history), auditors (read)
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","APPROVER","VALIDATOR","COMPLIANCE_REVIEWER","AUDITOR"],
        plan: "approvals" as Feature,
      },
      {
        name: "Approval Rules",
        href: "/governance/rules",
        icon: ListChecks,
        // Approval rule configuration — governance admin only
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN"],
        plan: "approvals" as Feature,
      },
      {
        name: "Exceptions",
        href: "/exceptions",
        icon: AlertOctagon,
        // Exception handling — governance admin only
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN"],
        plan: "approvals" as Feature,
      },
    ],
  },

  // ── Authority Layer — agentic intelligence ────────────────────────────────
  {
    id: "agents",
    label: "Authority Layer",
    icon: Bot,
    items: [
      {
        name: "Agent Studio",
        href: "/agents/studio",
        icon: Bot,
        // Build/configure agents — architects, operators (monitor), governance (oversee)
        roles: ["ADMIN","WORKSPACE_OWNER","AGENT_ARCHITECT","AGENT_OPERATOR","GOVERNANCE_ADMIN"],
        plan: "agents" as Feature,
      },
      {
        name: "Agent Operations",
        href: "/agents/operations",
        icon: MonitorPlay,
        // Run/supervise/pause agents — operators primary, architects secondary
        roles: ["ADMIN","WORKSPACE_OWNER","AGENT_OPERATOR","AGENT_ARCHITECT","GOVERNANCE_ADMIN"],
        plan: "agents" as Feature,
      },
      {
        name: "Workflows",
        href: "/agents/workflows",
        icon: GitBranch,
        // Multi-agent orchestration — architects and operators
        roles: ["ADMIN","WORKSPACE_OWNER","AGENT_ARCHITECT","AGENT_OPERATOR","GOVERNANCE_ADMIN"],
        plan: "agents" as Feature,
      },
      {
        name: "Prompt Governance",
        href: "/agents/prompts",
        icon: MessageSquareCode,
        // Prompt templates/versions — architects, governance admin (policy oversight)
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AGENT_ARCHITECT"],
        plan: "agents" as Feature,
      },
      {
        name: "Knowledge Base",
        href: "/agents/knowledge",
        icon: BookOpen,
        // RAG sources — knowledge manager primary, architects (read)
        roles: ["ADMIN","WORKSPACE_OWNER","KNOWLEDGE_MANAGER","AGENT_ARCHITECT","GOVERNANCE_ADMIN"],
        plan: "agents" as Feature,
      },
    ],
  },

  // ── Safety Layer — governance, risk, brand standards ─────────────────────
  {
    id: "governance",
    label: "Safety Layer",
    icon: Scale,
    items: [
      {
        name: "Safety Overview",
        href: "/governance/safety",
        icon: ShieldAlert,
        // Risk/safety monitoring — governance, compliance, security
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","COMPLIANCE_REVIEWER","SECURITY_ADMIN"],
        plan: "governance" as Feature,
      },
      {
        name: "Policy Control Matrix",
        href: "/governance/policies",
        icon: ShieldCheck,
        // Policy rules — governance admin manages, compliance reviews
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","COMPLIANCE_REVIEWER"],
        plan: "governance" as Feature,
      },
      {
        name: "Approval Console",
        href: "/governance/reviews",
        icon: ClipboardCheck,
        // Safety-layer approvals — governance and compliance
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","COMPLIANCE_REVIEWER"],
        plan: "approvals" as Feature,
      },
      {
        name: "Evidence Vault",
        href: "/governance/evidence",
        icon: Archive,
        // Preserved evidence — governance, auditors, compliance
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AUDITOR","COMPLIANCE_REVIEWER"],
        plan: "evidence_vault" as Feature,
      },
    ],
  },

  // ── Evidence Layer — audit, forensic, legal ───────────────────────────────
  {
    id: "evidence",
    label: "Evidence Layer",
    icon: FileSearch,
    items: [
      {
        name: "Audit Trail",
        href: "/evidence/audit-trail",
        // Tamper-evident records — auditors primary, validators (evidence read)
        icon: FileSearch,
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AUDITOR","COMPLIANCE_REVIEWER","VALIDATOR"],
        plan: "audit_trail" as Feature,
      },
      {
        name: "Forensic Hub",
        href: "/evidence/forensic-hub",
        icon: Fingerprint,
        // Deep investigation — auditors, compliance, security
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AUDITOR","COMPLIANCE_REVIEWER","SECURITY_ADMIN"],
        plan: "forensic_hub" as Feature,
      },
      {
        name: "Evidence Vault",
        href: "/evidence/evidence-vault",
        icon: Archive,
        // Exportable evidence packs — auditors and compliance only
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AUDITOR","COMPLIANCE_REVIEWER"],
        plan: "evidence_vault" as Feature,
      },
      {
        name: "Legal Holds",
        href: "/evidence/evidence-vault/holds",
        icon: Gavel,
        // Legal hold management — auditors and compliance
        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AUDITOR","COMPLIANCE_REVIEWER"],
        plan: "legal_holds" as Feature,
      },
      {
        name: "Identity Ledger",
        href: "/integrations/identity-ledger",
        icon: Fingerprint,
        // Identity audit chain — developers (technical view), auditors (read)
        roles: ["ADMIN","WORKSPACE_OWNER","DEVELOPER","AUDITOR"],
        plan: "identity_ledger" as Feature,
      },
    ],
  },

  // ── Infrastructure — integrations & API ──────────────────────────────────
  {
    id: "integrations",
    label: "Infrastructure",
    icon: Zap,
    items: [
      {
        name: "Platform Accounts",
        href: "/accounts",
        icon: Link2,
        // Social/platform connections — admins, devs, publishers, campaign managers
        roles: ["ADMIN","WORKSPACE_OWNER","DEVELOPER","PUBLISHER","CAMPAIGN_MANAGER"],
      },
      {
        name: "Data Connectors",
        href: "/integrations/data",
        icon: Database,
        // Enterprise data pipelines — technical admins and developers only
        roles: ["ADMIN","WORKSPACE_OWNER","DEVELOPER"],
        plan: "data_connectors" as Feature,
      },
      {
        name: "API & Webhooks",
        href: "/integrations/api",
        icon: Webhook,
        // API keys, webhooks, sandbox — developers only
        roles: ["ADMIN","WORKSPACE_OWNER","DEVELOPER"],
        plan: "api_webhooks" as Feature,
      },
      {
        name: "Integration Health",
        href: "/integrations/health",
        icon: HeartPulse,
        // Connectivity status — technical admins and developers
        roles: ["ADMIN","WORKSPACE_OWNER","DEVELOPER"],
      },
    ],
  },

  // ── Access Control — identity & permissions ───────────────────────────────
  {
    id: "access",
    label: "Access Control",
    icon: Shield,
    items: [
      {
        name: "Users & Access",
        href: "/team",
        icon: Users,
        // User management — admins and security admin
        roles: ["ADMIN","WORKSPACE_OWNER","SECURITY_ADMIN"],
      },
      {
        name: "Roles & Units",
        href: "/access/roles",
        icon: Building2,
        // Permission configuration — workspace owner and admin only
        roles: ["ADMIN","WORKSPACE_OWNER"],
      },
    ],
  },

  // ── System / Admin — workspace foundation ────────────────────────────────
  {
    id: "admin",
    label: "System",
    icon: Settings,
    items: [
      {
        name: "Workspace Settings",
        href: "/admin/settings",
        icon: Sliders,
        roles: ["ADMIN","WORKSPACE_OWNER"],
      },
      {
        name: "Billing & Usage",
        href: "/admin/billing",
        icon: CreditCard,
        // Billing authority — workspace owner only per docs
        roles: ["WORKSPACE_OWNER"],
      },
      {
        name: "Privacy & Data",
        href: "/admin/privacy",
        icon: Eye,
        // Retention, consent, GDPR — privacy admin manages
        roles: ["ADMIN","WORKSPACE_OWNER","PRIVACY_ADMIN"],
      },
      {
        name: "Notifications",
        href: "/admin/notifications",
        icon: Bell,
        roles: [...ALL_ROLES],
        badge: false,
      },
      {
        name: "System Status",
        href: "/admin/status",
        icon: Activity,
        // Platform health — admins and developers
        roles: ["ADMIN","WORKSPACE_OWNER","DEVELOPER"],
      },
      {
        name: "Security Center",
        href: "/admin/security",
        icon: Lock,
        // SSO, MFA, IP rules — security admin manages
        roles: ["ADMIN","WORKSPACE_OWNER","SECURITY_ADMIN"],
      },
      {
        name: "Support & Docs",
        href: "/support",
        icon: HelpCircle,
        roles: [...ALL_ROLES],
      },
    ],
  },
];

const OWNER_REQUIRED_PAGES = [
  "/",
  "/superadmin",
  "/superadmin/analytics",
  "/superadmin/tickets",
  "/admin/status",
  "/support",
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isSuperAdmin, isLoading: roleLoading } = useRoleContext();
  const { canUse, minPlanLabelFor } = usePlan();
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<Feature | null>(null);

  const { isDirty, setIsDirty } = useDraftGuard();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);

  const { state } = useNotifications();
  const unreadCount = state?.notifications?.filter((n) => !n.read).length || 0;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g.id, true])),
  );

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  useRealtimeNotifications();

  const fetchPendingCount = useCallback(async (_userRole: string) => {
    try {
      const result = await api.get("/api/v1/governance/queue");
      if (result.success) setPendingCount(result.data?.length || 0);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    if (!roleLoading) {
      setRoleLoaded(true);
      if (role) fetchPendingCount(role);
    }
  }, [roleLoading, role, fetchPendingCount]);

  useEffect(() => {
    if (!role) return;
    const channel = supabase
      .channel("pending-count-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "publish_intents" },
        () => {
          fetchPendingCount(role);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, fetchPendingCount]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleNavClick = useCallback(
    (e: React.MouseEvent, href: string) => {
      if (isDirty && pathname !== href) {
        e.preventDefault();
        setPendingHref(href);
        setShowDiscardModal(true);
      }
    },
    [isDirty, pathname],
  );

  const handleDiscardConfirm = useCallback(async () => {
    setIsDirty(false);
    setShowDiscardModal(false);
    const dest = pendingHref;
    setPendingHref(null);
    if (!dest) return;
    if (dest === "/login" || dest === "/platform-login") {
      await supabase.auth.signOut();
      router.replace(dest);
    } else {
      router.push(dest);
    }
  }, [pendingHref, router, setIsDirty]);

  const handleDiscardCancel = useCallback(() => {
    setShowDiscardModal(false);
    setPendingHref(null);
  }, []);

  const handleLogout = async () => {
    const loginDest = isSuperAdmin ? "/platform-login" : "/login";
    if (isDirty) {
      setPendingHref(loginDest);
      setShowDiscardModal(true);
      return;
    }
    await supabase.auth.signOut();
    router.replace(loginDest);
  };

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // Platform owner sees only their own group — no org sections
        if (isSuperAdmin) return group.id === "platform";

        if (!role && !roleLoaded) {
          return item.roles.includes("CREATOR");
        }
        if (!role) return false;
        const normalizedRole = role.toUpperCase();

        // ADMIN / WORKSPACE_OWNER see almost everything (except Platform Owner items)
        if (
          normalizedRole === "ADMIN" ||
          normalizedRole === "WORKSPACE_OWNER"
        ) {
          return group.id !== "platform";
        }

        const hasExplicitAccess = item.roles.includes(normalizedRole);
        const hasGroupAccess =
          ROLE_GROUP_MAPPING[group.id]?.includes(normalizedRole);
        return hasExplicitAccess || hasGroupAccess;
      }),
    })).filter((group) => group.items.length > 0);
  }, [isSuperAdmin, role, roleLoaded]);

  return (
    <>
      <DiscardModal
        isOpen={showDiscardModal}
        pendingHref={pendingHref}
        onConfirm={handleDiscardConfirm}
        onCancel={handleDiscardCancel}
      />

      <PlanUpgradeModal
        feature={lockedFeature}
        onClose={() => setLockedFeature(null)}
      />

      <div className="w-64 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col h-screen transition-colors">
        {/* Brand */}
        <div className="flex flex-col px-4 pt-5 pb-4 border-b border-[var(--sidebar-border)]">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center mr-3 shrink-0 relative">
              <Image
                src="/images/logo-wordmark.svg"
                alt="ZoikoVertex Logo"
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
            <span className="text-[var(--sidebar-text)] font-bold text-xl tracking-wide">
              ZoikoVertex
            </span>
          </div>
          <p className="text-[var(--sidebar-text-muted)] text-xs mt-1 ml-11">
            Where Execution Becomes Accountable.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3 px-2">
          {!roleLoaded ? (
            <div className="space-y-1 px-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg bg-[var(--sidebar-hover)]/50 animate-pulse"
                />
              ))}
            </div>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.id} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-[var(--sidebar-text-muted)] uppercase tracking-wider hover:text-[var(--sidebar-text)] transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${openGroups[group.id] ? "" : "-rotate-90"}`}
                  />
                </button>

                {openGroups[group.id] && (
                  <nav className="space-y-0.5 mt-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      const planLocked = !!(item.plan && !canUse(item.plan));

                      if (planLocked) {
                        const requiredLabel = minPlanLabelFor(item.plan!);
                        return (
                          <button
                            key={item.name}
                            type="button"
                            title={`Requires ${requiredLabel}`}
                            onClick={() => setLockedFeature(item.plan!)}
                            className="w-full flex items-center px-3 py-2 rounded-lg transition-colors text-zinc-600 hover:text-zinc-500 hover:bg-[var(--sidebar-hover)]/40 group"
                          >
                            <Icon className="w-4 h-4 mr-3 shrink-0 text-zinc-700" />
                            <span className="flex-1 text-sm text-left">{item.name}</span>
                            <Lock className="w-3 h-3 text-zinc-700 shrink-0" />
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={(e) => handleNavClick(e, item.href)}
                          className={`flex items-center px-3 py-2 rounded-lg transition-colors group ${
                            isActive
                              ? "bg-[var(--sidebar-active)] text-indigo-400 font-medium"
                              : "text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 mr-3 shrink-0 ${isActive ? "text-indigo-400" : "text-[var(--sidebar-text-muted)] group-hover:text-[var(--sidebar-text)]"}`}
                          />
                          <span className="flex-1 text-sm">{item.name}</span>

                          {item.badge && pendingCount > 0 && (
                            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-black text-white shadow-lg shadow-indigo-500/20 animate-in zoom-in duration-300">
                              {pendingCount}
                            </span>
                          )}

                          {item.name === "Notifications" && unreadCount > 0 && (
                            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-lg shadow-rose-500/20 animate-pulse animate-in zoom-in duration-300">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          )}

                          {item.dirty && isDirty && (
                            <span
                              className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-lg shadow-amber-400/20"
                              title="Unsaved draft"
                            />
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                )}
              </div>
            ))
          )}
        </div>

        {/* Action Footer */}
        <div className="px-4 pb-6 pt-4 border-t border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              onClick={(e) => handleNavClick(e, "/profile")}
              className="w-10 h-10 flex items-center justify-center bg-[var(--surface)] text-[var(--sidebar-text-muted)] hover:text-indigo-400 hover:bg-[var(--sidebar-hover)] border border-[var(--sidebar-border)] rounded-full transition-all shadow-sm group shrink-0"
              title="Settings & Profile"
            >
              <Settings className="w-5 h-5 transition-transform duration-500 group-hover:rotate-90" />
            </Link>

            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center h-10 px-4 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all font-semibold text-sm group"
              title="Logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
