"use client";

import Link from "next/link";

const LINKS = [
  { label: "Platform", href: "/platform" },
  { label: "About Zoiko Group", href: "/about" },
  { label: "Leadership", href: "/leadership" },
  { label: "Security", href: "/security" },
];

export default function PressMiniFooter() {
  return (
    <footer className="bg-[#0A0F1C] border-t border-white/[0.06] py-6">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-mono text-[13px] text-[#21E6F3]">
          <span className="font-bold">ZoikoVertex&trade;</span>
          <span className="opacity-40">|</span>
          <span className="font-bold tracking-wide">ZOIKO GROUP</span>
        </div>

        <p className="text-white/30 text-[11px] font-mono text-center">
          Governed execution infrastructure &middot; A Zoiko Tech Inc. platform &middot; Zoiko Group Inc.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-white/50 text-[13px] hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
