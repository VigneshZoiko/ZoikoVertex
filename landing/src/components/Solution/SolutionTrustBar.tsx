"use client";
import { useEffect, useRef, useState } from "react";

const TRUST_PILLARS = [
  {
    title: "Security Architecture",
    description:
      "RBAC + ABAC, SSO/SAML/SCIM path, MFA, audit log streaming, and security administration separation by design.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
  },
  {
    title: "Privacy Controls",
    description:
      "GDPR-aligned data handling, regional data residency options, DSR workflows, and sub-processor transparency.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    title: "Audit & Evidence",
    description:
      "Immutable WORM-ready audit trail, watermarked exports, and Evidence Vault for legal and compliance review.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    title: "Responsible AI",
    description:
      "Human-in-the-loop defaults, source grounding, autonomy tier controls, and EU AI Act-aware governance design.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        <path d="M15 13l2 2 4-4"/>
      </svg>
    ),
  },
];

export default function SolutionTrustBar() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#111D2E] border-t border-white/5 py-12 px-6">
      <div
        ref={ref}
        className="max-w-[1200] mx-auto grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/10"
      >
        {TRUST_PILLARS.map((item, i) => (
          <div
            key={item.title}
            className={`flex flex-col gap-4 px-8 py-4 group cursor-default
              hover:bg-white/[0.02] transition-all duration-500 ease-out
              ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-cyan-400/8 border border-cyan-400/15 flex items-center justify-center text-cyan-400 transition-transform duration-300 group-hover:scale-110">
              {item.icon}
            </div>

            {/* Title */}
            <h3 className="text-white text-sm font-black">
              {item.title}
            </h3>

            {/* Description */}
            <p className="text-white/35 text-xs leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}