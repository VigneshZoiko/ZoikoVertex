import { headers } from "next/headers";
import Link from "next/link";
import { Home, LayoutGrid, CreditCard, ShieldCheck, Lock, Calendar, Search } from "lucide-react";

const LINKS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Platform", href: "/platform", icon: LayoutGrid },
  { label: "Pricing", href: "/pricing", icon: CreditCard },
  { label: "Governance", href: "/governance", icon: ShieldCheck },
  { label: "Security", href: "/security", icon: Lock },
  { label: "Request a demo", href: "/request-demo", icon: Calendar },
];

export default async function NotFound() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";

  if (host.includes("getzoikovertex")) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 py-24">
        <p className="text-white/50 text-sm">This page could not be found.</p>
      </div>
    );
  }

  return (
    <section className="bg-[#080d1a] min-h-[70vh] flex items-center justify-center px-6 py-24">
      <div className="max-w-2xl w-full text-center">
        <div className="relative select-none mb-2">
          <span className="text-[clamp(6rem,16vw,9rem)] font-black leading-none text-white/[0.06]">404</span>
          <h1 className="absolute inset-0 flex items-center justify-center text-[clamp(1.6rem,3vw,2.2rem)] font-black text-white">
            Page not found.
          </h1>
        </div>

        <p className="text-white/50 text-[15px] leading-relaxed mb-10">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search pages, features, docs..."
            className="w-full bg-[#101D2F] border border-white/10 rounded-xl pl-11 pr-16 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#20E7F2]/40 transition"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/30 border border-white/10 rounded px-1.5 py-0.5">
            / to focus
          </span>
        </div>

        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 mb-4">
          Or go to
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-white/70 text-[13px] font-medium hover:bg-white/5 hover:border-white/20 transition"
            >
              <l.icon className="w-3.5 h-3.5" />
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
