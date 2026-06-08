"use client";
import { useEffect, useRef, useState } from "react";
import React from "react";

const SIZES = ["Organisation size", "1–10", "11–50", "51–200", "201–1000", "1000+"];

const DELIVERABLES = [
  {
    title: "Revenue Leakage Estimate",
    description: "Quantified in dollar terms your CFO can validate independently",
    iconColor: "#00C8F0",
    iconBg: "#00C8F01F",
    iconBorder: "#00C8F033",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
  },
  {
    title: "Governance Maturity Score",
    description: "Benchmarked against enterprise governance standards with gap analysis",
   iconColor: "#00C8F0",
    iconBg: "#00C8F01F",
    iconBorder: "#00C8F033",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    title: "Compliance Exposure Summary",
    description: "Regulatory and process risk in your current digital execution environment",
    iconColor: "#00C8F0",
    iconBg: "#00C8F01F",
    iconBorder: "#00C8F033",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
      </svg>
    ),
  },
  {
    title: "Pilot Recommendation",
    description: "Specific payback model, KPI framework, and deployment recommendation",
    iconColor: "#00C8F0",
    iconBg: "#00C8F01F",
    iconBorder: "#00C8F033",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
  },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  user: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  email: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  building: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="18" rx="2"/>
      <path d="M8 21V8m8 13V8M2 12h20"/>
    </svg>
  ),
  size: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  message: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
};

function getIcon(type: string): React.ReactNode {
  return <span className="text-white/25 shrink-0">{ICON_MAP[type]}</span>;
}

interface FormData {
  fullName: string;
  workEmail: string;
  orgName: string;
  orgSize: string;
  challenge: string;
}
interface Errors { [key: string]: string; }

const inputBase = "flex items-center gap-2 w-full bg-[#0C1529] border rounded-xl px-4 py-3 transition-all duration-200";
const inputNormal = `${inputBase} border-white/10 focus-within:border-cyan-400/50`;
const inputErr = `${inputBase} border-red-500/40 bg-red-500/5`;

