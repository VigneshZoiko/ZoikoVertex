"use client";
import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 5, suffix: "", label: "AI AGENTS", color: "#20E7F2" },
  { value: 19, suffix: "+", label: "DEFAULT ROLES", color: "#22C55E" },
  { value: 100, suffix: "%", label: "APPROVAL-GATED", color: "#F59E0B" },
  { value: 4, suffix: "", label: "PLANS AVAILABLE", color: "#8B5CF6" },
  { value: null, suffix: "∞", label: "AUDIT EVENTS LOGGED", color: "#20E7F2" },
];

function useCounter(target: number, duration: number, start: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

function StatItem({ stat, visible, index }: {
  stat: typeof STATS[0];
  visible: boolean;
  index: number;
}) {
  const count = useCounter(stat.value ?? 0, 1800, visible);

  return (
    <div
      className={`flex flex-col items-center gap-2 transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <span
        className="text-3xl lg:text-4xl font-black tabular-nums"
        style={{ color: stat.color }}
      >
        {stat.value === null ? stat.suffix : `${count}${stat.suffix}`}
      </span>
      <span className="text-[#FFFFFF42] text-xs font-bold tracking-widest uppercase">
        {stat.label}
      </span>
    </div>
  );
}

export default function SolutionStats() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#0C1422] border-t border-b border-white/5 py-8 px-6">
      <div
        ref={ref}
        className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-4"
      >
        {STATS.map((stat, i) => (
          <StatItem key={stat.label} stat={stat} visible={visible} index={i} />
        ))}
      </div>
    </section>
  );
}