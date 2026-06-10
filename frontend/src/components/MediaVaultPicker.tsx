"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2, ImageIcon, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";

interface LibraryAsset {
  id: string;
  title: string;
  url: string;
  urls: string[];
  file_type: string;
  created_at: string;
}

interface MediaVaultPickerProps {
  onSelect:  (url: string) => void;
  onClose:   () => void;
  typeFilter?: "image" | "video"; // defaults to image
  title?:    string;
  hint?:     string;
}

export default function MediaVaultPicker({
  onSelect, onClose, typeFilter = "image", title = "Choose from Media Vault", hint,
}: MediaVaultPickerProps) {
  const [assets,   setAssets]   = useState<LibraryAsset[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const r = await api.get(`/api/v1/library?type=${typeFilter}&search=${encodeURIComponent(q)}`);
      setAssets(Array.isArray(r) ? r : (r.data || []));
    } finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { load(""); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-800 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h2>
            {hint && <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">{hint}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 dark:text-zinc-500 hover:text-white hover:bg-gray-200 dark:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-zinc-800 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search media…"
              className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:text-zinc-600 focus:outline-none focus:border-white/30 transition-all"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-zinc-600" />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <ImageIcon className="w-8 h-8 text-gray-400 dark:text-zinc-700" />
              <p className="text-xs text-gray-500 dark:text-zinc-500">{search ? "No results for that search" : "No images in your Media Vault yet"}</p>
              <p className="text-[11px] text-gray-400 dark:text-zinc-600">{search ? "Try a different keyword" : "Upload an image using the upload button — it will appear here automatically"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {assets.map(asset => {
                const url     = asset.urls?.[0] || asset.url;
                const isSelected = selected === url;
                return (
                  <button key={asset.id} type="button"
                    onClick={() => setSelected(isSelected ? null : url)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected ? "border-white" : "border-transparent hover:border-gray-400 dark:border-zinc-600"
                    }`}>
                    <Image src={url} alt={asset.title || ""} fill
                      className="object-cover" unoptimized />
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-gray-900 dark:text-white" />
                      </div>
                    )}
                    {asset.file_type === "video" && (
                      <div className="absolute bottom-1 left-1 bg-black/70 rounded px-1 py-0.5 text-[9px] text-gray-900 dark:text-white font-bold">VIDEO</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-zinc-800 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-semibold rounded-xl transition-all">
            Cancel
          </button>
          <button
            onClick={() => { if (selected) { onSelect(selected); onClose(); } }}
            disabled={!selected}
            className="flex-1 py-2 bg-white hover:bg-zinc-100 disabled:opacity-40 text-zinc-900 text-sm font-bold rounded-xl transition-all">
            Use This Image
          </button>
        </div>
      </div>
    </div>
  );
}