export default function AboutAudit() {
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormData>({
    fullName: "", workEmail: "", orgName: "",
    orgSize: "Organisation size", challenge: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.05 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const validate = () => {
    const e: Errors = {};
    if (!form.fullName.trim()) e.fullName = "Required";
    if (!form.workEmail.trim()) e.workEmail = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.workEmail)) e.workEmail = "Invalid email";
    if (!form.orgName.trim()) e.orgName = "Required";
    if (form.orgSize === "Organisation size") e.orgSize = "Required";
    return e;
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitted(true);
  };

  return (
    <section className="bg-[#0C1529] py-20 px-6">
      <div ref={ref} className="max-w-[1200] mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-14 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 border border-[#00C8F038] bg-[#00C8F01F] rounded-full px-4 py-1.5 mb-6">
            <span className="text-[#00C8F0] text-xs">✦</span>
            <span className="text-[#00C8F0] text-xs font-semibold tracking-widest uppercase">Contact</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
            Start with the 48-Hour Audit
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-md mx-auto">
            Identify revenue leakage, surface governance gaps, and quantify
            compliance exposure — before any commitment to ZoikoVertex.
          </p>
        </div>

        {/* Two col */}
        <div className="grid lg:grid-cols-2 gap-10 items-start">

          {/* LEFT */}
          <div
            className={`transition-all duration-700 ease-out ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "150ms" }}
          >
            <div className="inline-flex items-center gap-2 border border-[#6366F140] bg-[#6366F11F] rounded-full px-3 py-1 mb-4">
              <span className="text-[#A5B4FC] text-xs">✦</span>
              <span className="text-[#A5B4FC] text-xs font-semibold tracking-widest uppercase">
                Audit Deliverables
              </span>
            </div>

            <p className="text-white/40 text-sm leading-relaxed mb-8">
              Four structured outputs — yours to keep regardless of what you decide next.
            </p>

            <div className="flex flex-col gap-3">
              {DELIVERABLES.map((item, i) => (
                <div
                  key={item.title}
                  className={`flex items-start gap-4 border border-[#1E2F55] rounded-xl p-4 bg-[#0E1B35]
                    hover:border-white/15 hover:bg-[#0d0d1f] transition-all duration-300 cursor-default
                    ${visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                  style={{ transitionDelay: `${250 + i * 80}ms` }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      color: item.iconColor,
                      background: item.iconBg,
                      border: `1px solid ${item.iconBorder}`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-white text-sm font-black mb-0.5">{item.title}</p>
                    <p className="text-white/35 text-xs leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Form */}
          <div
            className={`transition-all duration-700 ease-out ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "250ms" }}
          >
            {submitted ? (
              <div className="border border-cyan-400/20 rounded-2xl p-10 bg-[#0a0a18] flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3 className="text-white text-xl font-black">Audit Request Submitted</h3>
                <p className="text-white/40 text-sm leading-relaxed max-w-xs">
                  Response within 48 hours. Your deliverables are yours to keep.
                </p>
              </div>
            ) : (
              <div className="border border-white/10 rounded-2xl p-6 bg-[#0E1B35]">
                <h3 className="text-white text-base font-black mb-5">Run the 48-Hour Audit</h3>

                <div className="flex flex-col gap-3">

                  {/* Full name */}
                  <div>
                    <div className={errors.fullName ? inputErr : inputNormal}>
                      {getIcon("user")}
                      <input
                        type="text"
                        placeholder="Full name"
                        value={form.fullName}
                        onChange={(e) => handleChange("fullName", e.target.value)}
                        className="bg-transparent outline-none w-full text-sm placeholder-white/25 text-white"
                      />
                    </div>
                    {errors.fullName && <p className="text-red-400 text-xs mt-1 ml-1">{errors.fullName}</p>}
                  </div>

                  {/* Work email */}
                  <div>
                    <div className={errors.workEmail ? inputErr : inputNormal}>
                      {getIcon("email")}
                      <input
                        type="email"
                        placeholder="Work email address"
                        value={form.workEmail}
                        onChange={(e) => handleChange("workEmail", e.target.value)}
                        className="bg-transparent outline-none w-full text-sm placeholder-white/25 text-white"
                      />
                    </div>
                    {errors.workEmail && <p className="text-red-400 text-xs mt-1 ml-1">{errors.workEmail}</p>}
                  </div>

                  {/* Organisation name */}
                  <div>
                    <div className={errors.orgName ? inputErr : inputNormal}>
                      {getIcon("building")}
                      <input
                        type="text"
                        placeholder="Organisation name"
                        value={form.orgName}
                        onChange={(e) => handleChange("orgName", e.target.value)}
                        className="bg-transparent outline-none w-full text-sm placeholder-white/25 text-white"
                      />
                    </div>
                    {errors.orgName && <p className="text-red-400 text-xs mt-1 ml-1">{errors.orgName}</p>}
                  </div>

                  {/* Organisation size */}
                  <div>
                    <div className={errors.orgSize ? inputErr : inputNormal}>
                      {getIcon("size")}
                      <select
                        value={form.orgSize}
                        onChange={(e) => handleChange("orgSize", e.target.value)}
                        className="bg-transparent outline-none w-full text-sm text-white/50 appearance-none cursor-pointer"
                      >
                        {SIZES.map((s) => (
                          <option key={s} value={s} style={{ backgroundColor: "#0d1520", color: "white" }}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/25 shrink-0">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                    {errors.orgSize && <p className="text-red-400 text-xs mt-1 ml-1">{errors.orgSize}</p>}
                  </div>

                  {/* Challenge textarea */}
                  <div className={`${inputNormal} !items-start !py-3`}>
                    <span className="mt-0.5">{getIcon("message")}</span>
                    <textarea
                      rows={3}
                      placeholder="Briefly describe your current execution challenge (optional)"
                      value={form.challenge}
                      onChange={(e) => handleChange("challenge", e.target.value)}
                      className="bg-transparent outline-none w-full text-sm placeholder-white/25 text-white resize-none"
                    />
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    className="w-full flex items-center justify-center gap-2 bg-[#00C8F0] hover:bg-cyan-300 text-[#050A17] text-sm font-black py-4 rounded-xl transition-colors duration-300"
                  >
                    Submit — Run the Audit
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>

                  {/* Footer note */}
                  <p className="text-white/20 text-xs text-center leading-relaxed">
                    No commitment required · Response within 48 hours · Deliverables yours to keep
                  </p>

                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}