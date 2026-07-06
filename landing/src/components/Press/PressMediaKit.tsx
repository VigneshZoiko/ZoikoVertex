"use client";

import Image from "next/image";
import { Layers, Image as ImageIcon, Palette, FileText, UserSquare2, Download } from "lucide-react";

const ASSETS = [
  {
    icon: Layers,
    image: "/images/press/logo-package.png",
    title: "Logo Package",
    desc: "Primary logo, dark-background logo, light-background logo, icon mark, approved monochrome version. Formats: SVG, PNG, PDF.",
    tags: ["SVG", "PNG", "PDF", "Version [TBC]"],
    cta: "Download Logo Package",
    wide: true,
  },
  {
    icon: ImageIcon,
    image: "/images/press/product-visuals.png",
    title: "Product Visuals",
    desc: "Approved screenshots, dashboard visuals, workflow diagrams, and governance graphics.",
    tags: ["PNG", "Pending approval"],
    cta: "Request Screenshots",
    wide: false,
  },
  {
    icon: Palette,
    image: "/images/press/brand-guidelines.png",
    title: "Brand Guidelines",
    desc: "Color system, typography, clear space, minimum size, and incorrect usage examples.",
    tags: ["PDF", "Version [TBC]"],
    cta: "Download Guidelines",
  },
  {
    icon: FileText,
    image: "/images/press/press-documents.png",
    title: "Press Documents",
    desc: "Boilerplate, fact sheet, product overview, Responsible AI summary, and governance summary.",
    tags: ["PDF", "Pending approval"],
    cta: "Request Press Pack",
  },
  {
    icon: UserSquare2,
    image: "/images/press/executive-assets.png",
    title: "Executive Assets",
    desc: "Approved headshots, short bios, speaking topics, and media-ready leadership descriptions.",
    tags: ["JPG", "Pending approval"],
    cta: "Request Executive Pack",
  },
];

function AssetCard({ asset }: { asset: (typeof ASSETS)[number] }) {
  const Icon = asset.icon;
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-[#0C1523] overflow-hidden flex flex-col ${
        asset.wide ? "md:col-span-2" : "md:col-span-1"
      }`}
    >
      <div className="relative h-44 bg-gradient-to-br from-[#151F33] to-[#0C1523] border-b border-white/[0.06]">
        {asset.image && <Image src={asset.image} alt="" fill className="object-cover" />}
      </div>
      <div className="relative px-6 pt-6 pb-6 flex flex-col flex-1">
        <div className="w-14 h-14 mb-4 rounded-xl bg-[#0C1523] border border-[#C9A84C]/25 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-[#C9A84C]" />
        </div>
        <h3 className="text-white font-bold text-[16px] mb-2">{asset.title}</h3>
        <p className="text-white/50 text-[13.5px] leading-relaxed mb-4 flex-1">{asset.desc}</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {asset.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] uppercase tracking-wide font-mono text-white/40 border border-white/10 rounded-full px-2.5 py-1"
            >
              {t}
            </span>
          ))}
        </div>
        <button className="inline-flex items-center gap-2 w-full border border-white/15 rounded-lg px-4 py-3 text-[#C9A84C] text-[13.5px] font-semibold hover:bg-white/5 transition">
          <Download className="w-3.5 h-3.5" />
          {asset.cta}
        </button>
      </div>
    </div>
  );
}

export default function PressMediaKit() {
  return (
    <section className="bg-[#080D1A] py-20 md:py-24 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#C9A84C]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Media Kit &amp; Brand Assets</span>
        </div>
        <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-black leading-tight text-white mb-4">
          Download approved press resources.
        </h2>
        <p className="text-white/50 text-[15px] leading-relaxed max-w-2xl mb-12">
          Assets may be used for editorial and approved media purposes, subject to brand usage rules. Do not modify, recolor, distort, or misattribute ZoikoVertex brand assets.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {ASSETS.map((asset) => (
            <AssetCard key={asset.title} asset={asset} />
          ))}
        </div>
      </div>
    </section>
  );
}
