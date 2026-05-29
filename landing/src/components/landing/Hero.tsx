import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  Eye,
  Zap,
  CheckSquare,
  BarChart2,
  Shield,
  LayoutGrid,
  BarChart,
  Users,
  Link2,
  Clock,
  FileText,
  Globe,
} from "lucide-react";

export default function Hero() {
  return (
    <section className="bg-[#080812] pt-10 pb-10 px-4 lg:px-6 overflow-x-hidden">
      <div
        className="mx-auto w-full grid gap-4 items-center lg:grid-cols-2 overflow-hidden"
        style={{ minHeight: 820, width: "100%", maxWidth: "100vw" }}
      >
        <div className="w-full max-w-[584.34px]" style={{ minHeight: 608.01 }}>
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

        <div className="relative hidden lg:flex items-center justify-center w-full">
          <div className="relative w-full max-w-[850px] h-auto rounded-2xl overflow-hidden">
            <Image
              src="/images/Vertex img.png"
              alt="ZoikoVertex dashboard"
              width={850}
              height={531}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
