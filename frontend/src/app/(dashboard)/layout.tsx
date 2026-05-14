import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import { DraftGuardProvider } from "@/lib/context/DraftGuardContext";
import { NotificationProvider } from "@/lib/context/NotificationContext";
import { api } from "@/lib/api";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
