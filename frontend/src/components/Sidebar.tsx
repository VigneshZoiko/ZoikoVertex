"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, PenTool, CheckSquare, Link2, LogOut, Users, FileEdit, Calendar, ClipboardList } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRealtimeNotifications } from "@/lib/hooks/useRealtimeNotifications";
import { useDraftGuard } from "@/lib/context/DraftGuardContext";
import DiscardModal from "@/components/DiscardModal";

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

  // Initialize Realtime Subscriptions
  useRealtimeNotifications();

  const fetchPendingCount = useCallback(async (userRole: string) => {
    let query = supabase.from('publish_intents').select('id', { count: 'exact', head: true });
    
    if (userRole.toUpperCase() === 'ADMIN') {
      query = query.eq('status', 'PENDING_ADMIN');
    } else if (userRole.toUpperCase() === 'MANAGER') {
      query = query.eq('status', 'PENDING_MANAGER');
    } else {
      return;
    }

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
        .from('workspace_members')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setRole(data.role);
        fetchPendingCount(data.role);
      }
      setRoleLoaded(true);
    };
    fetchUserAndRole();
  }, [fetchPendingCount]);

  // Real-time listener for badge count
  useEffect(() => {
    if (!role) return;
    
    const channel = supabase
      .channel('pending-count-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publish_intents' }, () => {
        fetchPendingCount(role);
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [role, fetchPendingCount]);

  // Browser tab close / refresh guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
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
    if (isDirty) {
      setPendingHref('/login');
      setShowDiscardModal(true);
      return;
    }
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const navItems = [
    { name: "Dashboard",         href: "/",               icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "CREATOR"] },
    { name: "Upload Asset",      href: "/library/upload", icon: PenTool,         roles: ["CREATOR"] },
    { name: "Media Library",     href: "/library",        icon: Link2,           roles: ["ADMIN", "MANAGER"] },
    { name: "Social Publisher",  href: "/publish",        icon: PenTool,         roles: ["MANAGER"] },
    { name: "My Posts",          href: "/manage-posts",   icon: FileEdit,        roles: ["MANAGER"] },
    { name: "Review & Edit",     href: "/queue",          icon: ClipboardList,   roles: ["MANAGER"] },
    { name: "Approval Queue",    href: "/queue",          icon: CheckSquare,     roles: ["ADMIN"] },
    { name: "Calendar",          href: "/calendar",       icon: Calendar,        roles: ["ADMIN", "MANAGER"] },
    { name: "Platform Accounts", href: "/accounts",       icon: Link2,           roles: ["ADMIN"] },
    { name: "Team Access",       href: "/team",           icon: Users,           roles: ["ADMIN"] },
  ];

  return (
    <>
      {/* Discard Modal */}
      <DiscardModal
        isOpen={showDiscardModal}
        pendingHref={pendingHref}
        onConfirm={handleDiscardConfirm}
        onCancel={handleDiscardCancel}
      />

      <div className="w-64 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col h-screen p-4 transition-colors">
        {/* Brand */}
        <div className="flex items-center mb-10 px-2 mt-2">
          <div className="w-8 h-8 bg-[var(--foreground)] rounded-lg flex items-center justify-center mr-3">
            <span className="text-[var(--background)] font-bold text-xl">Z</span>
          </div>
          <span className="text-[var(--sidebar-text)] font-bold text-xl tracking-wide">ZoikoVertex</span>
        </div>

        {/* Navigation Links mapped by Role */}
        <div className="mb-6 px-2">
          <p className="text-xs font-semibold text-[var(--sidebar-text-muted)] uppercase tracking-wider mb-3">Workspace</p>
          <nav className="space-y-1">
            {!roleLoaded ? (
              <div className="space-y-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 rounded-lg bg-[var(--sidebar-hover)]/50 animate-pulse" />
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
                      className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${
                        isActive
                          ? "bg-[var(--sidebar-active)] text-indigo-400 font-medium"
                          : "text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]"
                      }`}
                    >
                      <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-indigo-400" : "text-[var(--sidebar-text-muted)] group-hover:text-[var(--sidebar-text)]"}`} />
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
          <div className="p-3 bg-[var(--surface)] border border-[var(--sidebar-border)] rounded-xl mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-[var(--sidebar-bg)]"></div>
              <div className="ml-3">
                <p className="text-sm font-medium text-[var(--sidebar-text)] leading-none">Agent Profile</p>
                <p className="text-xs text-amber-500 mt-1 capitalize font-medium">
                  {role ? role.toLowerCase() : "Loading..."}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3 shrink-0" />
            <span className="text-sm font-medium">Secure Log out</span>
          </button>
        </div>
      </div>
    </>
  );
}
