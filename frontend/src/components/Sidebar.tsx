"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  Radio,
  BarChart3,
  Cpu,
  ImageIcon,
  Calendar,
  Send,
  ClipboardCheck,
  ShieldCheck,
  ListChecks,
  AlertOctagon,
  Bot,
  SlidersHorizontal,
  GitBranch,
  MessageSquareCode,
  LineChart,
  BookOpen,
  Scale,
  BookMarked,
  ShieldAlert,
  FileSearch,
  Archive,
  ChevronDown,
  LogOut,
  Users,
  HelpCircle,
  MessageSquare,
  Shield,
  Link2,
  PenTool,
  FileEdit,
  ClipboardList,
  CheckSquare,
  Briefcase,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useRealtimeNotifications } from "@/lib/hooks/useRealtimeNotifications";
import { useDraftGuard } from "@/lib/context/DraftGuardContext";
import DiscardModal from "@/components/DiscardModal";

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
   Navigation structure (Naresh's grouped nav)
───────────────────────────────────────────── */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "command",
    label: "Command",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard",           href: "/",            icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "CREATOR"] },
      { name: "Live Stats",          href: "/live-stats",  icon: Radio,           roles: ["ADMIN", "MANAGER"] },
      { name: "Operations Feed",     href: "/operations",  icon: Activity,        roles: ["ADMIN", "MANAGER"] },
      { name: "Insights & Analytics",href: "/analytics",   icon: BarChart3,       roles: ["ADMIN", "MANAGER"] },
      { name: "Resource Monitoring", href: "/resources",   icon: Cpu,             roles: ["ADMIN"] },
    ],
  },
  {
    id: "media",
    label: "Media",
    icon: ImageIcon,
    items: [
      { name: "Upload Asset",   href: "/library/upload", icon: PenTool,    roles: ["CREATOR"] },
      { name: "Media Library",  href: "/library",        icon: ImageIcon,  roles: ["ADMIN", "MANAGER", "CREATOR"] },
      { name: "Projects",       href: "/projects",       icon: Briefcase,  roles: ["ADMIN", "MANAGER"] },
      { name: "Calendar",       href: "/calendar",       icon: Calendar,   roles: ["ADMIN", "MANAGER"] },
      { name: "Social Publisher",href: "/publish",       icon: Send,       roles: ["MANAGER"], dirty: true },
      { name: "My Posts",       href: "/manage-posts",   icon: FileEdit,   roles: ["MANAGER"] },
    ],
  },
  {
    id: "validation",
    label: "Validation",
    icon: ClipboardCheck,
    items: [
      { name: "Review & Edit",  href: "/queue",          icon: ClipboardList, roles: ["MANAGER"], badge: true },
      { name: "Approval Queue", href: "/queue",          icon: CheckSquare,   roles: ["ADMIN"],   badge: true },
      { name: "Quality Check",  href: "/quality",        icon: ShieldCheck,   roles: ["ADMIN", "MANAGER"] },
      { name: "Exceptions",     href: "/exceptions",     icon: AlertOctagon,  roles: ["ADMIN"] },
    ],
  },
  {
    id: "agents",
    label: "Agents",
    icon: Bot,
    items: [
      { name: "Agent Studio",      href: "/agents/studio",    icon: Bot,              roles: ["ADMIN", "MANAGER"] },
      { name: "AI Settings",       href: "/agents/settings",  icon: SlidersHorizontal,roles: ["ADMIN"] },
      { name: "Workflows",         href: "/agents/workflows", icon: GitBranch,        roles: ["ADMIN", "MANAGER"] },
      { name: "Prompt Governance", href: "/agents/prompts",   icon: MessageSquareCode,roles: ["ADMIN"] },
      { name: "Model Performance", href: "/agents/models",    icon: LineChart,        roles: ["ADMIN"] },
      { name: "Knowledge Base",    href: "/agents/knowledge", icon: BookOpen,         roles: ["ADMIN", "MANAGER"] },
    ],
  },
  {
    id: "governance",
    label: "Governance",
    icon: Scale,
    items: [
      { name: "Legal Rules",       href: "/governance/legal",     icon: Scale,      roles: ["ADMIN"] },
      { name: "Policy Center",     href: "/governance/policy",    icon: BookMarked, roles: ["ADMIN"] },
      { name: "Risk & Compliance", href: "/governance/risk",      icon: ShieldAlert,roles: ["ADMIN"] },
      { name: "Audit Trail",       href: "/governance/audit",     icon: FileSearch, roles: ["ADMIN"] },
      { name: "Evidence Vault",    href: "/governance/evidence",  icon: Archive,    roles: ["ADMIN"] },
    ],
  },
  {
    id: "team",
    label: "Team",
    icon: Users,
    items: [
      { name: "Platform Accounts", href: "/accounts", icon: Link2,       roles: ["ADMIN"] },
      { name: "Team Access",       href: "/team",     icon: Users,       roles: ["ADMIN"] },
      { name: "Help & Support",    href: "/support",  icon: HelpCircle,  roles: ["ADMIN", "MANAGER", "CREATOR"] },
    ],
  },
  {
    id: "superadmin",
    label: "SuperAdmin",
    icon: Shield,
    items: [
      { name: "Platform Overview", href: "/superadmin/analytics", icon: LayoutDashboard, roles: ["SUPERADMIN"] },
      { name: "Support Inbox",     href: "/superadmin/tickets",   icon: MessageSquare,   roles: ["SUPERADMIN"] },
      { name: "Global Control",    href: "/superadmin",           icon: Shield,          roles: ["SUPERADMIN"] },
    ],
  },
];

