"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const ROLES = ["Your Role", "CMO / Marketing Leader", "Digital Marketing Director", "Head of Brand", "Compliance / Legal", "CIO / CTO", "Agency Leader", "Other"];
const SIZES = ["Company Size", "1–10", "11–50", "51–200", "201–1000", "1000+"];
const INTERESTS = ["Primary interest", "Governed AI Execution", "Approval Workflows", "Brand Governance", "Evidence & Audit", "Multi-Brand Operations", "Agency Solutions"];

interface FormData {
  fullName: string;
  workEmail: string;
  company: string;
  role: string;
  companySize: string;
  primaryInterest: string;
  phone: string;
  country: string;
  challenge: string;
}

interface Errors { [key: string]: string; }

// ── Icons outside component ──
const ICON_MAP: Record<string, React.ReactNode> = {
  user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  email: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  building: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 21V8m8 13V8M2 12h20"/></svg>,
  role: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  size: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  interest: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 8 16 12 12 16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  phone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 0116 1.19 2 2 0 0118 3.17v3a2 2 0 01-1.44 1.94"/></svg>,
  globe: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  message: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
};

function getIcon(type: string) {
  return <span className="text-white/25 shrink-0">{ICON_MAP[type]}</span>;
}

const inputBase = "flex items-center gap-2 w-full bg-[#0d1520] border rounded-xl px-4 py-3 transition-all duration-200";
const inputNormal = `${inputBase} border-white/10 focus-within:border-cyan-400/50`;
const inputErr = `${inputBase} border-red-500/40 bg-red-500/5`;

