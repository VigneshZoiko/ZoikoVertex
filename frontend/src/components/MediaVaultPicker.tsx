"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2, ImageIcon, CheckCircle2, Play, Images } from "lucide-react";
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
  onSelect:      (url: string) => void;
  onSelectPack?: (urls: string[], title: string) => void;
  onClose:       () => void;
  typeFilter?:   "image" | "video" | "all";
  title?:        string;
  hint?:         string;
}

export default function MediaVaultPicker({
  onSelect, onSelectPack, onClose,
  typeFilter = "image",
  title = "Choose from Media Vault",
  hint,
}: MediaVaultPickerProps) {
  const [assets,   setAssets]   = useState<LibraryAsset[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      // Always fetch all, filter client-side so packs appear alongside images
      const r = await api.get(`/api/v1/library?type=all&search=${encodeURIComponent(q)}`);
      const all: LibraryAsset[] = Array.isArray(r) ? r : [];

      const filtered = all.filter(a => {
        const ft = (a.file_type || "").toLowerCase();
        if (typeFilter === "video") return ft.startsWith("video");
        if (typeFilter === "image") return ft.startsWith("image") || ft === "mixed";
        return true;
      });

      setAssets(filtered);
    } finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { load(""); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const selectedAsset = assets.find(a => (a.urls?.[0] || a.url) === selected);
  const isPack    = (selectedAsset?.urls?.length ?? 0) > 1;
  const isVideo   = (selectedAsset?.file_type || "").toLowerCase().startsWith("video");
  const packCount = selectedAsset?.urls?.length ?? 0;

  function handleConfirm() {
    if (!selected || !selectedAsset) return;
    if (isPack && onSelectPack) {
      onSelectPack(selectedAsset.urls, selectedAsset.title || "");
    } else {
      onSelect(selected);
    }
    onClose();
  }

  const confirmLabel = isPack && onSelectPack
    ? `Use as Carousel (${packCount} images)`
    : isVideo ? "Use This Video"
    : "Use This Image";

  const emptyLabel = typeFilter === "video" ? "videos" : typeFilter === "image" ? "images or packs" : "assets";

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl"
        style={{ height: "80vh", display: "grid", gridTemplateRows: "auto auto 1fr auto", overflow: "hidden" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-foreground text-sm">{title}</h2>
            {hint && <p className="text-[11px] text-foreground-muted mt-0.5">{hint}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-foreground-muted hover:text-white hover:bg-surface-hover rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search media…"
              className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-white/30 transition-all"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <ImageIcon className="w-8 h-8 text-foreground-muted" />
              <p className="text-xs text-foreground-muted">{search ? "No results for that search" : `No ${emptyLabel} in your Media Vault yet`}</p>
              <p className="text-[11px] text-foreground-muted">{search ? "Try a different keyword" : "Upload assets to the Media Vault — they will appear here automatically"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {assets.map(asset => {
                const url        = asset.urls?.[0] || asset.url;
                const isSelected = selected === url;
                const assetPack  = (asset.urls?.length ?? 0) > 1;
                const assetVideo = (asset.file_type || "").toLowerCase().startsWith("video");

                return (
                  <button key={asset.id} type="button"
                    onClick={() => setSelected(isSelected ? null : url)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected ? "border-white" : "border-transparent hover:border-border"
                    }`}>

                    {assetVideo ? (
                      <>
                        <video src={url} preload="metadata" muted playsInline
                          className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <Image src={url} alt={asset.title || ""} fill className="object-cover" unoptimized />
                    )}

                    {/* Pack badge */}
                    {assetPack && (
                      <div className="absolute top-1 left-1 bg-black/70 rounded px-1.5 py-0.5 flex items-center gap-1">
                        <Images className="w-3 h-3 text-white" />
                        <span className="text-[9px] text-white font-bold">{asset.urls.length}</span>
                      </div>
                    )}

                    {/* Video badge */}
                    {assetVideo && !assetPack && (
                      <div className="absolute bottom-1 left-1 bg-black/70 rounded px-1 py-0.5 text-[9px] text-white font-bold">VIDEO</div>
                    )}

                    {isSelected && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                    )}

                    {asset.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-[9px] text-white truncate">{asset.title}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2 bg-surface-hover hover:bg-surface-hover text-foreground-muted text-sm font-semibold rounded-xl transition-all">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={!selected}
            className="flex-1 py-2 bg-white hover:bg-zinc-100 disabled:opacity-40 text-zinc-900 text-sm font-bold rounded-xl transition-all">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
