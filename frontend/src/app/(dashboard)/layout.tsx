"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import PendingApproval from "@/components/PendingApproval";
import { DraftGuardProvider } from "@/lib/context/DraftGuardContext";
import { NotificationProvider } from "@/lib/context/NotificationContext";
import { api } from "@/lib/api";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [orgStatus, setOrgStatus] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await api.get('/api/v1/user/context');
        if (result.success) {
          setOrgStatus(result.data.org_status);
          setIsSuperAdmin(result.data.is_superadmin);
        }
      } catch (err) {
        console.error("Failed to check org status", err);
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-[#111111] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
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
              {children}
            </main>
          </div>
        </div>
      </DraftGuardProvider>
    </NotificationProvider>
  );
}
