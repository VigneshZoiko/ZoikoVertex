"use client";

import Image from "next/image";

const PLATFORMS = [
  {
    key: "vertex",
    featured: true,
    image: "/images/zoiko-group/platform-vertex.jpg",
    tag: "AI Marketing Operations",
    name: "ZoikoVertex",
    desc: "Governed AI marketing workflows, approval controls, brand governance, audit trails, and evidence records for enterprise teams.",
    badge: "Featured Platform",
  },
  {
    key: "force",
    image: "/images/zoiko-group/platform-force.jpg",
    tag: "Workforce Intelligence",
    name: "ZoikoForce",
  },
  {
    key: "comms",
    image: "/images/zoiko-group/platform-comms.jpg",
    tag: "Telecommunications",
    name: "ZoikoComms",
  },
  {
    key: "ops",
    image: "/images/zoiko-group/platform-ops.jpg",
    tag: "Digital Operations",
    name: "ZoikoOps",
  },
  {
    key: "data",
    image: "/images/zoiko-group/platform-data.jpg",
    tag: "Coming 2026",
    name: "ZoikoData",
  },
];

export default function ZoikoGroupPlatforms() {
  const [featured, force, comms, ops, data] = PLATFORMS;

  return (
    <section className="bg-[#080d1a] py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#20E7F2]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Platform Ecosystem</span>
        </div>
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-black leading-tight text-white mb-12 max-w-lg">
          Six platforms. One governing principle.
        </h2>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="relative rounded-2xl overflow-hidden aspect-[4/5] lg:aspect-auto group">
            <Image
              src={featured.image}
              alt={featured.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
            <span
              className="absolute top-5 left-5 px-3 py-1 backdrop-blur-[4px] text-[10px] font-bold uppercase tracking-[0.15em] text-[#20E7F2]"
              style={{
                borderRadius: "100px",
                border: "1px solid rgba(32, 231, 242, 0.18)",
                background: "rgba(32, 231, 242, 0.14)",
              }}
            >
              {featured.badge}
            </span>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#20E7F2] mb-1.5">{featured.tag}</div>
              <div className="text-white font-bold text-2xl mb-2">{featured.name}</div>
              <p className="text-white/60 text-[13.5px] leading-relaxed max-w-sm">{featured.desc}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[force, comms, ops, data].map((p) => (
              <div key={p.key} className="relative rounded-2xl overflow-hidden aspect-square group">
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#20E7F2] mb-1">{p.tag}</div>
                  <div className="text-white font-bold text-[15px]">{p.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
