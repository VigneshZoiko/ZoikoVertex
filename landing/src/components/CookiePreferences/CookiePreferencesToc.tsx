"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const TOC = [
  { id: "cookie-controls", title: "Cookie Controls" },
  { id: "category-details", title: "Category Details" },
  { id: "california-controls", title: "California Controls" },
  { id: "vendor-categories", title: "Vendor Categories" },
  { id: "consent-history", title: "Consent History" },
  { id: "faq", title: "FAQ" },
];

const RELATED = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Data Processing Addendum" },
  { href: "/responsible-ai", label: "Responsible AI" },
  { href: "/governance", label: "Compliance & Governance" },
  { href: "/request-demo", label: "Support" },
];

export default function CookiePreferencesToc() {
  const [activeId, setActiveId] = useState(TOC[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    TOC.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <aside className="sticky top-[88px] hidden w-56 shrink-0 lg:block">
      <p className="border-b border-slate-200 pb-2.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 font-[family-name:var(--font-jetbrains)]">
        Contents
      </p>

      <nav className="mt-4 space-y-0.5">
        {TOC.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`block rounded-md border-l-2 px-3 py-1.5 text-[12.5px] leading-snug transition-colors ${
              activeId === item.id
                ? "border-[#20E7F2] bg-[#20E7F2]/[0.08] font-semibold text-[#0d8d9a]"
                : "border-transparent text-slate-500 hover:bg-gray-100 hover:text-slate-800"
            }`}
          >
            {item.title}
          </a>
        ))}
      </nav>

      <div className="mt-8 border-t border-slate-200 pt-4">
        <p className="text-[9.5px] font-medium uppercase tracking-[0.16em] text-gray-400 font-[family-name:var(--font-jetbrains)]">
          Related pages
        </p>
        <ul className="mt-3.5 space-y-2.5">
          {RELATED.map((r) => (
            <li key={r.label}>
              <Link
                href={r.href}
                className="group inline-flex items-center gap-2 text-[12.5px] font-light text-[#0d8d9a] transition-colors hover:text-[#20E7F2]"
              >
                <ArrowUpRight className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                {r.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
