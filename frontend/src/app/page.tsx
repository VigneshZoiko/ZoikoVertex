import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  Eye,
  Zap,
  CheckSquare,
  BarChart2,
  Shield,
  LayoutGrid,
  BarChart,
  User,
  Users,
  Link2,
  Clock,
  Play,
  FileText,
  Globe,
} from "lucide-react";

/* ── Navbar ─────────────────────────────────────────────────────────────── */
function Navbar() {
  const navItems = [
    "Platform",
    "AI Agents",
    "Solutions",
    "Resources",
    "About Us",
    "Pricing",
  ];
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080812]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/images/logo-dark.jpeg"
            alt="ZoikoVertex"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="text-white font-bold text-lg tracking-tight">
            Zoiko<span className="text-cyan-400">Vertex</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
          {navItems.map((item) => (
            <button
              key={item}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              {item}
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
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
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

/* ── Hero ────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="bg-[#080812] pt-32 pb-24 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2.5 border border-cyan-400/40 bg-cyan-400/5 text-cyan-400 text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
            Governed Agentic Marketing Operating System
          </div>
          <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight mb-6">
            Run Marketing
            <br />
            with{" "}
            <span className="text-cyan-400">
              Financial
              <br />
              Control
            </span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-8 max-w-lg">
            ZoikoVertex helps teams{" "}
            <span className="text-white/80">
              plan, execute, govern, and optimize
            </span>{" "}
            digital marketing with AI agent workflows, approval controls, ROI
            evidence, and audit-ready operating discipline.
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href="/signup"
              className="bg-cyan-400 hover:bg-cyan-300 text-black font-semibold px-8 py-3.5 rounded-full transition-all flex items-center gap-2.5"
            >
              <Activity className="w-4 h-4" />
              Request Demo
            </Link>
            <a
              href="#pricing"
              className="bg-white/5 border border-white/15 hover:bg-white/10 text-white font-semibold px-8 py-3.5 rounded-full transition-all flex items-center gap-2.5"
            >
              Find Your Ideal Plan →
            </a>
          </div>
          <p className="text-white/30 text-xs mb-4">
            Built for governed execution, measurable ROI workflows, and
            enterprise-grade oversight.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "AI-agent workflows", icon: Zap },
              { label: "Approval-controlled execution", icon: CheckSquare },
              { label: "ROI evidence", icon: BarChart2 },
              { label: "Audit-ready governance", icon: Shield },
            ].map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 text-white/50 text-xs border border-white/10 px-3 py-1.5 rounded-full"
              >
                <Icon className="w-3 h-3 text-cyan-400/70" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="absolute -inset-4 bg-[#00c8f0]/5 blur-3xl rounded-3xl" />
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "#070d1a", border: "1.5px solid #00e5ff33" }}
          >
            {/* Title bar */}
            <div
              className="flex items-center justify-between px-4 py-2"
              style={{
                background: "#0a1225",
                borderBottom: "1px solid #1a2540",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "#ff5f56" }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "#ffbd2e" }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "#27c93f" }}
                />
                <span className="ml-2 text-[11px]" style={{ color: "#8899bb" }}>
                  ZoikoVertex — Executive Command Center
                </span>
              </div>
              <span
                className="text-[10px] font-semibold"
                style={{ color: "#00e5ff" }}
              >
                ● Governed Mode
              </span>
            </div>

            <div className="flex" style={{ minHeight: "420px" }}>
              {/* Sidebar */}
              <div
                className="flex-shrink-0 py-2"
                style={{
                  width: "148px",
                  background: "#0a1020",
                  borderRight: "1px solid #1a2540",
                }}
              >
                {/* Logo */}
                <div
                  className="px-3 pb-2 mb-1"
                  style={{ borderBottom: "1px solid #1a2540" }}
                >
                  <div className="font-black text-[12px] text-white tracking-tight">
                    Z<span style={{ color: "#00e5ff" }}>OIKO</span>VERTEX
                  </div>
                  <div className="text-[8px]" style={{ color: "#3a5070" }}>
                    Where Execution Becomes Accountable.
                  </div>
                </div>
                {/* God mode */}
                <div
                  className="mx-2 my-1.5 text-center text-[8px] font-bold py-1 rounded"
                  style={{
                    background: "#1a2540",
                    border: "1px solid #00e5ff33",
                    color: "#00e5ff",
                    letterSpacing: "0.5px",
                  }}
                >
                  + GOD MODE ACTIVE
                </div>

                {/* Platform Owner */}
                <div
                  className="px-2 pt-2 pb-0.5 text-[8px] font-bold tracking-widest uppercase"
                  style={{ color: "#3a5070" }}
                >
                  Platform Owner
                </div>
                {[
                  { label: "Governance Node", icon: Shield },
                  { label: "Global Analytics", icon: BarChart2 },
                  { label: "Support Queue", icon: Users },
                ].map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px]"
                    style={{ color: "#6a8aaa" }}
                  >
                    <Icon size={10} style={{ color: "#475569" }} />
                    {label}
                  </div>
                ))}

                {/* Command */}
                <div
                  className="px-2 pt-2 pb-0.5 text-[8px] font-bold tracking-widest uppercase"
                  style={{ color: "#3a5070" }}
                >
                  Command
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold"
                  style={{
                    background: "#1a3060",
                    color: "#00e5ff",
                    borderLeft: "2px solid #00c8f0",
                  }}
                >
                  <LayoutGrid size={10} style={{ color: "#00c8f0" }} />
                  Dashboard
                </div>
                {[
                  { label: "Operations Feed", icon: Activity },
                  { label: "Insights & ROI", icon: BarChart, badge: 186 },
                  { label: "Resource Monitoring", icon: Eye },
                ].map(({ label, icon: Icon, badge }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px]"
                    style={{ color: "#6a8aaa" }}
                  >
                    <Icon size={10} style={{ color: "#475569" }} />
                    <span className="flex-1">{label}</span>
                    {badge && (
                      <span
                        className="text-[8px] font-bold px-1 rounded"
                        style={{ background: "#ef4444", color: "#fff" }}
                      >
                        {badge}
                      </span>
                    )}
                  </div>
                ))}

                {/* Media Engine */}
                <div
                  className="px-2 pt-2 pb-0.5 text-[8px] font-bold tracking-widest uppercase"
                  style={{ color: "#3a5070" }}
                >
                  Media Engine
                </div>
                {[
                  { label: "Media Vault", icon: FileText },
                  { label: "Content Studio", icon: Zap },
                  { label: "Projects", icon: LayoutGrid },
                  { label: "Campaigns", icon: Globe },
                  { label: "Calendar", icon: Clock },
                  { label: "Inbox & Engagement", icon: Users },
                  { label: "Publishing Hub", icon: Link2 },
                ].map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px]"
                    style={{ color: "#6a8aaa" }}
                  >
                    <Icon size={10} style={{ color: "#475569" }} />
                    {label}
                  </div>
                ))}

                {/* Authority Layer */}
                <div
                  className="px-2 pt-2 pb-0.5 text-[8px] font-bold tracking-widest uppercase"
                  style={{ color: "#3a5070" }}
                >
                  Authority Layer
                </div>

                {/* Bottom */}
                <div className="mx-2 mt-2 flex gap-1.5">
                  <div
                    className="flex items-center justify-center rounded"
                    style={{ width: 28, height: 24, background: "#1a2540" }}
                  >
                    <Shield size={10} style={{ color: "#6a8aaa" }} />
                  </div>
                  <div
                    className="flex-1 flex items-center justify-center gap-1 rounded text-[9px] font-bold"
                    style={{
                      height: 24,
                      background: "#3a0a0a",
                      border: "1px solid #ff4444",
                      color: "#ff4444",
                    }}
                  >
                    <Activity size={9} /> Log out
                  </div>
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0"
                  style={{
                    background: "#0a1225",
                    borderBottom: "1px solid #1a2540",
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded"
                    style={{ width: 22, height: 22, background: "#1a2540" }}
                  >
                    <LayoutGrid size={10} style={{ color: "#6a8aaa" }} />
                  </div>
                  <div
                    className="text-[10px] font-semibold px-2 py-0.5 rounded"
                    style={{
                      background: "#1a3060",
                      border: "1px solid #00e5ff44",
                      color: "#00e5ff",
                    }}
                  >
                    Dashboard
                  </div>
                  <div
                    className="flex-1 flex items-center gap-1 px-2 rounded text-[9px]"
                    style={{
                      height: 20,
                      background: "#111e35",
                      border: "1px solid #1a2540",
                      color: "#4a6080",
                    }}
                  >
                    <CheckSquare size={9} /> Search workspace...
                  </div>
                  <div
                    className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: "#1a3060",
                      border: "1px solid #2a5090",
                      color: "#4a8aff",
                    }}
                  >
                    SUPERADMIN
                  </div>
                  <Shield size={11} style={{ color: "#6a8aaa" }} />
                  <BarChart2 size={11} style={{ color: "#6a8aaa" }} />
                  <div className="text-right">
                    <div
                      className="text-[9px] font-semibold"
                      style={{ color: "#ccdaee" }}
                    >
                      User_1
                    </div>
                    <div className="text-[8px]" style={{ color: "#4a6080" }}>
                      SUPER ADMIN
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-center rounded text-[8px] font-black"
                    style={{
                      width: 22,
                      height: 22,
                      background: "#1a3a5a",
                      color: "#00e5ff",
                    }}
                  >
                    DM
                  </div>
                </div>

                {/* Page content */}
                <div
                  className="flex-1 p-3 overflow-hidden"
                  style={{ background: "#070d1a" }}
                >
                  <div className="text-white font-bold text-[14px] mb-0.5">
                    Social Performance
                  </div>
                  <div
                    className="text-[10px] mb-3"
                    style={{ color: "#4a6080" }}
                  >
                    Monitor your connected platform metrics and publishing
                    queue.
                  </div>

                  {/* 4 metric cards */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      {
                        label: "Total Reach",
                        value: "124.5K",
                        badge: "+13%",
                        badgeColor: "#00cc66",
                        icon: Activity,
                        iconColor: "#00e5ff",
                      },
                      {
                        label: "Published Posts",
                        value: "84",
                        icon: CheckSquare,
                        iconColor: "#00cc66",
                      },
                      {
                        label: "Pending Approvals",
                        value: "12",
                        icon: Clock,
                        iconColor: "#ffaa00",
                      },
                      {
                        label: "Audience Growth",
                        value: "3,240",
                        badge: "+5.2%",
                        badgeColor: "#4488ff",
                        icon: Users,
                        iconColor: "#4488ff",
                      },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="rounded-lg p-2"
                        style={{
                          background: "#0d1830",
                          border: "1px solid #1a2540",
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div
                            className="flex items-center justify-center rounded"
                            style={{
                              width: 22,
                              height: 22,
                              background: "#111e35",
                            }}
                          >
                            <m.icon size={11} style={{ color: m.iconColor }} />
                          </div>
                          {m.badge && (
                            <span
                              className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                background: "rgba(0,204,102,0.1)",
                                color: m.badgeColor,
                              }}
                            >
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <div
                          className="text-[9px] mb-0.5"
                          style={{ color: "#4a6080" }}
                        >
                          {m.label}
                        </div>
                        <div className="font-bold text-[14px] text-white">
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chart card */}
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: "#0d1830",
                      border: "1px solid #1a2540",
                    }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <div className="text-white font-semibold text-[11px]">
                          Cross-Platform Engagement
                        </div>
                        <div
                          className="text-[9px]"
                          style={{ color: "#4a6080" }}
                        >
                          Aggregated views and interactions across Meta and
                          LinkedIn.
                        </div>
                      </div>
                      <div
                        className="text-[9px] px-2 py-0.5 rounded"
                        style={{
                          background: "#111e35",
                          border: "1px solid #1a2540",
                          color: "#4a6080",
                        }}
                      >
                        Last 7 Days
                      </div>
                    </div>
                    {/* Line chart simulation */}
                    <div className="relative" style={{ height: "80px" }}>
                      <svg
                        width="100%"
                        height="80"
                        viewBox="0 0 400 80"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient
                            id="chartGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#00cc44"
                              stopOpacity="0.4"
                            />
                            <stop
                              offset="100%"
                              stopColor="#00cc44"
                              stopOpacity="0.02"
                            />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,70 L40,60 L80,65 L120,45 L160,55 L200,35 L240,42 L280,25 L320,30 L360,15 L400,5"
                          fill="none"
                          stroke="#00cc44"
                          strokeWidth="2"
                        />
                        <path
                          d="M0,70 L40,60 L80,65 L120,45 L160,55 L200,35 L240,42 L280,25 L320,30 L360,15 L400,5 L400,80 L0,80 Z"
                          fill="url(#chartGrad)"
                        />
                      </svg>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px]" style={{ color: "#3a5070" }}>
                        May 1
                      </span>
                      <span className="text-[9px]" style={{ color: "#3a5070" }}>
                        May 7
                      </span>
                      <span className="text-[9px]" style={{ color: "#3a5070" }}>
                        May 14
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status bar */}
                <div
                  className="flex items-center gap-4 px-3 py-1.5 flex-shrink-0"
                  style={{
                    background: "#0a1225",
                    borderTop: "1px solid #1a2540",
                  }}
                >
                  <span
                    className="flex items-center gap-1 text-[9px] font-medium"
                    style={{ color: "#00cc66" }}
                  >
                    <CheckSquare size={9} /> Evidence log updated
                  </span>
                  <span
                    className="flex items-center gap-1 text-[9px] font-medium"
                    style={{ color: "#ffaa00" }}
                  >
                    <Clock size={9} /> Approval required
                  </span>
                  <span
                    className="flex items-center gap-1 text-[9px] font-medium"
                    style={{ color: "#4488ff" }}
                  >
                    <Shield size={9} /> Policy check passed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Trusted By ──────────────────────────────────────────────────────────── */
