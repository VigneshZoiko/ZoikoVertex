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
    <section className="bg-[#080812] pt-32 pb-12 px-6 xl:px-12 overflow-hidden">
      <div className="mx-auto max-w-[1280px] grid items-center gap-10 lg:grid-cols-[42%_58%]">

        {/* Left — text */}
        <div className="flex flex-col">
          <div className="inline-flex w-fit items-center gap-2.5 border border-cyan-400/40 bg-cyan-400/5 text-cyan-400 text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
            Governed Agentic Marketing Operating System
          </div>

          <h1 className="text-5xl lg:text-[3.6rem] xl:text-[4rem] font-black text-white leading-[1.05] tracking-tight mb-6">
            Run Marketing
            <br />
            with{" "}
            <span className="text-cyan-400">
              Financial
              <br />
              Control
            </span>
          </h1>

          <p className="text-white/60 text-base leading-relaxed mb-8 max-w-[480px]">
            ZoikoVertex helps teams{" "}
            <span className="text-white/80">plan, execute, govern, and optimize</span>{" "}
            digital marketing with AI agent workflows, approval controls, ROI
            evidence, and audit-ready operating discipline.
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href="/request-demo"
              className="bg-cyan-400 hover:bg-cyan-300 text-black font-semibold px-7 py-3.5 rounded-full transition-all flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Request Demo
            </Link>
            <a
              href="#pricing"
              className="bg-white/5 border border-white/15 hover:bg-white/10 text-white font-semibold px-7 py-3.5 rounded-full transition-all flex items-center gap-2"
            >
              Find Your Ideal Plan →
            </a>
          </div>

          <p className="text-white/30 text-xs italic mb-4">
            Built for governed execution, measurable ROI workflows, and enterprise-grade oversight.
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              { label: "AI-agent workflows",          icon: Zap },
              { label: "Approval-controlled execution", icon: CheckSquare },
              { label: "Audit-ready governance",      icon: Shield },
              { label: "ROI evidence",                icon: BarChart2 },
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

        {/* Right — dashboard mockup (image already has browser chrome built in) */}
        <div className="hidden lg:flex items-center justify-end w-full">
          <Image
            src="/images/Vertex img.png"
            alt="ZoikoVertex dashboard"
            width={1100}
            height={688}
            className="w-full h-auto block"
            priority
          />
        </div>

      </div>
    </section>
  );
}
