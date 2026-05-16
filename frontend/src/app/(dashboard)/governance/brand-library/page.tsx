"use client";

import { Palette } from "lucide-react";

export default function BrandLibraryPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-6">
        <Palette className="w-8 h-8 text-pink-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-3">Brand Library</h1>
      <p className="text-[#888888] text-base max-w-xl leading-relaxed mb-2">
        Voice, visual rules, approved claims, prohibited claims, and brand positioning standards used during validation and review.
      </p>
      <p className="text-[#555555] text-sm">This surface is under active development.</p>
    </div>
  );
}
