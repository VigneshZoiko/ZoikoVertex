"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export default function PlatformSection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#080812] min-h-screen py-24 px-6 pt-16">
      <div
        ref={ref}
        className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center"
      >

        {/* Left Content */}
        <div
          className={`transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
            <span className="text-cyan-400">✦</span> PLATFORM OVERVIEW
          </p>

          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6">
            The governed execution platform for modern social,{" "}
            <span className="text-cyan-400">
              brand, and marketing operations.
            </span>
          </h1>

          <p className="text-white/50 text-sm leading-relaxed max-w-md">
            ZoikoVertex brings AI agents, content workflows, approvals,
            engagement, brand governance, audit evidence, and revenue
            intelligence into one policy-bound operating layer.
          </p>
        </div>

        {/* Right Image */}
        <div
          className={`relative transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "300ms" }}
        >

          <div className="absolute -inset-2 bg-cyan-500/10 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="group relative overflow-hidden rounded-xl">
          
            <div className="absolute inset-0 bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl z-10" />

            <Image
              src="/images/platform/platform.webp"
              alt="Platform Dashboard"
              width={1200}
              height={700}
              className="rounded-xl w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />

            <div className="absolute inset-0 rounded-xl border border-white/5 group-hover:border-cyan-400/20 transition-colors duration-300" />
          </div>
        </div>

      </div>
    </section>
  );
}