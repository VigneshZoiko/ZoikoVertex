import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const navItems = [
    { label: "Platform",    href: "https://getzoikovertex.com/platform" },
    { label: "AI Agents",   href: "/ai-agents" },
    { label: "Solutions",   href: "https://getzoikovertex.com/solution" },
    { label: "Governance",  href: "https://getzoikovertex.com" },
    { label: "Resources",   href: "https://getzoikovertex.com/resources-hub" },
    { label: "About Us",    href: "https://getzoikovertex.com/about" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080812]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/">
            <Image src="/images/logo-wordmark.svg" alt="ZoikoVertex" width={235} height={36} />
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="flex items-center gap-1 hover:text-white transition-colors">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="https://getzoikovertex.com/login" className="text-sm font-medium border border-white/15 text-white/80 hover:text-white px-5 py-2 rounded-lg transition-colors hover:bg-white/5">
            Sign in
          </Link>
          <Link href="https://getzoikovertex.com/request-demo" className="text-sm font-medium border border-white/15 text-white/80 hover:text-white px-5 py-2 rounded-lg transition-colors hover:bg-white/5">
            Request a Demo
          </Link>
          <Link href="https://getzoikovertex.com/signup" className="text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-black px-5 py-2 rounded-lg transition-colors">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
