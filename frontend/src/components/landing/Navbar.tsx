import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const navItems = [
    { label: "Platform", hasDropdown: true },
    { label: "AI Agents", hasDropdown: true },
    { label: "Solutions", hasDropdown: true },
    { label: "Governance", hasDropdown: false },
    { label: "Resources", hasDropdown: true },
    { label: "About Us", hasDropdown: false },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080812]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Image
            src="/images/logo-wordmark.svg"
            alt="ZoikoVertex"
            width={235}
            height={36}
          />
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
          {navItems.map((item) => (
            <button
              key={item.label}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              {item.label}
              {item.hasDropdown && (
                <svg
                  className="w-3 h-3 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/signin"
            className="text-sm font-medium border border-white/15 text-white/80 hover:text-white px-5 py-2 rounded-lg transition-colors hover:bg-white/5"
          >
            Sign in
          </Link>
          <Link
            href="/request-demo"
            className="text-sm font-medium border border-white/15 text-white/80 hover:text-white px-5 py-2 rounded-lg transition-colors hover:bg-white/5"
          >
            Request a Demo
          </Link>
          <Link
            href="/signup"
            className="text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-black px-5 py-2 rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
