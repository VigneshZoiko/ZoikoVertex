"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import PendingApproval from "@/components/PendingApproval";
import { DraftGuardProvider } from "@/lib/context/DraftGuardContext";
import { NotificationProvider } from "@/lib/context/NotificationContext";
import { useRoleContext } from "@/lib/context/RoleContext";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { orgStatus, isSuperAdmin, isLoading } = useRoleContext();

  if (isLoading) {
    return (
      <div className="h-screen bg-[var(--background,#111111)] flex overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="w-64 shrink-0 bg-[var(--sidebar-bg,#1a1a1a)] border-r border-[var(--sidebar-border,#2a2a2a)] flex flex-col">
          <div className="px-4 pt-5 pb-4 border-b border-[var(--sidebar-border,#2a2a2a)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--sidebar-hover,#222)] animate-pulse" />
              <div className="h-5 w-28 rounded bg-[var(--sidebar-hover,#222)] animate-pulse" />
            </div>
          </div>
          <div className="flex-1 py-4 px-3 space-y-2">
            {[80, 60, 72, 64, 56, 68].map((w, i) => (
              <div key={i} className="h-9 rounded-lg bg-[var(--sidebar-hover,#222)] animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </div>
        {/* Main area skeleton */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-16 border-b border-[var(--border,#2a2a2a)] bg-[var(--header-bg,#111)] px-8 flex items-center justify-between shrink-0">
            <div className="h-8 w-80 rounded-lg bg-[var(--surface,#1a1a1a)] animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--surface,#1a1a1a)] animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-[var(--surface,#1a1a1a)] animate-pulse" />
              <div className="h-8 w-32 rounded-lg bg-[var(--surface,#1a1a1a)] animate-pulse" />
            </div>
          </div>
          <div className="flex-1 p-8 space-y-4">
            <div className="h-8 w-48 rounded-lg bg-[var(--surface,#1a1a1a)] animate-pulse" />
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-28 rounded-2xl bg-[var(--surface,#1a1a1a)] animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
            <div className="h-64 rounded-2xl bg-[var(--surface,#1a1a1a)] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Gate access if org is PENDING (and not a superadmin)
  if (!isSuperAdmin && orgStatus === "PENDING") {
    return <PendingApproval />;
  }

  return (
    <NotificationProvider>
      <DraftGuardProvider>
        <WelcomeOverlay />
        <div className="bg-[var(--background)] text-[var(--foreground)] h-screen overflow-hidden flex transition-colors">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 h-screen">
            <Header />
            <main className="flex-1 overflow-y-auto p-8 bg-[var(--background)] transition-colors">
              <div key={pathname} className="page-enter">
                {children}
              </div>
            </main>
          </div>
        </div>
      </DraftGuardProvider>
    </NotificationProvider>
  );
}
