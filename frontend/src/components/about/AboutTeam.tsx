"use client";
import { useEffect, useRef, useState } from "react";

const TEAM = [
  {
    name: "Lennox G. McLeod",
    role: "Founder & Executive Chairman",
    tag: "Zoiko Group Inc.",
    tagColor: "#22d3ee",
    tagBg: "#00C8F0",
    tagBorder: "#00C8F033",
    image: "/images/team/lennox.png",
    initials: null,
    avatarColor: null,
  },
  {
    name: null,
    role: "Global Commercial Director",
    roleDetail: "Commercial Strategy",
    tag: "Enterprise Growth",
    tagColor: "#00C8F0",
    tagBg: "#00C8F01F",
    tagBorder: "#00C8F033",
    image: null,
    initials: "GC",
    avatarColor: "#0d4a3a",
    avatarText: "#22d3ee",
  },
  {
    name: null,
    role: "Global Marketing Director",
    roleDetail: "Brand & Marketing",
    tag: "Go-to-Market",
    tagColor: "#00C8F0",
    tagBg: "#00C8F01F",
    tagBorder: "#00C8F033",
    image: null,
    initials: "GM",
    avatarColor: "#0d3a4a",
    avatarText: "#22d3ee",
  },
  {
    name: null,
    role: "Enterprise Architect",
    roleDetail: "Platform Architecture",
    tag: "GEI Design",
    tagColor: "#00C8F0",
    tagBg: "#00C8F01F",
    tagBorder: "#00C8F033",
    image: null,
    initials: "EA",
    avatarColor: "#3a2e0d",
    avatarText: "#facc15",
  },
  {
    name: null,
    role: "Chief of Compliance",
    roleDetail: "Governance & Legal",
    tag: "Regulatory Strategy",
    tagColor: "#00C8F0",
    tagBg: "#00C8F01F",
    tagBorder: "#00C8F033",
    image: null,
    initials: "CS",
    avatarColor: "#3a0d1a",
    avatarText: "#fb7185",
  },
];

export default function AboutTeam() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#080812] py-20 px-6">
      <div ref={ref} className="max-w-[1200] mx-auto">

        {/* Header — 2 col */}
        <div
          className={`grid lg:grid-cols-2 gap-10 items-start mb-14 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 border border-[#10B98140] bg-[#10B9811F] rounded-full px-3 py-1 mb-5">
              <span className="text-[#6EE7B7] text-xs">✦</span>
              <span className="text-[#6EE7B7] text-xs font-semibold tracking-widest uppercase">
                Our Team
              </span>
            </div>
            <h2 className="text-4xl font-black text-white leading-tight">
              The ZoikoVertex<br />Leadership Team
            </h2>
          </div>

          {/* Right */}
          <p className="text-white/40 text-sm leading-relaxed">
            ZoikoVertex is built by a team of enterprise infrastructure engineers,
            compliance specialists, AI governance architects, and commercial
            operators — united by the belief that uncontrolled execution is a structural
            risk, not an operational inconvenience.
          </p>
        </div>

        {/* Team cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {TEAM.map((member, i) => (
            <div
              key={i}
              className={`border border-white/8 rounded-2xl overflow-hidden bg-[#0E1B35]
                hover:border-white/15 hover:-translate-y-1 transition-all duration-400 ease-out cursor-default
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${150 + i * 100}ms` }}
            >
              {/* Avatar / Image area */}
              <div
                className="w-full flex items-center justify-center"
                style={{
                  background: member.image ? "transparent" : `${member.avatarColor}60`,
                  minHeight: "140px",
                }}
              >
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name || ""}
                    className="w-full h-43 object-cover object-top"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    {/* Circle avatar */}
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black mb-2"
                     style={{
  background: member.avatarColor || "#0f172a",
  color: member.avatarText,
  border: `2px solid ${member.avatarText}30`,
}}
                    >
                      {member.initials}
                    </div>
                    {/* Silhouette shape */}
                    <div
                      className="w-24 h-8 rounded-t-full mt-1 opacity-30"
                      style={{
  background: member.avatarColor || "transparent",
}}
                    />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col gap-2">
                {member.name && (
                  <p className="text-white text-sm font-black leading-snug">
                    {member.name}
                  </p>
                )}
                <p className="text-white font-black text-sm leading-snug">
                  {member.role}
                </p>
                {member.roleDetail && (
                  <p className="text-white/30 text-xs">
                    {member.roleDetail}
                  </p>
                )}
                {member.name === "Lennox G. McLeod" && (
                  <p className="text-white/30 text-xs">
                    Founder & Executive Chairman
                  </p>
                )}

                {/* Tag */}
                <span
                  className="self-start text-xs px-2.5 py-1 rounded-[50] border font-medium mt-1"
                  style={{
                    color: member.tagColor,
                    background: member.tagBg,
                    borderColor: member.tagBorder,
                  }}
                >
                  {member.tag}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}