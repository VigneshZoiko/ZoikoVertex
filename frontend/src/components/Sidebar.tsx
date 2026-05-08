"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PenTool, CheckSquare, Link2, LogOut, Users, FileEdit } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRealtimeNotifications } from "@/lib/hooks/useRealtimeNotifications";

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  // Initialize Realtime Subscriptions
  useRealtimeNotifications();

  useEffect(() => {
    const fetchUserAndRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      
      // Fetch role from workspace_members
      const { data } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('user_id', user.id)
        .single();
        
      if (data) setRole(data.role);
      setRoleLoaded(true);
    };

    fetchUserAndRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const navItems = [
    { name: "Dashboard",        href: "/",        icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "CREATOR"] },
    { name: "Social Publisher", href: "/publish", icon: PenTool,          roles: ["CREATOR"] },
    { name: "Review & Edit",    href: "/review",  icon: FileEdit,         roles: ["CREATOR"] },
    { name: "Approval Queue",   href: "/queue",   icon: CheckSquare,      roles: ["ADMIN", "MANAGER"] },
    { name: "Platform Accounts",href: "/accounts",icon: Link2,            roles: ["ADMIN", "MANAGER"] },
    { name: "Team Access",      href: "/team",    icon: Users,            roles: ["ADMIN", "MANAGER"] },
  ];

  return (
    <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen p-4">
      {/* Brand */}
      <div className="flex items-center mb-10 px-2 mt-2">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
          <span className="text-black font-bold text-xl">Z</span>
        </div>
        <span className="text-white font-bold text-xl tracking-wide">ZoikoVertex</span>
      </div>

      {/* Navigation Links mapped by Role */}
      <div className="mb-6 px-2">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Workspace</p>
        <nav className="space-y-1">
          {!roleLoaded ? (
            // Skeleton shimmer while role is loading — prevents flash of all items
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
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                      isActive 
                        ? "bg-indigo-500/10 text-indigo-400 font-medium" 
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-indigo-400" : "text-zinc-500"}`} />
                    {item.name}
                  </Link>
                );
              })
          )}
        </nav>
      </div>

      {/* User Status & Logout */}
      <div className="mt-auto px-2 pb-2">
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-zinc-950"></div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white leading-none">Agent Profile</p>
              <p className="text-xs text-amber-500 mt-1 capitalize font-medium">{role ? role.toLowerCase() : "Loading..."}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2.5 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="text-sm font-medium">Secure Log out</span>
        </button>
      </div>
    </div>
  );
}
