"use client";

import Image from "next/image";

const IMAGES = [
  "/images/zoiko-group/principle-1.jpg",
  "/images/zoiko-group/principle-2.jpg",
  "/images/zoiko-group/principle-3.jpg",
  "/images/zoiko-group/principle-4.png",
];

export default function ZoikoGroupPrinciples() {
  return (
    <section className="bg-[#080d1a] pb-20 lg:pb-28">
      <div className="max-w-4xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#20E7F2]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Design Principles</span>
        </div>
        <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black leading-tight text-white mb-10 max-w-sm">
          Four principles behind every platform.
        </h2>

        <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden">
          {IMAGES.map((src, i) => (
            <div
              key={src}
              className="relative"
              style={{ aspectRatio: i < 2 ? "534.5 / 978.13" : "534.5 / 533.72" }}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 25vw, 50vw"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(151deg, rgba(8, 14, 26, 0.88) 0%, rgba(8, 14, 26, 0.55) 60%, rgba(8, 14, 26, 0.25) 100%)",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
