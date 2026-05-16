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
  AlertOctagon,
  Bot,
  Shield,
  Link2,
  ClipboardList,
  CheckSquare,
  Briefcase,
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
  Key,
  Building2,
  Handshake,
  CreditCard,
  Lock,
  EyeOff,
  Bell,
  Server,
  TrendingUp,
  FolderKanban,
  Inbox,
  MonitorPlay,
  Palette,
  Terminal,
  ExternalLink,
  Siren,
  Fingerprint,
  Pencil,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useRealtimeNotifications } from "@/lib/hooks/useRealtimeNotifications";
import { useDraftGuard } from "@/lib/context/DraftGuardContext";
import { useNotifications } from "@/lib/context/NotificationContext";
import DiscardModal from "@/components/DiscardModal";
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
};

type NavGroup = {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
};

/* ─────────────────────────────────────────────
   Navigation structure (Enterprise Layout)
 ───────────────────────────────────────────── */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "platform",
    label: "Platform Owner",
    icon: Shield,
    items: [
      { name: "Governance Node",  href: "/superadmin",            icon: Shield,        roles: ["SUPERADMIN"] },
      { name: "Global Analytics", href: "/superadmin/analytics",  icon: LineChart,     roles: ["SUPERADMIN"] },
      { name: "Support Queue",    href: "/superadmin/tickets",    icon: MessageSquare, roles: ["SUPERADMIN"] },
    ],
  },
  {
    id: "command",
    label: "Command",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard",           href: "/dashboard",   icon: LayoutDashboard, roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AGENT_ARCHITECT","AGENT_OPERATOR","KNOWLEDGE_MANAGER","CAMPAIGN_MANAGER","CREATOR","REVIEWER","VALIDATOR","APPROVER","PUBLISHER","COMPLIANCE_REVIEWER","AUDITOR","ANALYST","SECURITY_ADMIN","PRIVACY_ADMIN","BRAND_REVIEWER","DEVELOPER","EXTERNAL_COLLABORATOR","VIEWER"] },
      { name: "Operations Feed",     href: "/operations",  icon: Activity,        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AGENT_OPERATOR","CAMPAIGN_MANAGER"] },
      { name: "Insights & ROI",      href: "/analytics",   icon: TrendingUp,      roles: ["ADMIN","WORKSPACE_OWNER","ANALYST","CAMPAIGN_MANAGER","AUDITOR","COMPLIANCE_REVIEWER"] },
      { name: "Resource Monitoring", href: "/resources",   icon: Cpu,             roles: ["ADMIN","WORKSPACE_OWNER"] },
    ],
  },
  {
    id: "media",
    label: "Media",
    icon: ImageIcon,
    items: [
      { name: "Media Vault",         href: "/library",    icon: Database,       roles: ["ADMIN","WORKSPACE_OWNER","CAMPAIGN_MANAGER","CREATOR","PUBLISHER","REVIEWER","ANALYST","VIEWER"] },
      { name: "Content Studio",      href: "/studio",     icon: Pencil,         roles: ["ADMIN","WORKSPACE_OWNER","CREATOR","CAMPAIGN_MANAGER"] },
      { name: "Projects",            href: "/projects",   icon: Briefcase,      roles: ["ADMIN","WORKSPACE_OWNER","CAMPAIGN_MANAGER","CREATOR","ANALYST","VIEWER"] },
      { name: "Campaigns",           href: "/campaigns",  icon: FolderKanban,   roles: ["ADMIN","WORKSPACE_OWNER","CAMPAIGN_MANAGER","CREATOR","PUBLISHER","ANALYST","VIEWER"] },
      { name: "Calendar",            href: "/calendar",   icon: Calendar,       roles: ["ADMIN","WORKSPACE_OWNER","CAMPAIGN_MANAGER","CREATOR","PUBLISHER","VIEWER"] },
      { name: "Inbox & Engagement",  href: "/inbox",      icon: Inbox,          roles: ["ADMIN","WORKSPACE_OWNER","AGENT_OPERATOR","CAMPAIGN_MANAGER","PUBLISHER"] },
      { name: "Publishing Hub",      href: "/publish",    icon: Globe,          roles: ["ADMIN","WORKSPACE_OWNER","PUBLISHER","CAMPAIGN_MANAGER"], dirty: true },
    ],
  },
  {
    id: "validation",
    label: "Validation",
    icon: ClipboardCheck,
    items: [
      { name: "Review Queue",     href: "/queue",                   icon: ClipboardList,  roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","REVIEWER","VALIDATOR","APPROVER","BRAND_REVIEWER","CAMPAIGN_MANAGER"], badge: true },
      { name: "Validation Desk",  href: "/validation",              icon: ClipboardCheck, roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","VALIDATOR"] },
      { name: "Approvals",        href: "/governance/approvals",    icon: CheckSquare,    roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","APPROVER","VALIDATOR"] },
      { name: "Brand Library",    href: "/governance/brand-library",icon: Palette,        roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","VALIDATOR","REVIEWER","APPROVER","BRAND_REVIEWER"] },
      { name: "Quality Assurance",href: "/quality",                 icon: ShieldCheck,    roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","BRAND_REVIEWER"] },
      { name: "Approval Rules",   href: "/governance/rules",        icon: ListChecks,     roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN"] },
      { name: "Exceptions",       href: "/exceptions",              icon: AlertOctagon,   roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN"] },
    ],
  },
  {
    id: "agents",
    label: "Agents",
    icon: Bot,
    items: [
      { name: "Agent Studio",      href: "/agents/studio",      icon: Bot,               roles: ["ADMIN","WORKSPACE_OWNER","AGENT_ARCHITECT"] },
      { name: "Agent Operations",  href: "/agents/operations",  icon: MonitorPlay,       roles: ["ADMIN","WORKSPACE_OWNER","AGENT_OPERATOR","AGENT_ARCHITECT"] },
      { name: "Workflows",         href: "/agents/workflows",   icon: GitBranch,         roles: ["ADMIN","WORKSPACE_OWNER","AGENT_ARCHITECT","AGENT_OPERATOR"] },
      { name: "Prompt Governance", href: "/agents/prompts",     icon: MessageSquareCode, roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AGENT_ARCHITECT"] },
      { name: "Autonomy Controls", href: "/agents/autonomy",    icon: ToggleRight,       roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN"] },
      { name: "Model Performance", href: "/agents/models",      icon: LineChart,         roles: ["ADMIN","WORKSPACE_OWNER","AGENT_ARCHITECT","AGENT_OPERATOR"] },
      { name: "Knowledge Bases",   href: "/agents/knowledge",   icon: BookOpen,          roles: ["ADMIN","WORKSPACE_OWNER","KNOWLEDGE_MANAGER","AGENT_ARCHITECT"] },
    ],
  },
  {
    id: "governance",
    label: "Governance",
    icon: Scale,
    items: [
      { name: "Governance Center", href: "/governance",          icon: Scale,      roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN"] },
      { name: "Brand Standards",   href: "/governance/legal",    icon: BookMarked, roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","BRAND_REVIEWER"] },
      { name: "Policy Center",     href: "/governance/policy",   icon: Scale,      roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN"] },
      { name: "Risk & Compliance", href: "/governance/risk",     icon: ShieldAlert,roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","COMPLIANCE_REVIEWER"] },
      { name: "Audit Trail",       href: "/governance/audit",    icon: FileSearch, roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AUDITOR","COMPLIANCE_REVIEWER"] },
      { name: "Evidence Vault",    href: "/governance/evidence", icon: Archive,    roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AUDITOR","COMPLIANCE_REVIEWER"] },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Zap,
    items: [
      { name: "Platform Accounts",    href: "/accounts",                    icon: Link2,       roles: ["ADMIN","WORKSPACE_OWNER","DEVELOPER","PUBLISHER"] },
      { name: "Data Connectors",      href: "/integrations/data",           icon: Database,    roles: ["ADMIN","WORKSPACE_OWNER","DEVELOPER"] },
      { name: "API & Webhooks",       href: "/integrations/api",            icon: Webhook,     roles: ["ADMIN","WORKSPACE_OWNER","DEVELOPER"] },
      { name: "Developer Console",    href: "/integrations/developer",      icon: Terminal,    roles: ["ADMIN","WORKSPACE_OWNER","DEVELOPER"] },
      { name: "System Identity Ledger",href: "/integrations/identity-ledger",icon: Fingerprint,roles: ["ADMIN","WORKSPACE_OWNER","DEVELOPER","AUDITOR"] },
      { name: "Integration Health",   href: "/integrations/health",         icon: HeartPulse,  roles: ["ADMIN","WORKSPACE_OWNER","DEVELOPER"] },
    ],
  },
  {
    id: "access",
    label: "Access",
    icon: Shield,
    items: [
      { name: "Users & Access",      href: "/team",             icon: Users,        roles: ["ADMIN","WORKSPACE_OWNER","SECURITY_ADMIN"] },
      { name: "Roles & Permissions", href: "/access/roles",     icon: Key,          roles: ["ADMIN","WORKSPACE_OWNER"] },
      { name: "Business Units",      href: "/access/units",     icon: Building2,    roles: ["ADMIN","WORKSPACE_OWNER"] },
      { name: "External Partners",   href: "/access/partners",  icon: Handshake,    roles: ["ADMIN","WORKSPACE_OWNER"] },
      { name: "External Workspace",  href: "/access/external",  icon: ExternalLink, roles: ["ADMIN","WORKSPACE_OWNER","EXTERNAL_COLLABORATOR"] },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    icon: Settings,
    items: [
      { name: "Workspace Settings",  href: "/admin/settings",      icon: Sliders,     roles: ["ADMIN","WORKSPACE_OWNER"] },
      { name: "Subscription & Usage",href: "/admin/billing",       icon: CreditCard,  roles: ["ADMIN","WORKSPACE_OWNER"] },
      { name: "Security",            href: "/admin/security",      icon: Lock,        roles: ["ADMIN","WORKSPACE_OWNER","SECURITY_ADMIN"] },
      { name: "Privacy & Data",      href: "/admin/privacy",       icon: EyeOff,      roles: ["ADMIN","WORKSPACE_OWNER","PRIVACY_ADMIN"] },
      { name: "Notifications",       href: "/admin/notifications", icon: Bell,        roles: ["ADMIN","WORKSPACE_OWNER"] },
      { name: "Crisis Console",      href: "/admin/crisis",        icon: Siren,       roles: ["ADMIN","WORKSPACE_OWNER"] },
      { name: "System Status",       href: "/admin/status",        icon: Server,      roles: ["ADMIN","WORKSPACE_OWNER"] },
      { name: "Support",             href: "/support",             icon: HelpCircle,  roles: ["ADMIN","WORKSPACE_OWNER","GOVERNANCE_ADMIN","AGENT_ARCHITECT","AGENT_OPERATOR","KNOWLEDGE_MANAGER","CAMPAIGN_MANAGER","CREATOR","REVIEWER","VALIDATOR","APPROVER","PUBLISHER","COMPLIANCE_REVIEWER","AUDITOR","ANALYST","SECURITY_ADMIN","PRIVACY_ADMIN","BRAND_REVIEWER","DEVELOPER","EXTERNAL_COLLABORATOR","VIEWER"] },
    ],
  },
];

const OWNER_REQUIRED_PAGES = [
  "/",
  "/superadmin",
  "/superadmin/analytics",
  "/superadmin/tickets",
  "/admin/status",
  "/support"
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);

  const { isDirty, setIsDirty } = useDraftGuard();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);

  const { state } = useNotifications();
  const unreadCount = state?.notifications?.filter(n => !n.read).length || 0;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map(g => [g.id, true]))
  );

  const toggleGroup = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  useRealtimeNotifications();

  const fetchPendingCount = useCallback(async (_userRole: string) => {
    try {
      const result = await api.get('/api/v1/governance/queue');
      if (result.success) setPendingCount(result.data?.length || 0);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    const fetchUserAndRole = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          window.location.href = "/login";
          return;
        }

        setFullName(user.user_metadata?.full_name || user.email?.split('@')[0] || "Agent");

        try {
          const result = await api.get('/api/v1/user/context');
          if (result.success) {
            const { is_superadmin, role: userRole, full_name } = result.data;
            setIsSuperAdmin(is_superadmin);
            if (full_name) setFullName(full_name);

            if (is_superadmin) {
              setRoleLoaded(true);
              return;
            }
            if (userRole) {
              setRole(userRole);
              fetchPendingCount(userRole);
            }
          }
        } catch {
          if (!role) setRole("CREATOR");
        }
      } catch (err) {
        if (String(err).includes("Refresh Token")) {
          window.location.href = "/login";
          return;
        }
      } finally {
        setRoleLoaded(true);
      }
    };
    fetchUserAndRole();
  }, [fetchPendingCount, role]);

  useEffect(() => {
    if (!role) return;
    const channel = supabase
      .channel("pending-count-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "publish_intents" }, () => {
        fetchPendingCount(role);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [role, fetchPendingCount]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleNavClick = useCallback((e: React.MouseEvent, href: string) => {
    if (isDirty && pathname !== href) {
      e.preventDefault();
      setPendingHref(href);
      setShowDiscardModal(true);
    }
  }, [isDirty, pathname]);

  const handleDiscardConfirm = useCallback(() => {
    setIsDirty(false);
    setShowDiscardModal(false);
    if (pendingHref) router.push(pendingHref);
    setPendingHref(null);
  }, [pendingHref, router, setIsDirty]);

  const handleDiscardCancel = useCallback(() => {
    setShowDiscardModal(false);
    setPendingHref(null);
  }, []);

  const handleLogout = async () => {
    if (isDirty) { setPendingHref("/login"); setShowDiscardModal(true); return; }
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const visibleGroups = useMemo(() => NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (isSuperAdmin) {
        return OWNER_REQUIRED_PAGES.includes(item.href) || item.roles.includes("SUPERADMIN");
      }
      if (!role && !roleLoaded) {
        return item.roles.includes("CREATOR");
      }
      if (!role) return false;
      const normalizedRole = role.toUpperCase();
      if (normalizedRole === "ADMIN" || normalizedRole === "WORKSPACE_OWNER") return true;
      const hasExplicitAccess = item.roles.includes(normalizedRole);
      const hasGroupAccess = ROLE_GROUP_MAPPING[group.id]?.includes(normalizedRole);
      return hasExplicitAccess || hasGroupAccess;
    }),
  })).filter(group => group.items.length > 0), [isSuperAdmin, role, roleLoaded]);

  return (
    <>
      <DiscardModal
        isOpen={showDiscardModal}
        pendingHref={pendingHref}
        onConfirm={handleDiscardConfirm}
        onCancel={handleDiscardCancel}
      />

      <div className="w-64 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col h-screen transition-colors">
        {/* Brand */}
        <div className="flex flex-col px-4 pt-5 pb-4 border-b border-[var(--sidebar-border)]">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center mr-3 shrink-0 relative">
              <Image src="/images/logo-dark.jpeg" alt="ZoikoVertex Logo" fill sizes="32px" className="object-cover dark:block hidden" />
              <Image src="/images/logo.jpeg" alt="ZoikoVertex Logo" fill sizes="32px" className="object-cover block dark:hidden" />
            </div>
            <span className="text-[var(--sidebar-text)] font-bold text-xl tracking-wide">ZoikoVertex</span>
          </div>
          <p className="text-[var(--sidebar-text-muted)] text-xs mt-1 ml-11">Where Execution Becomes Accountable.</p>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3 px-2">
          {!roleLoaded ? (
            <div className="space-y-1 px-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 rounded-lg bg-[var(--sidebar-hover)]/50 animate-pulse" />
              ))}
            </div>
          ) : (
            visibleGroups.map(group => (
              <div key={group.id} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-[var(--sidebar-text-muted)] uppercase tracking-wider hover:text-[var(--sidebar-text)] transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${openGroups[group.id] ? "" : "-rotate-90"}`} />
                </button>

                {openGroups[group.id] && (
                  <nav className="space-y-0.5 mt-1">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
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
                          <Icon className={`w-4 h-4 mr-3 shrink-0 ${isActive ? "text-indigo-400" : "text-[var(--sidebar-text-muted)] group-hover:text-[var(--sidebar-text)]"}`} />
                          <span className="flex-1 text-sm">{item.name}</span>

                          {item.badge && pendingCount > 0 && (
                            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-black text-white shadow-lg shadow-indigo-500/20 animate-in zoom-in duration-300">
                              {pendingCount}
                            </span>
                          )}

                          {item.name === "Notifications" && unreadCount > 0 && (
                            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-lg shadow-rose-500/20 animate-pulse animate-in zoom-in duration-300">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}

                          {item.dirty && isDirty && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-lg shadow-amber-400/20" title="Unsaved draft" />
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
