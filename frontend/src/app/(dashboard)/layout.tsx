import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-zinc-950 text-white h-screen overflow-hidden flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}
