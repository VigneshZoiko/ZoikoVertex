"use client";

import { Newspaper } from "lucide-react";

export default function PressReleases() {
  return (
    <section className="bg-[#0A0F1C] border-t border-white/[0.06] py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#C9A84C]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Newsroom</span>
        </div>
        <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-black leading-tight text-white mb-10">
          Press releases &amp; announcements.
        </h2>

        <div className="rounded-2xl border border-dashed border-white/15 py-20 px-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/25 flex items-center justify-center mb-6">
            <Newspaper className="w-5 h-5 text-[#C9A84C]" />
          </div>
          <h3 className="text-white font-bold text-lg mb-3">No public press releases yet.</h3>
          <p className="text-white/40 text-[14px] leading-relaxed max-w-xl">
            Official ZoikoVertex announcements, press releases, product updates, and media coverage will appear here as they are released and approved for publication. Awards, customer names, partnerships, and analyst recognition will only be listed once verified.
          </p>
        </div>
      </div>
    </section>
  );
}