export default function RequestDemoHero() {
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormData>({
    fullName: "", workEmail: "", company: "", role: "Your Role",
    companySize: "Company Size", primaryInterest: "Primary interest",
    phone: "", country: "", challenge: "",
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
    if (!form.company.trim()) e.company = "Required";
    if (form.role === "Your Role") e.role = "Required";
    if (form.companySize === "Company Size") e.companySize = "Required";
    if (form.primaryInterest === "Primary interest") e.primaryInterest = "Required";
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
    <section className="bg-[#080E1A] min-h-screen pt-16 sm:pt-20 lg:pt-28 pb-16 px-4 sm:px-6">
      <div ref={ref} className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">

        {/* ── LEFT ── */}
        <div
          className={`transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
            <span>✦</span> REQUEST A DEMO
          </p>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white leading-tight mb-6">
            AI marketing without an audit trail is not automation.{" "}
            <span className="text-cyan-400">It is exposure.</span>
          </h1>

          <p className="text-white/40 text-sm leading-relaxed max-w-md mb-10">
            See how ZoikoVertex helps teams create, approve, and
            publish AI-assisted content with human accountability, policy
            controls, and evidence trails built in — not bolted on.
          </p>

          <div className="border border-white/10 rounded-xl p-5 bg-[#0a0a18] flex items-start gap-3">
            <span className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0 animate-pulse" />
            <p className="text-white/50 text-xs leading-relaxed">
              <span className="text-white font-bold">
                Enterprise requests receive a named Account Executive within 4 business hours.
              </span>{" "}
              Mid-market receives a calendar for a 45-minute governance demo.
              Smaller teams can start with a Guided Evaluation below.
            </p>
          </div>
        </div>

        {/* ── RIGHT — Form ── */}
        <div
          className={`transition-all  duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          {submitted ? (
            <div className="border border-cyan-400/20 rounded-2xl p-12 bg-[#0a0a18] flex flex-col items-center gap-5 text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3 className="text-white text-2xl font-black">Demo Request Received</h3>
              <p className="text-white/40 text-sm leading-relaxed max-w-sm">
                We&apos;ll route your request to the right team within 4 business hours.
                Check your inbox for next steps.
              </p>
            </div>
          ) : (
            <div className="border border-white/10 rounded-2xl p-7 bg-[#0a0a18]">

              <h2 className="text-white text-base font-black mb-1 tracking-wide">
                REQUEST YOUR DEMO
              </h2>
              <p className="text-white/30 text-xs mb-6">
                Routed to the right path based on your role and size.
              </p>

              <div className="flex flex-col gap-6">

                {/* Row 1 — Full name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </div>

                {/* Row 2 — Company + Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className={errors.company ? inputErr : inputNormal}>
                      {getIcon("building")}
                      <input
                        type="text"
                        placeholder="Company"
                        value={form.company}
                        onChange={(e) => handleChange("company", e.target.value)}
                        className="bg-transparent outline-none w-full text-sm placeholder-white/25 text-white"
                      />
                    </div>
                    {errors.company && <p className="text-red-400 text-xs mt-1 ml-1">{errors.company}</p>}
                  </div>
                  <div>
                    <div className={errors.role ? inputErr : inputNormal}>
                      {getIcon("role")}
                      <select
                        value={form.role}
                        onChange={(e) => handleChange("role", e.target.value)}
                        className="bg-transparent outline-none w-full text-sm text-white/50 appearance-none cursor-pointer"
                        style={{ backgroundColor: "transparent" }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r} style={{ backgroundColor: "#0d1520", color: "white" }}>{r}</option>
                        ))}
                      </select>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/25 shrink-0">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                    {errors.role && <p className="text-red-400 text-xs mt-1 ml-1">{errors.role}</p>}
                  </div>
                </div>

                {/* Row 3 — Company Size + Primary Interest */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className={errors.companySize ? inputErr : inputNormal}>
                      {getIcon("size")}
                      <select
                        value={form.companySize}
                        onChange={(e) => handleChange("companySize", e.target.value)}
                        className="bg-transparent outline-none w-full text-sm text-white/50 appearance-none cursor-pointer"
                      >
                        {SIZES.map((s) => (
                          <option key={s} value={s} style={{ backgroundColor: "#0d1520", color: "white" }}>{s}</option>
                        ))}
                      </select>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/25 shrink-0">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                    {errors.companySize && <p className="text-red-400 text-xs mt-1 ml-1">{errors.companySize}</p>}
                  </div>
                  <div>
                    <div className={errors.primaryInterest ? inputErr : inputNormal}>
                      {getIcon("interest")}
                      <select
                        value={form.primaryInterest}
                        onChange={(e) => handleChange("primaryInterest", e.target.value)}
                        className="bg-transparent outline-none w-full text-sm text-white/50 appearance-none cursor-pointer"
                      >
                        {INTERESTS.map((s) => (
                          <option key={s} value={s} style={{ backgroundColor: "#0d1520", color: "white" }}>{s}</option>
                        ))}
                      </select>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/25 shrink-0">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                    {errors.primaryInterest && <p className="text-red-400 text-xs mt-1 ml-1">{errors.primaryInterest}</p>}
                  </div>
                </div>

                {/* Row 4 — Phone + Country */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={inputNormal}>
                    {getIcon("phone")}
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="bg-transparent outline-none w-full text-sm placeholder-white/25 text-white"
                    />
                  </div>
                  <div className={inputNormal}>
                    {getIcon("globe")}
                    <input
                      type="text"
                      placeholder="Country/Region"
                      value={form.country}
                      onChange={(e) => handleChange("country", e.target.value)}
                      className="bg-transparent outline-none w-full text-sm placeholder-white/25 text-white"
                    />
                  </div>
                </div>

                {/* Textarea */}
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
                  className="w-full bg-cyan-400 hover:bg-cyan-300 text-black text-sm font-black py-4 rounded-xl transition-colors duration-300 tracking-widest uppercase mt-1"
                >
                  SUBMIT
                </button>

                {/* Privacy */}
                <p className="text-white/25 text-xs text-center">
                  We value your privacy. To learn more, visit our{" "}
                  <button className="text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2">
                    Privacy Statement
                  </button>
                </p>

              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}