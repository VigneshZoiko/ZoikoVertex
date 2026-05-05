"use client";

import { useEffect, useState } from "react";
import { Search, Bell, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email ?? "");
    };
    fetchUser();
  }, []);

  return (
    <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-8 z-10 sticky top-0">
      <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 w-96">
        <Search className="w-4 h-4 text-zinc-500 mr-2" />
        <input 
          type="text" 
          placeholder="Search workspace..." 
          className="bg-transparent border-none outline-none text-sm text-zinc-300 w-full placeholder:text-zinc-600"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">System Secure</span>
        </div>

        <button className="relative text-zinc-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full border-2 border-zinc-950"></span>
        </button>
        
        <div className="flex items-center pl-6 border-l border-zinc-800">
          <div className="text-right mr-3 hidden md:block">
            <p className="text-sm font-medium text-white">{email || "Loading..."}</p>
            <p className="text-xs text-zinc-500">Authenticated Session</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
        </div>
      </div>
    </header>
  );
}
