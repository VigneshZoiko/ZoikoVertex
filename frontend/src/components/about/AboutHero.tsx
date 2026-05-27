"use client";

import { useEffect, useRef, useState } from "react";

export default function AboutHero() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#080812] min-h-screen pt-40 pb-30 px-6 overflow-hidden">
      <div
        ref={ref}
        className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center"
      >
        {/* LEFT — Image only */}
        <div
          className={`relative transition-all duration-700 ease-out ${
            visible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          <img
            src="/images/about-hero.webp"
            alt="About ZoikoVertex"
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>

        {/* RIGHT — Content */}
        <div
          className={`transition-all mb-[60] duration-700 ease-out ${
            visible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-[#6366F140] bg-[#6366F11F] rounded-full px-4 py-1.5 mb-7">
            <span className="text-[#A5B4FC] text-xs">✦</span>

            <span className="text-[#A5B4FC] text-xs font-semibold tracking-widest uppercase">
              About Us
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl lg:text-[48px] font-black text-white leading-tight mb-6">
            ZoikoVertex{" "}
            <span className="text-cyan-400">— Inovație</span>
            <br />
            în Execution Control
          </h1>

          {/* Description */}
          <p className="text-white/40 text-sm leading-[28px] max-w-md mb-10">
            With a governed execution layer deployed across Windows and Mac,
            ZoikoVertex ensures every digital marketing action is validated,
            authorized, attributed, and recorded — before it reaches the
            outside world.
          </p>

          {/* Email contact */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
              style={{
                background: "rgba(34,211,238,0.08)",
                borderColor: "rgba(34,211,238,0.15)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.5"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />

                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>

            <div>
              <p className="text-white/25 text-xs mb-0.5">
                For any enquiry
              </p>

              <a
                href="mailto:Support@zoikovertex.com"
                style={{ color: "#22d3ee" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color =
                    "#67e8f9")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color =
                    "#22d3ee")
                }
                className="text-sm font-semibold transition-colors duration-200"
              >
                Support@zoikovertex.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}