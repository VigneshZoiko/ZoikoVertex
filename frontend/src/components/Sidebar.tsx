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
  FolderOpen,
  Briefcase,
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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
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
  badge?: boolean; // show pending badge
  dirty?: boolean; // show unsaved-draft dot
};

type NavGroup = {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
};

/* ─────────────────────────────────────────────
   Navigation structure
───────────────────────────────────────────── */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "command",
    label: "Command",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "CREATOR"] },
      { name: "Live Stats", href: "/live-stats", icon: Radio, roles: ["ADMIN", "MANAGER"] },
      { name: "Operations Feed", href: "/operations", icon: Activity, roles: ["ADMIN", "MANAGER"] },
      { name: "Insights & Analytics", href: "/analytics", icon: BarChart3, roles: ["ADMIN", "MANAGER"] },
      { name: "Resource Monitoring", href: "/resources", icon: Cpu, roles: ["ADMIN"] },
    ],
  },
  {
    id: "media",
    label: "Media",
    icon: ImageIcon,
    items: [
      { name: "Media Library", href: "/library", icon: ImageIcon, roles: ["ADMIN", "MANAGER", "CREATOR"] },
      { name: "Projects", href: "/projects", icon: Briefcase, roles: ["ADMIN", "MANAGER"] },
      { name: "Calendar", href: "/calendar", icon: Calendar, roles: ["ADMIN", "MANAGER"] },
      { name: "Publishing Hub", href: "/publish", icon: Send, roles: ["MANAGER"], dirty: true },
    ],
  },
  {
    id: "validation",
    label: "Validation",
    icon: ClipboardCheck,
    items: [
      { name: "Review Area", href: "/queue", icon: ClipboardCheck, roles: ["ADMIN", "MANAGER"], badge: true },
      { name: "Quality Check", href: "/quality", icon: ShieldCheck, roles: ["ADMIN", "MANAGER"] },
      { name: "Approval Queue", href: "/approvals", icon: ListChecks, roles: ["ADMIN"], badge: true },
      { name: "Exceptions", href: "/exceptions", icon: AlertOctagon, roles: ["ADMIN"] },
    ],
  },
  {
    id: "agents",
    label: "Agents",
    icon: Bot,
    items: [
      { name: "Agent Studio", href: "/agents/studio", icon: Bot, roles: ["ADMIN", "MANAGER"] },
      { name: "AI Settings", href: "/agents/settings", icon: SlidersHorizontal, roles: ["ADMIN"] },
      { name: "Workflows", href: "/agents/workflows", icon: GitBranch, roles: ["ADMIN", "MANAGER"] },
      { name: "Prompt Governance", href: "/agents/prompts", icon: MessageSquareCode, roles: ["ADMIN"] },
      { name: "Model Performance", href: "/agents/models", icon: LineChart, roles: ["ADMIN"] },
      { name: "Knowledge Base", href: "/agents/knowledge", icon: BookOpen, roles: ["ADMIN", "MANAGER"] },
    ],
  },
  {
    id: "governance",
    label: "Governance",
    icon: Scale,
    items: [
      { name: "Legal Rules", href: "/governance/legal", icon: Scale, roles: ["ADMIN"] },
      { name: "Policy Center", href: "/governance/policy", icon: BookMarked, roles: ["ADMIN"] },
      { name: "Risk & Compliance", href: "/governance/risk", icon: ShieldAlert, roles: ["ADMIN"] },
      { name: "Audit Trail", href: "/governance/audit", icon: FileSearch, roles: ["ADMIN"] },
      { name: "Evidence Vault", href: "/governance/evidence", icon: Archive, roles: ["ADMIN"] },
    ],
  },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
const navItems = NAV_GROUPS.flatMap(group => group.items);

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
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
    let query = supabase.from("publish_intents").select("id", { count: "exact", head: true });
    if (userRole.toUpperCase() === "ADMIN") {
      query = query.eq("status", "PENDING_ADMIN");
    } else if (userRole.toUpperCase() === "MANAGER") {
      query = query.eq("status", "PENDING_MANAGER");
    } else { return; }
    const { count } = await query;
    setPendingCount(count || 0);
  }, []);

  useEffect(() => {
    const fetchUserAndRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      const { data } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("user_id", user.id)
        .single();
      if (data) { setRole(data.role); fetchPendingCount(data.role); }
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

  return (
    <>
      <DiscardModal
        isOpen={showDiscardModal}
        pendingHref={pendingHref}
        onConfirm={handleDiscardConfirm}
        onCancel={handleDiscardCancel}
      />

      <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen p-4 shrink-0">
        {/* Brand */}
        <div className="flex flex-col mb-10 px-2 mt-2">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3 shrink-0">
              <span className="text-black font-bold text-xl">Z</span>
            </div>
            <span className="text-white font-bold text-xl tracking-wide">ZoikoVertex</span>
          </div>
          <p className="text-zinc-500 text-xs mt-1 ml-11">Where Execution Becomes Accountable.</p>
        </div>

        {/* Navigation Links mapped by Role */}
        <div className="mb-6 px-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Workspace</p>
          <nav className="space-y-1">
            {!roleLoaded ? (
              <div className="space-y-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 rounded-lg bg-zinc-800/50 animate-pulse" />
                ))}
              </div>
            ) : (
              navItems
                .filter(item => role && item.roles.includes(role.toUpperCase()))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.href)}
                      className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${isActive
                        ? "bg-indigo-500/10 text-indigo-400 font-medium"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                        }`}
                    >
                      <Icon className={`w-5 h-5 mr-3 shrink-0 ${isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                      <span className="flex-1">{item.name}</span>

                      {/* Pending Action Badge */}
                      {pendingCount > 0 && (item.name === "Review & Edit" || item.name === "Approval Queue") && (
                        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-black text-white shadow-lg shadow-indigo-500/20 animate-in zoom-in duration-300">
                          {pendingCount}
                        </span>
                      )}

                      {/* Dirty indicator dot */}
                      {isDirty && item.href === "/publish" && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-lg shadow-amber-400/20" title="Unsaved draft" />
                      )}
                    </a>
                  );
                })
            )}
          </nav>
        </div>

        {/* User Status & Logout */}
        <div className="mt-auto px-2 pb-2">
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shrink-0 border-2 border-zinc-950" />
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium text-white leading-none">Agent Profile</p>
                <p className="text-xs text-amber-500 mt-1 capitalize font-medium">
                  {role ? role.toLowerCase() : "Loading..."}
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
      </aside>
    </>
  );
}