function TrustedBy() {
  return (
    <section className="bg-[#0a0a18] py-8 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-2">
        <span className="text-white/30 text-xs font-semibold tracking-widest uppercase">
          Trusted by enterprise leaders
        </span>
      </div>
    </section>
  );
}

/* ── Stats ───────────────────────────────────────────────────────────────── */
function Stats() {
  const stats = [
    { value: "26%", label: "Average CPA reduction" },
    { value: "72h", label: "Time to first insight" },
    { value: "3.7×", label: "Campaign ROI uplift" },
    { value: "30d", label: "Measurable ROI evidence" },
  ];

  return (
    <section
      className="py-24 px-6"
      style={{ background: "#f5f5f7" }}
      id="features"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-indigo-500 text-xs font-semibold tracking-widest uppercase mb-4">
            <span className="w-4 h-px bg-indigo-400" />
            Proof in practice
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-5">
            Numbers that move the board
          </h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed text-center">
            Not abstract intelligence. Measurable performance movement, reduced
            waste, and improved capital efficiency — reportable to finance.
          </p>
        </div>
        {/* Stats grid */}
        <div className="flex divide-x" style={{ borderColor: "#E3E9F0" }}>
          {stats.map((s) => (
            <div key={s.label} className="flex-1 bg-white px-8 py-10">
              <p
                className="text-5xl font-black mb-2"
                style={{ color: "#4f46e5" }}
              >
                {s.value}
              </p>
              <p className="text-gray-500 text-sm leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Feature Block ───────────────────────────────────────────────────────── */
function FeatureBlock() {
  const comparisons = [
    {
      tool: "Tools explain what happened",
      zoiko: "ZoikoVertex determines what should happen next and acts on it",
      icon: Clock,
    },
    {
      tool: "Tools optimize activity",
      zoiko:
        "ZoikoVertex optimizes revenue, contribution margin, and marketing efficiency",
      icon: Zap,
    },
    {
      tool: "Tools require humans to decide",
      zoiko:
        "ZoikoVertex makes and governs capital decisions continuously, within your policy",
      icon: CheckSquare,
    },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-start">
        {/* Left */}
        <div>
          <div className="inline-flex items-center gap-2 text-indigo-500 text-xs font-semibold tracking-widest uppercase mb-5">
            <span className="w-4 h-px bg-indigo-400" />
            Category Definition
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight mb-6">
            Tools execute tasks.
            <br />
            Systems manage outcomes.
          </h2>
          <p className="text-gray-500 text-base leading-relaxed mb-10">
            Traditional platforms like Hootsuite and Sprout Social help teams
            schedule, publish, and report. They do not allocate capital,
            optimize profit, enforce financial accountability, or align
            execution with enterprise operating realities.
          </p>
          <div className="space-y-4">
            {comparisons.map((c, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 p-5 bg-white flex items-start gap-4"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(79,70,229,0.08)" }}
                >
                  <c.icon size={18} style={{ color: "#4f46e5" }} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {c.tool}
                  </p>
                  <p className="text-gray-500 text-sm leading-snug">
                    {c.zoiko}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — photo */}
        <div className="relative">
          <div className="rounded-2xl overflow-hidden">
            <Image
              src="/images/category-photo.png"
              alt="Category"
              width={600}
              height={400}
              className="w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ─────────────────────────────────────────────────────────────── */
function Pricing() {
  const plans = [
    {
      tag: "FREE TIER",
      name: "Vertex Starter",
      price: "$0",
      billingNote: "always free",
      desc: "Connect channels, understand your governance posture, and see where ZoikoVertex reduces risk before your team commits.",
      stats: [
        { label: "users", value: "2" },
        { label: "channels", value: "2" },
        { label: "history", value: "386" },
      ],
      sectionLabel: "INCLUDED",
      features: [
        "Command Center (limited)",
        "Analytics snapshot",
        "AI recommendations — read-only",
        "Basic activity log",
        "Email support + help center",
      ],
      excluded: [
        "Live publishing or execution",
        "Approvals or workflows",
        "API access",
      ],
      cta: "Start free",
      ctaIcon: "play",
      ctaStyle: "ghost",
      highlight: false,
      recommended: false,
      footerNote: "No live execution authority on this plan.",
    },
    {
      tag: "ENTRY STEP, TIER",
      name: "Vertex Growth",
      price: "$299",
      billingNote: "$299 billed annually",
      desc: "Run governed campaigns with AI agents, approvals, publishing, and audit-ready execution for one brand team.",
      stats: [
        { label: "users", value: "7" },
        { label: "profiles", value: "8" },
        { label: "brand", value: "1" },
        { label: "history", value: "12mo" },
      ],
      sectionLabel: "EXECUTION",
      features: [
        "Content Studio + publishing",
        "5 AI agents — standard governed",
        "Review Queue + two-step approvals",
        "Immutable audit trail + export",
        "Basic Brand Library",
        "Analytics & ROI — standard",
        "Priority email support",
      ],
      excluded: ["Multi-brand portfolio", "Crisis Console", "SSO/SCIM"],
      cta: "Start 14-day trial",
      ctaIcon: "clock",
      ctaStyle: "ghost",
      highlight: false,
      recommended: false,
      footerNote: "Single-brand workspace only. No multi-entity governance.",
    },
    {
      tag: "RECOMMENDED · COMMERCIAL CENTER",
      name: "Vertex Scale",
      price: "$799",
      billingNote: "$799 billed annually",
      desc: "Coordinate multi-brand teams with advanced approvals, full Brand Library, governed agents, and cross-brand performance intelligence.",
      stats: [
        { label: "users", value: "20" },
        { label: "profiles", value: "25" },
        { label: "brands", value: "5" },
        { label: "history", value: "24mo" },
      ],
      sectionLabel: "EVERYTHING IN GROWTH, PLUS",
      features: [
        "5 AI agents — advanced multi-brand",
        "Advanced multi-stage approvals",
        "Multi-key approval + SoD enforcement",
        "Full Brand Library — standards & rules",
        "Crisis Console (standard activation)",
        "Advanced evidence packaging",
        "Cross-brand Analytics & ROI",
        "Named Customer Success Manager",
        "Quarterly governance review",
      ],
      excluded: [],
      cta: "Book strategy call",
      ctaIcon: "",
      ctaStyle: "solid",
      highlight: true,
      recommended: true,
      footerNote:
        "Best option for multi-brand teams requiring enterprise-validated governance.",
    },
    {
      tag: "REQUIREMENT-BASED",
      name: "Vertex Corporate",
      price: "Custom",
      billingNote: "Annual multi-year contract",
      desc: "Deploy across corporate brands, regulated workflows, advanced security, evidence-grade auditability, and custom governance architecture.",
      stats: [
        { label: "users", value: "Custom" },
        { label: "profiles", value: "Custom" },
        { label: "brands", value: "Custom" },
      ],
      sectionLabel: "EVERYTHING IN SCALE, PLUS",
      features: [
        "Three-key approval protocol",
        "Evidence Vault + legal hold",
        "Chain-of-custody + watermarked exports",
        "Custom AI governance configuration",
        "Crisis Console — full dual-activation",
        "SSO/SAML + SCIM provisioning",
        "DPA + security whitepaper",
        "Named AE + TAM + agreed SLA",
      ],
      excluded: [],
      cta: "Request corporate brief",
      ctaIcon: "file",
      ctaStyle: "ghost-cyan",
      highlight: false,
      recommended: false,
      footerNote:
        "Security and legal review required. SOC2 subject to approval.",
    },
  ];

  const Check = () => (
    <svg
      width="8"
      height="8"
      viewBox="0 0 10 8"
      fill="none"
      className="flex-shrink-0"
    >
      <path
        d="M1 4l3 3 5-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <section className="bg-[#080812] py-24 px-6" id="pricing">
      <div className="max-w-7xl mx-auto text-center mb-14">
        <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
          — Pricing
        </p>
        <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
          Start with proof. Scale with confidence.
        </h2>
        <p className="text-white/50 max-w-xl mx-auto mb-8">
          Your deployment team has built us a good base security. Free to start,
          no credit card required.
        </p>
        <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-2 py-1.5">
          <button className="text-sm text-white/40 px-4 py-1.5 rounded-full transition-all">
            Monthly
          </button>
          <button className="text-sm font-semibold text-black bg-white px-4 py-1.5 rounded-full transition-all">
            Annual
          </button>
          <span className="text-xs font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-3 py-1 rounded-full">
            Save up to 30%
          </span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto grid lg:grid-cols-4 gap-5 items-start">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`rounded-2xl p-6 border flex flex-col relative ${
              p.highlight
                ? "border-cyan-400/50 shadow-[0_0_40px_rgba(0,200,240,0.12)]"
                : "border-white/10"
            }`}
            style={
              p.highlight
                ? {
                    background:
                      "linear-gradient(160deg,#0d1a2e 0%,#080d1a 100%)",
                  }
                : { background: "rgba(255,255,255,0.03)" }
            }
          >
            {p.recommended && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black tracking-widest uppercase text-black bg-cyan-400 px-4 py-1 rounded-full whitespace-nowrap">
                Recommended
              </span>
            )}
            {/* Tag */}
            <p
              className="text-[10px] font-bold tracking-widest uppercase mb-3"
              style={{
                color: p.highlight ? "#00c8f0" : "rgba(255,255,255,0.35)",
              }}
            >
              {p.tag}
            </p>
            {/* Name */}
            <h3 className="text-white font-black text-xl mb-2">{p.name}</h3>
            {/* Price */}
            <div className="flex items-end gap-1 mb-1">
              {p.price !== "Custom" && (
                <span className="text-white/50 text-sm leading-none mb-1">
                  $
                </span>
              )}
              <span className="text-4xl font-black text-white leading-none">
                {p.price === "Custom" ? "Custom" : p.price.replace("$", "")}
              </span>
              {p.price !== "Custom" && (
                <span className="text-white/40 text-xs mb-1">/mo</span>
              )}
            </div>
            <p className="text-white/30 text-[10px] mb-4">{p.billingNote}</p>
            {/* Desc */}
            <p className="text-white/50 text-xs leading-relaxed mb-5 pb-5 border-b border-white/10">
              {p.desc}
            </p>
            {/* CTA */}
            <Link
              href="/signup"
              className={`text-center font-bold py-2.5 rounded-xl text-xs transition-all mb-5 flex items-center justify-center gap-2 ${
                p.ctaStyle === "solid"
                  ? "bg-cyan-400 hover:bg-cyan-300 text-black"
                  : p.ctaStyle === "ghost-cyan"
                    ? "border border-cyan-400/60 hover:border-cyan-400 text-cyan-400 hover:bg-cyan-400/5"
                    : "border border-white/20 hover:border-white/40 text-white hover:bg-white/5"
              }`}
            >
              {p.ctaIcon === "play" && <Play className="w-3 h-3" />}
              {p.ctaIcon === "clock" && <Clock className="w-3 h-3" />}
              {p.ctaIcon === "file" && <FileText className="w-3 h-3" />}
              {p.cta}
            </Link>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-5 pb-5 border-b border-white/10">
              {p.stats.map((s) => (
                <div key={s.label}>
                  <p className="text-white font-bold text-sm">{s.value}</p>
                  <p className="text-white/30 text-[10px]">{s.label}</p>
                </div>
              ))}
            </div>
            {/* Included section */}
            <p className="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-3">
              {p.sectionLabel}
            </p>
            <ul className="space-y-2 mb-4">
              {p.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-white/70 text-xs"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: "rgba(0,200,240,0.15)",
                      color: "#00c8f0",
                    }}
                  >
                    <Check />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            {/* Not included */}
            {p.excluded.length > 0 && (
              <>
                <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-3 mt-2">
                  NOT INCLUDED
                </p>
                <ul className="space-y-2 mb-4">
                  {p.excluded.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-white/30 text-xs"
                    >
                      <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-white/5 text-white/20">
                        <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
                          <path
                            d="M1 1l6 6M7 1L1 7"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {/* Footer note */}
            {p.footerNote && (
              <p className="text-white/20 text-[10px] leading-relaxed mt-auto pt-4 border-t border-white/5">
                {p.footerNote}
              </p>
            )}
          </div>
        ))}
      </div>
      {/* Compare all plans bar */}
      <div className="max-w-7xl mx-auto mt-12">
        <div className="flex items-center justify-center gap-3 py-5">
          <span className="text-white/40 text-sm">Need help choosing?</span>
          <a
            href="#"
            className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            Compare all plans <span>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── Architecture ────────────────────────────────────────────────────────── */
function Architecture() {
  const layers = [
    {
      label: "STRATEGY",
      name: "LAYER 1 — STRATEGIC CONTROL",
      bg: "#eeeeff",
      labelColor: "#6366f1",
      nameColor: "#a5b4fc",
      components: [
        { title: "Chief Strategy Agent", desc: "Revenue & EBITDA alignment" },
        {
          title: "Business Context Engine",
          desc: "ERP, inventory, pricing, margin",
        },
        {
          title: "Commercial Priority Layer",
          desc: "Queueing & priority scheduling",
        },
      ],
    },
    {
      label: "EXECUTION",
      name: "LAYER 2 — EXECUTION INTELLIGENCE",
      bg: "#ede9fe",
      labelColor: "#7c3aed",
      nameColor: "#c4b5fd",
      components: [
        {
          title: "Creative Intelligence Lab",
          desc: "Platform-native content & copy",
        },
        { title: "Execution Agent", desc: "Deploy, pace, sequence campaigns" },
        { title: "Engagement Agent", desc: "Interactions & knowledge capture" },
        { title: "Channel Orchestrator", desc: "Cross-platform sequencing" },
      ],
    },
    {
      label: "FINANCIAL",
      name: "LAYER 3 — FINANCIAL & OPTIMIZATION",
      bg: "#ccfbf1",
      labelColor: "#0d9488",
      nameColor: "#5eead4",
      components: [
        { title: "Quant Ad Spend Agent", desc: "CPA / ROAS / marginal return" },
        { title: "Revenue Forensic Agent", desc: "Multi-touch attribution" },
        {
          title: "Growth Optimisation Agent",
          desc: "True winners, kill waste",
        },
        { title: "LTV Correlation Engine", desc: "Scale winners, LTV maps" },
      ],
    },
    {
      label: "GOVERNED",
      name: "LAYER 4 — GOVERNANCE & RISK",
      bg: "#ddd6fe",
      labelColor: "#5b21b6",
      nameColor: "#a78bfa",
      components: [
        { title: "Compliance Sentry", desc: "Brand + legal + sector rules" },
        { title: "Governance Engine", desc: "Confidence scoring + approvals" },
        { title: "Audit Log System", desc: "Full decision traceability" },
        {
          title: "Override & Intervention",
          desc: "Freeze/de-prioritise control",
        },
      ],
    },
    {
      label: "SIMULATE",
      name: "LAYER 5 — SIMULATION",
      bg: "#d1fae5",
      labelColor: "#059669",
      nameColor: "#6ee7b7",
      components: [
        {
          title: "Synthetic Audience Engine",
          desc: "Predict response before spend",
        },
        {
          title: "Creative Scenario Modelling",
          desc: "Test before budget is committed",
        },
        { title: "Pre-Spend Waste Reduction", desc: "Eliminate cost upstream" },
      ],
    },
  ];

  return (
    <section className="py-24 px-6" style={{ background: "#f8f8fc" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-3">
            — Agentic Intelligence Architecture
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            A layered system, not a collection of AI helpers
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
            Five intelligence layers operating in concert — each purpose-built,
            each governed, each working as a closed loop that connects creative,
            channel, spend, and revenue in real time.
          </p>
        </div>
        <div className="space-y-3">
          {layers.map((layer, li) => (
            <div key={layer.label} className="flex items-stretch gap-4">
              {/* Vertical label — outside the card */}
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                <span
                  className="text-[9px] font-black tracking-widest uppercase whitespace-nowrap"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    color: layer.labelColor,
                  }}
                >
                  {layer.label}
                </span>
              </div>
              {/* Card */}
              <div
                className="flex-1 rounded-2xl px-5 py-4"
                style={{ background: layer.bg }}
              >
                <p
                  className="text-[10px] font-bold tracking-widest uppercase mb-3"
                  style={{ color: layer.nameColor }}
                >
                  {layer.name}
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {layer.components.map((c) => (
                    <div
                      key={c.title}
                      className="bg-white rounded-xl px-4 py-3 shadow-sm"
                    >
                      <p className="text-gray-900 font-bold text-xs mb-1">
                        {c.title}
                      </p>
                      <p className="text-gray-400 text-[11px] leading-snug">
                        {c.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pain Points ─────────────────────────────────────────────────────────── */
function PainPoints() {
  const chaos = [
    "Marketing spend distributed across platforms with no unified campaigns or decision system",
    "Campaigns continue running when close to cost-demand, margins are weak, or strategic priorities have shifted",
    "Teams optimise for engagement and impressions rather than contribution margin and profit",
    "Attribution remains inconsistent — finance teams distrust marketing-reported ROI",
    "Legal has flagged claimed topics, copyright exposure, or jurisdiction restriction concerns",
    "Leadership lacks a single operating view of what marketing is doing to revenue and cost efficiency",
  ];

  const governed = [
    "Capital allocation engine that moves budget to the highest-return opportunities automatically",
    "Business context integration — inventory, pricing, margin signal directly into campaign decisions",
    "Decisions governed by revenue, contribution margin, and marketing efficiency — not vanity metrics",
    "Multi-touch attribution reconciled to finance — ROI every CFO can defend to the board",
    "Pre-publication compliance review — brand-safe, legally defensible, sector-aware before every post",
    "Executive Command Centre — profit impact, actions taken, approvals pending, in one view",
  ];

  return (
    <section className="bg-[#080812] py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
            — The Executive Problem
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-5">
            What most businesses are actually struggling with
          </h2>
          <p className="text-white/50 text-sm max-w-xl mx-auto leading-relaxed">
            ZoikoVertex is designed to solve the board-level problem behind
            marketing: how to turn digital growth into a governed,
            capital-efficient, provable operating function.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {/* Left — chaos */}
          <div
            className="rounded-2xl p-7"
            style={{
              background: "rgba(251,191,36,0.04)",
              border: "1px solid rgba(251,191,36,0.12)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-white font-bold text-sm">
                Current state: fragmented chaos
              </p>
            </div>
            <ul className="space-y-4">
              {chaos.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-white/60 text-sm leading-relaxed"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400/60 flex-shrink-0 mt-2" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Right — governed */}
          <div
            className="rounded-2xl p-7"
            style={{
              background: "rgba(0,200,240,0.04)",
              border: "1px solid rgba(0,200,240,0.15)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(14,42,71,0.9)",
                  border: "1px solid rgba(0,200,240,0.2)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00c8f0"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-white font-bold text-sm">
                ZoikoVertex: governed operating system
              </p>
            </div>
            <ul className="space-y-4">
              {governed.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-white/70 text-sm leading-relaxed"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/70 flex-shrink-0 mt-2" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Agents Grid ─────────────────────────────────────────────────────────── */
function AgentsGrid() {
  const agents = [
    {
      layer: "Strategic Control Layer",
      name: "Chief Strategy Agent",
      desc: "ZoikoVertex continuously monitors EBITDA targets, budget envelopes, and business context to automatically shift capital allocation toward highest-return marketing activity.",
      link: "Revenue & ROI Management →",
      icon: Zap,
      iconColor: "#0891b2",
      iconBg: "#e0f7ff",
    },
    {
      layer: "Financial & Optimization Layer",
      name: "Quantitative Ad Spend Agent",
      desc: "Analyses CPA, ROAS, and marginal return across every channel in real time. Reallocates budget within policy boundaries — no manual intervention required.",
      link: "Full bid optimisation →",
      icon: BarChart2,
      iconColor: "#6366f1",
      iconBg: "#ede9fe",
    },
    {
      layer: "Financial & Optimization Layer",
      name: "Revenue Forensic Agent",
      desc: "Multi-touch attribution that reconciles marketing performance to actual revenue. Gives finance teams a single version of ROI truth — defensible, board-ready, and audit-traceable.",
      link: "Multi-touch attribution →",
      icon: Activity,
      iconColor: "#0891b2",
      iconBg: "#e0f7ff",
    },
    {
      layer: "Governance & Risk Layer",
      name: "Compliance Sentry",
      desc: "Reviews all outputs against brand rules, legal requirements, and sector-specific controls. Nothing publishes without passing compliance review. Pre-authorises agent actions.",
      link: "Pre-authorise agent actions →",
      icon: Shield,
      iconColor: "#7c3aed",
      iconBg: "#ede9fe",
    },
    {
      layer: "Simulation Layer",
      name: "Synthetic Audience Engine",
      desc: "Predicts likely audience response before spend is committed. Test creative and targeting hypotheses against synthetic audiences — eliminate waste before it happens.",
      link: "Test spend before committing →",
      icon: Users,
      iconColor: "#0d9488",
      iconBg: "#ccfbf1",
    },
    {
      layer: "Execution Intelligence Layer",
      name: "Growth Optimisation Agent",
      desc: "Identifies inefficiency across your channels and creatives. Scales what works. Kills what doesn't. Tied directly to contribution margin, not vanity metrics.",
      link: "Continuous output optimisation →",
      icon: Eye,
      iconColor: "#0891b2",
      iconBg: "#e0f7ff",
    },
  ];

  return (
    <section className="bg-white py-24 px-6" id="agents">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-3">
            — The Full Agent Operating System
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            Every agent. Every capability.
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
            ZoikoVertex agents work together, and every function of your
            business is coordinated for the first time, constituting a full
            Marketing Operating System.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((a) => (
            <div
              key={a.name}
              className="bg-white rounded-2xl p-7 flex flex-col shadow-sm hover:shadow-md transition-shadow"
              style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 flex-shrink-0"
                style={{ background: a.iconBg }}
              >
                <a.icon
                  size={22}
                  style={{ color: a.iconColor }}
                  strokeWidth={1.8}
                />
              </div>
              <p
                className="text-[10px] font-bold tracking-widest uppercase mb-2"
                style={{ color: a.iconColor }}
              >
                {a.layer}
              </p>
              <h3 className="font-black text-gray-900 mb-3 text-base">
                {a.name}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed flex-1">
                {a.desc}
              </p>
              <a
                href="#"
                className="mt-5 text-sm font-semibold transition-colors hover:opacity-70"
                style={{ color: a.iconColor }}
              >
                {a.link}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Accountability ──────────────────────────────────────────────────────── */
function Accountability() {
  const bullets = [
    "ROI per campaign, channel, and platform",
    "Cost per acquisition and contribution margin impact",
    "Lifetime value correlation and revenue path",
    "Wasted spend identified, recovered, and reported",
    "Budget reallocation effect on profit, not just spend",
    "Revenue path from touchpoint to a sale event",
  ];

  const metrics = [
    {
      label: "Campaign ROI",
      value: "2.3× → 3.7×",
      badge: "#dcfce7",
      text: "#15803d",
    },
    {
      label: "Cost per acquisition",
      value: "-26% reduction",
      badge: "#dcfce7",
      text: "#15803d",
    },
    {
      label: "Wasted spend recovered",
      value: "$6,400 / 48h",
      badge: "#ede9fe",
      text: "#6d28d9",
    },
    {
      label: "Budget reallocated",
      value: "$18,200 auto",
      badge: "#ede9fe",
      text: "#6d28d9",
    },
    {
      label: "Daily profit impact",
      value: "+14.0%",
      badge: "#dcfce7",
      text: "#15803d",
    },
    {
      label: "Attribution confidence",
      value: "Multi-touch ✓",
      badge: "#dcfce7",
      text: "#15803d",
    },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
        {/* Left */}
        <div>
          <p className="text-cyan-500 text-xs font-bold tracking-widest uppercase mb-4">
            — ROI Engine
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight mb-5">
            Audit-grade financial accountability
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            ZoikoVertex is designed to satisfy the core finance question: is
            marketing generating profit, or only activity? The ROI engine
            reconciles spend to contribution margin in a language CFOs and
            boards can verify.
          </p>
          <ul className="space-y-3 mb-10">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-3 text-gray-600 text-sm"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {b}
              </li>
            ))}
          </ul>
          {/* Callout */}
          <div
            className="rounded-xl p-5"
            style={{ background: "#f0fdfa", border: "1px solid #99f6e4" }}
          >
            <p className="text-sm text-teal-800 leading-relaxed">
              <span className="font-bold">Economic instability:</span>{" "}
              ZoikoVertex improves marketing efficiency by over 35%. It pays for
              itself multiple times over — making low-adoption financially
              irrational in performance-sensitive organisations.
            </p>
          </div>
        </div>

        {/* Right — dashboard card */}
        <div className="rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 pt-6 pb-0">
            <p
              className="font-bold text-gray-900 text-sm inline-flex items-center"
              style={{
                borderBottom: "0.8px solid #F1F5F9",
                paddingBottom: "14.8px",
                paddingRight: "193.403px",
              }}
            >
              Campaign Performance Dashboard
            </p>
          </div>
          <div>
            {metrics.map((m) => (
              <div key={m.label} className="px-4 py-2">
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: "#f8f8f8" }}
                >
                  <span className="text-gray-500 text-sm">{m.label}</span>
                  <span
                    className="text-xs font-bold px-3 py-1.5 rounded-full"
                    style={{ background: m.badge, color: m.text }}
                  >
                    {m.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Enterprise Banner ───────────────────────────────────────────────────── */
function EnterpriseBanner() {
  const features = [
    {
      title: "Advertising rule enforcement",
      desc: "Every agent action is checked against platform-specific advertising rules, brand tone standards, and sector compliance requirements before execution.",
      icon: Shield,
    },
    {
      title: "Jurisdiction-aware multi-market control",
      desc: "ZoikoVertex applies the correct regulatory framework per market — automatically. Different rules for different regions, enforced at the agent level.",
      icon: Globe,
    },
    {
      title: "Confidence scoring on every decision",
      desc: "Agents only act autonomously when confidence thresholds are met. Lower-confidence decisions are routed to human review before any action is taken.",
      icon: BarChart2,
    },
    {
      title: "Full audit logs and action histories",
      desc: "Every agent decision, approval, and execution is logged with full traceability. Exportable for legal review, finance audit, and board reporting.",
      icon: FileText,
    },
  ];

  return (
    <section className="bg-[#080812] py-24 px-6" id="enterprise">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-stretch">
        {/* Left */}
        <div className="space-y-5">
          {/* Photo */}
          <div className="rounded-2xl overflow-hidden">
            <Image
              src="/images/governance-photo.png"
              alt="Governance"
              width={600}
              height={420}
              className="w-full object-cover"
            />
          </div>
          {/* Governance Control Tower card */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: "#0d1228",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-white font-bold text-sm text-center mb-1">
              Governance Control Tower
            </p>
            <p className="text-white/30 text-[11px] text-center mb-6">
              Autonomous by default · Manual by exception
            </p>
            {/* Diagram */}
            <div
              className="relative flex items-center justify-center mb-6"
              style={{ height: 200 }}
            >
              {/* Connector lines */}
              {[0, 60, 120, 180, 240, 300].map((angle) => {
                const rad = ((angle - 90) * Math.PI) / 180;
                const x1 = 50,
                  y1 = 50;
                const x2 = 50 + 36 * Math.cos(rad);
                const y2 = 50 + 36 * Math.sin(rad);
                return (
                  <svg
                    key={angle}
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: "none" }}
                  >
                    <line
                      x1={`${x1}%`}
                      y1={`${y1}%`}
                      x2={`${x2}%`}
                      y2={`${y2}%`}
                      stroke="rgba(99,102,241,0.25)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                  </svg>
                );
              })}
              {/* Center node */}
              <div
                className="absolute z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center text-center"
                style={{
                  background: "linear-gradient(135deg,#1e3a5f,#0d2d4a)",
                  border: "2px solid rgba(0,200,240,0.4)",
                  boxShadow: "0 0 30px rgba(0,200,240,0.2)",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%,-50%)",
                }}
              >
                <span className="text-cyan-400 text-[10px] font-bold leading-tight">
                  Governed
                </span>
                <span className="text-white text-[10px] font-bold leading-tight">
                  Autonomy
                </span>
              </div>
              {/* Orbit nodes */}
              {[
                { label: "Confidence\nScoring", angle: 0 },
                { label: "Policy\nThresholds", angle: 60 },
                { label: "Override\nControls", angle: 120 },
                { label: "Sector\nRules", angle: 180 },
                { label: "Audit\nLogs", angle: 240 },
                { label: "Approval\nWorkflows", angle: 300 },
              ].map((n) => {
                const rad = ((n.angle - 90) * Math.PI) / 180;
                const r = 38;
                const x = 50 + r * Math.cos(rad);
                const y = 50 + r * Math.sin(rad);
                return (
                  <div
                    key={n.label}
                    className="absolute flex flex-col items-center text-center"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%,-50%)",
                    }}
                  >
                    <div
                      className="rounded-xl px-2 py-1.5"
                      style={{
                        background: "rgba(99,102,241,0.15)",
                        border: "1px solid rgba(99,102,241,0.3)",
                      }}
                    >
                      {n.label.split("\n").map((l, i) => (
                        <p
                          key={i}
                          className="text-[9px] font-semibold text-indigo-300 leading-tight whitespace-nowrap"
                        >
                          {l}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Phase cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                {
                  phase: "Phase 01",
                  mode: "Insight Mode",
                  sub: "No autonomy",
                  color: "#334155",
                },
                {
                  phase: "Phase 02",
                  mode: "Assistant Mode",
                  sub: "Human approval",
                  color: "#4338ca",
                },
                {
                  phase: "Phase 03",
                  mode: "Autonomous Mode",
                  sub: "Full governed exec",
                  color: "#0d9488",
                },
              ].map((p) => (
                <div
                  key={p.phase}
                  className="rounded-xl px-3 py-2.5 text-center"
                  style={{
                    background: p.color + "33",
                    border: `1px solid ${p.color}66`,
                  }}
                >
                  <p
                    className="text-[9px] font-bold uppercase tracking-wide mb-0.5"
                    style={{
                      color:
                        p.color === "#334155"
                          ? "#94a3b8"
                          : p.color === "#4338ca"
                            ? "#818cf8"
                            : "#2dd4bf",
                    }}
                  >
                    {p.phase}
                  </p>
                  <p className="text-white text-[10px] font-bold leading-tight">
                    {p.mode}
                  </p>
                  <p className="text-white/40 text-[9px]">{p.sub}</p>
                </div>
              ))}
            </div>
            {/* Compliance badges */}
            <div className="flex flex-wrap gap-2 justify-center">
              {["GDPR Safe", "FCA Aligned", "HIPAA Aware", "SEC Compliant"].map(
                (b) => (
                  <span
                    key={b}
                    className="text-[9px] font-bold text-white/40 px-2.5 py-1 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {b}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <div>
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
            — Governance & Compliance
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            Full autonomy without governance is unacceptable in enterprise
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-10">
            ZoikoVertex is designed for autonomous-but-governed controlled,
            audit-ready outcomes. Enterprise-safe autonomy — the governance
            rails, but not the brake.
          </p>
          <div className="space-y-7">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-xl p-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(99,102,241,0.25)",
                  }}
                >
                  <f.icon
                    size={16}
                    style={{ color: "#818cf8" }}
                    strokeWidth={1.8}
                  />
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">{f.title}</p>
                  <p className="text-white/50 text-xs leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EnterpriseFeatures() {
  return null;
}

/* ── Stack Comparison ────────────────────────────────────────────────────── */
function Industries() {
  const tabs = [
    {
      label: "Enterprise Retail",
      title: "Governed growth from SKU to sale",
      desc: "ZoikoVertex integrates inventory, pricing, and margin data so campaigns automatically redirect spend away from low-stock or low-margin SKUs toward highest-return product categories in real time.",
      cta: "See Enterprise Retail Demo →",
      points: [
        "Automatically pauses promotions when stock falls below defined thresholds",
        "Budget follows margin, not just volume — higher-margin SKUs get prioritised spend",
        "System detects seasonal windows and triggers campaigns without manual scheduling",
        "Every campaign traced to contribution margin, not just revenue",
      ],
    },
    {
      label: "FinTech",
      title: "Compliant marketing in regulated markets",
      desc: "ZoikoVertex applies FCA, SEC, and jurisdiction-specific compliance rules at the agent level — every piece of content reviewed before publication, every decision logged.",
      cta: "See FinTech Demo →",
      points: [
        "Pre-publication compliance review against FCA and sector-specific advertising rules",
        "Full audit trail for every campaign action — board and regulator ready",
        "Jurisdiction-aware targeting — different rules enforced per market automatically",
        "Evidence vault for legal review and dispute resolution",
      ],
    },
    {
      label: "Healthcare",
      title: "Safe, evidence-based marketing at scale",
      desc: "ZoikoVertex enforces medical advertising standards, claim verification, and patient safety rules across every agent action — zero tolerance for non-compliant content.",
      cta: "See Healthcare Demo →",
      points: [
        "Claim verification against approved medical language before every publication",
        "HIPAA-aware data handling and audience targeting protocols",
        "Multi-stage approval for clinical and regulatory sign-off",
        "Full traceability from campaign intent to patient-facing output",
      ],
    },
    {
      label: "B2B SaaS",
      title: "Pipeline-aligned demand generation",
      desc: "ZoikoVertex connects marketing spend to pipeline stages, ICP fit, and revenue contribution — ensuring budget flows to the segments and channels that close.",
      cta: "See B2B SaaS Demo →",
      points: [
        "Budget allocation tied to pipeline stage conversion rates, not impressions",
        "ICP scoring integrated into campaign targeting decisions",
        "ABM coordination across content, paid, and outbound channels",
        "Revenue attribution back to specific marketing touchpoints and spend decisions",
      ],
    },
    {
      label: "Logistics",
      title: "Demand-driven marketing for complex networks",
      desc: "ZoikoVertex adapts campaign spend in real time to route demand toward available capacity, seasonal peaks, and high-margin service lines.",
      cta: "See Logistics Demo →",
      points: [
        "Campaigns automatically redirect toward high-capacity lanes and service types",
        "Seasonal demand signals trigger campaign activation without manual input",
        "Margin-aware spend — budget prioritised by contribution, not volume",
        "Full audit trail for marketing decisions across complex multi-region networks",
      ],
    },
    {
      label: "Telecom",
      title: "Churn reduction and ARPU optimisation",
      desc: "ZoikoVertex identifies at-risk segments, coordinates retention campaigns, and optimises upsell spend across channels — all governed and tracked to revenue impact.",
      cta: "See Telecom Demo →",
      points: [
        "Predictive churn signals trigger governed retention campaigns automatically",
        "Upsell and cross-sell spend prioritised by ARPU contribution and LTV",
        "Multi-channel coordination across digital, in-app, and direct channels",
        "Every retention action logged and traceable to revenue outcome",
      ],
    },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-4">
            — Industries & Use Cases
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            Built for enterprise realities
          </h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">
            ZoikoVertex is not a generic AI tool. It is configured for the
            commercial and regulatory realities of specific industries — with
            vertical-specific logic built in.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${i === 0 ? "bg-indigo-100 text-indigo-700 border border-indigo-200" : "text-gray-500 hover:text-gray-800"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content — show first tab */}
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">
              {tabs[0].title}
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              {tabs[0].desc}
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              {tabs[0].cta}
            </Link>
          </div>
          <div className="space-y-5">
            {tabs[0].points.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    border: "1px solid rgba(99,102,241,0.2)",
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 12 10" fill="none">
                    <path
                      d="M1 5l3.5 3.5L11 1"
                      stroke="#6366f1"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StackComparison() {
  const rows = [
    { feature: "Autonomous capital allocation", us: true, them: false },
    { feature: "Inventory & margin integration", us: true, them: false },
    { feature: "Multi-touch ROI attribution", us: true, them: "Partial" },
    { feature: "Pre-publication compliance review", us: true, them: false },
    { feature: "Governed autonomy with audit logs", us: true, them: false },
    { feature: "Executive profit-impact dashboard", us: true, them: false },
    { feature: "Synthetic audience simulation", us: true, them: false },
    {
      feature: "Business context integration (ERP/inventory)",
      us: true,
      them: false,
    },
    { feature: "Phased autonomy rollout model", us: true, them: false },
    { feature: "Contribution margin reporting", us: true, them: false },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-4">
            — Competitive Advantage
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            Why current stacks fall short
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Tools execute tasks. ZoikoVertex manages outcomes. The difference is
            measurable in capital efficiency and executive confidence.
          </p>
        </div>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
        >
          {/* Header */}
          <div
            className="grid grid-cols-3 px-8 py-4 border-b"
            style={{ borderColor: "#E2E8F0" }}
          >
            <span className="text-xs font-bold tracking-widest uppercase text-gray-400">
              Capability
            </span>
            <span
              className="text-xs font-bold tracking-widest uppercase text-center"
              style={{ color: "#6366f1" }}
            >
              ZoikoVertex
            </span>
            <span className="text-xs font-bold tracking-widest uppercase text-center text-gray-400">
              Traditional Platforms
            </span>
          </div>
          {/* Rows */}
          {rows.map((r, i) => (
            <div
              key={r.feature}
              className={`grid grid-cols-3 px-8 py-4 ${i < rows.length - 1 ? "border-b" : ""}`}
              style={{ borderColor: "#E2E8F0" }}
            >
              <span className="text-gray-500 text-sm">{r.feature}</span>
              <span className="text-center">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="inline-block"
                >
                  <path
                    d="M2 8l4.5 4.5L14 3"
                    stroke="#4f46e5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-center">
                {r.them === false ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="inline-block"
                  >
                    <path
                      d="M1 1l10 10M11 1L1 11"
                      stroke="#CBD5E1"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "#f97316" }}
                  >
                    {r.them}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Trust Model ─────────────────────────────────────────────────────────── */
function TrustModel() {
  const phases = [
    {
      num: "01",
      label: "PHASE 01",
      title: "Insight Mode",
      desc: "Recommendations only — no autonomous execution. See exactly what ZoikoVertex would do with your data. Insights appear within 24 hours of data connection.",
      badge: "Day 1–7",
      timeline: "Insights in 24 hours",
    },
    {
      num: "02",
      label: "PHASE 02",
      title: "Assisted Mode",
      desc: "Human approval required before every action. The system proposes. You decide. Optimization signals and performance improvements appear within 72 hours.",
      badge: "Week 2–4",
      timeline: "Optimization in 72 hours",
    },
    {
      num: "03",
      label: "PHASE 03",
      title: "Autonomous Mode",
      desc: "Full governed execution within your defined policy thresholds. Confidence scoring, approval workflows, and override pathways always available. ROI evidence within 30 days.",
      badge: "Month 2+",
      timeline: "Measurable ROI in 30 days",
    },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-4">
            — Safe Deployment Model
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            Governed autonomy, phased trust
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            A three-phase rollout that reduces adoption friction and lets your
            team build confidence before full agentic deployment. Insights in 24
            hours. ROI in 30 days.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {phases.map((p) => (
            <div
              key={p.num}
              className="rounded-2xl p-8 text-center flex flex-col"
              style={{ background: "#f8f9ff", border: "1px solid #e8eaf6" }}
            >
              {/* Large faded number */}
              <span
                className="text-8xl font-black leading-none mb-4"
                style={{ color: "rgba(99,102,241,0.12)" }}
              >
                {p.num}
              </span>
              {/* Phase label */}
              <p className="text-indigo-500 text-[10px] font-bold tracking-widest uppercase mb-2">
                {p.label}
              </p>
              {/* Title */}
              <h3 className="font-black text-gray-900 text-lg mb-3">
                {p.title}
              </h3>
              {/* Desc */}
              <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1">
                {p.desc}
              </p>
              {/* Time badge */}
              <div className="flex justify-center mb-4">
                <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full">
                  {p.badge}
                </span>
              </div>
              {/* Clock + timeline */}
              <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs">
                <Clock size={12} />
                {p.timeline}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Testimonials ────────────────────────────────────────────────────────── */
function Testimonials() {
  const quotes = [
    {
      quote:
        "For the first time, I can see exactly what marketing is doing to contribution margin — not just impressions and clicks. ZoikoVertex made marketing a real line item I can defend to the board.",
      name: "David Warwick",
      role: "CFO, Meridian Commerce Group",
      initials: "DW",
      color: "#6366f1",
    },
    {
      quote:
        "We operate in a regulated sector. The compliance controls and pre-publication review gave us the confidence to scale agentic execution at a pace our legal team could actually support.",
      name: "Simone Adler",
      role: "CMO, Orbis Financial",
      initials: "SA",
      color: "#7c3aed",
    },
    {
      quote:
        "The system identified a 31% CPA gap between channels and reallocated budget automatically. We saw the profit impact on a Monday morning dashboard. That's not marketing — that's infrastructure.",
      name: "Raj Krishnamurthy",
      role: "CEO, TerraScale Retail",
      initials: "RK",
      color: "#4f46e5",
    },
  ];

  const Stars = () => (
    <div className="flex gap-1 mb-5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );

  return (
    <section className="py-24 px-6" style={{ background: "#080d1a" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
            — Executive Validation
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-5">
            What enterprise leaders say
          </h2>
          <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
            From CFOs who needed financial accountability to CMOs who needed
            scale — ZoikoVertex changes how leadership thinks about marketing.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {quotes.map((q, i) => (
            <div
              key={i}
              className="rounded-2xl p-7 flex flex-col"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Stars />
              <p className="text-white/70 text-sm leading-relaxed mb-8 flex-1 text-center">
                &ldquo;{q.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-black"
                  style={{ background: q.color }}
                >
                  {q.initials}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{q.name}</p>
                  <p className="text-white/40 text-xs">{q.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Footer CTA ──────────────────────────────────────────────────────────── */
function FooterCTA() {
  return (
    <section
      className="py-28 px-6 text-center"
      style={{ background: "linear-gradient(160deg,#0d1a35 0%,#080d1a 100%)" }}
    >
      <div className="max-w-3xl mx-auto">
        <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-6">
          — Ready to Deploy
        </p>
        <h2 className="text-4xl lg:text-6xl font-black text-white leading-tight mb-6">
          Marketing should operate
          <br />
          as measurable infrastructure
        </h2>
        <p className="text-white/50 text-sm max-w-xl mx-auto leading-relaxed mb-10">
          ZoikoVertex improves efficiency by over 35%. It pays for itself
          multiple times over. Non-adoption is financially irrational in
          performance-sensitive organisations.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          <Link
            href="/signup"
            className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-8 py-3.5 rounded-xl transition-all text-sm flex items-center gap-2"
          >
            Deploy DMOS Environment →
          </Link>
          <Link
            href="/signup"
            className="border border-white/20 hover:border-white/40 text-white font-semibold px-8 py-3.5 rounded-xl transition-all hover:bg-white/5 text-sm"
          >
            Request Enterprise Demo
          </Link>
        </div>
        <p className="text-white/20 text-xs">
          Deploy in 72 hours. No code required. Powered by governed agents.
        </p>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
function Footer() {
  const cols = [
    {
      heading: "Product",
      links: [
        "Platform Overview",
        "Agentic Architecture",
        "Executive Command Center",
        "AI Workflow Orchestration",
        "Approval Workflows",
        "ROI Engine",
        "Integrations",
      ],
    },
    {
      heading: "Solutions",
      links: [
        "Enterprise Retail",
        "FinTech",
        "Healthcare",
        "B2B SaaS",
        "Logistics",
        "Telecom",
        "Agencies & Multi-Brand Teams",
      ],
    },
    {
      heading: "Resources",
      links: [
        "Resource Center",
        "Use Cases",
        "Demo Library",
        "ROI & Governance Audit",
        "Buyer Guides",
        "Product Updates",
        "FAQs",
      ],
    },
    {
      heading: "Company",
      links: [
        "About ZoikoVertex",
        "About Zoiko Group",
        "Leadership",
        "Vision & Mission",
        "Press & Media",
        "Competitor Benchmark",
        "Careers",
      ],
    },
    {
      heading: "Trust & Legal",
      links: [
        "Security",
        "Privacy Policy",
        "Terms of Service",
        "Cookie Preferences",
        "Compliance & Governance",
        "Responsible AI",
        "Auditability",
        "Data Processing Addendum",
      ],
    },
  ];

  const badges = [
    "SOC 2 TYPE II",
    "ISO 27001",
    "GDPR",
    "RESPONSIBLE AI",
    "AUDIT-READY",
  ];

  return (
    <footer style={{ background: "#080f1e" }} className="px-6 pt-16 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Top row */}
        <div className="grid lg:grid-cols-6 gap-10 pb-14 border-b border-white/5">
          {/* Brand col */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-1.5 mb-4">
              <Image
                src="/images/logo-dark.jpeg"
                alt="ZoikoVertex"
                width={28}
                height={28}
                className="rounded-full"
              />
              <span className="text-white font-black text-base tracking-tight">
                ZOIKO<span className="text-cyan-400">VERTEX</span>
                <sup className="text-[9px] text-white/30 ml-0.5">™</sup>
              </span>
            </div>
            <p className="text-white/40 text-xs leading-relaxed mb-6">
              <span className="text-white/70 font-semibold">
                The governed autonomous digital marketing operating system
              </span>{" "}
              where marketing becomes measurable infrastructure.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <span
                  key={b}
                  className="text-[8px] font-bold tracking-widest text-white/30 px-2 py-1 rounded-full"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  • {b}
                </span>
              ))}
            </div>
          </div>
          {/* Nav cols */}
          {cols.map((col) => (
            <div key={col.heading}>
              <p className="text-white text-[10px] font-black tracking-widest uppercase mb-4">
                {col.heading}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-white/70 text-xs font-medium hover:text-white transition-colors"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact & locations */}
        <div className="grid lg:grid-cols-4 gap-10 py-10 border-b border-white/5">
          <div>
            <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-4">
              Contact & Locations
            </p>
            <ul className="space-y-2.5">
              {["Contact Sales", "Support", "Partnerships"].map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-white/40 text-xs hover:text-white/70 transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p
              className="text-[9px] font-bold tracking-widest uppercase mb-3 flex items-center gap-1.5"
              style={{ color: "#00c8f0" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />{" "}
              Headquarters
            </p>
            <p className="text-white/40 text-xs leading-relaxed">
              1401 21st Street, Suite R,
              <br />
              Sacramento, CA 95811, USA
            </p>
          </div>
          <div>
            <p
              className="text-[9px] font-bold tracking-widest uppercase mb-3 flex items-center gap-1.5"
              style={{ color: "#00c8f0" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> EU
              Headquarters
            </p>
            <p className="text-white/40 text-xs leading-relaxed">
              67–69 Great Portland Street,
              <br />
              5th Floor, London W1W 5PF, UK
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 text-white/20 text-xs">
          <p>
            2026 ZoikoVertex | All rights reserved | ZoikoVertex is a platform
            operated by Zoiko Tech Inc.
          </p>
          <div className="flex gap-6">
            {[
              "Privacy Policy",
              "Terms of Service",
              "Cookie Preferences",
              "Security",
            ].map((l) => (
              <a
                key={l}
                href="#"
                className="hover:text-white/50 transition-colors"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <TrustedBy />
      <Stats />
      <Pricing />
      <FeatureBlock />
      <Architecture />
      <PainPoints />
      <AgentsGrid />
      <Accountability />
      <EnterpriseBanner />
      <EnterpriseFeatures />
      <Industries />
      <StackComparison />
      <TrustModel />
      <Testimonials />
      <FooterCTA />
      <Footer />
    </main>
  );
}