const allNavItems = NAV_GROUPS.flatMap(g => g.items);

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

  // Draft guard
  const { isDirty, setIsDirty } = useDraftGuard();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);

  // Which groups are expanded (default: all open)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map(g => [g.id, true]))
  );

  const toggleGroup = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  // Initialize Realtime Subscriptions
  useRealtimeNotifications();

  const fetchPendingCount = useCallback(async (userRole: string) => {
    try {
      const result = await api.get('/api/v1/governance/queue');
      if (result.success) {
        setPendingCount(result.data?.length || 0);
      }
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    const fetchUserAndRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

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
        // fallback silently
      }
      setRoleLoaded(true);
    };
    fetchUserAndRole();
  }, [fetchPendingCount]);

  // Real-time badge sync
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

  // Browser close guard
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

  // Filter items based on role
  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (isSuperAdmin) return item.roles.includes("SUPERADMIN");
      return role && item.roles.includes(role.toUpperCase());
    }),
  })).filter(group => group.items.length > 0);

  return (
    <>
      {/* Discard Modal */}
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
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center mr-3 shrink-0">
              <img src="/logo-dark.jpeg" alt="ZoikoVertex Logo" className="w-full h-full object-cover dark:block hidden" />
              <img src="/logo.jpeg" alt="ZoikoVertex Logo" className="w-full h-full object-cover block dark:hidden" />
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
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-[var(--sidebar-text-muted)] uppercase tracking-wider hover:text-[var(--sidebar-text)] transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${openGroups[group.id] ? "" : "-rotate-90"}`} />
                </button>

                {/* Group items */}
                {openGroups[group.id] && (
                  <nav className="space-y-0.5 mt-1">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <a
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

                          {/* Pending badge */}
                          {item.badge && pendingCount > 0 && (
                            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-black text-white shadow-lg shadow-indigo-500/20 animate-in zoom-in duration-300">
                              {pendingCount}
                            </span>
                          )}

                          {/* Dirty indicator dot */}
                          {item.dirty && isDirty && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-lg shadow-amber-400/20" title="Unsaved draft" />
                          )}
                        </a>
                      );
                    })}
                  </nav>
                )}
              </div>
            ))
          )}
        </div>

        {/* User Profile & Logout */}
        <div className="px-3 pb-4 pt-2 border-t border-[var(--sidebar-border)]">
          <div className="p-3 bg-[var(--surface)] border border-[var(--sidebar-border)] rounded-xl mb-3">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-[var(--sidebar-bg)] shrink-0"></div>
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium text-[var(--sidebar-text)] leading-none truncate">
                  {fullName || "Agent Profile"}
                </p>
                <p className="text-xs text-amber-500 mt-1 capitalize font-medium">
                  {isSuperAdmin ? "SuperAdmin" : role ? role.toLowerCase() : "Loading..."}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 text-rose-500 hover:text-white hover:bg-rose-500/90 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3 shrink-0" />
            <span className="text-sm font-medium">Secure Log out</span>
          </button>
        </div>
      </div>
    </>
  );
}
