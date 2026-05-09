"use client";

import { useState, useRef, useCallback } from "react";
import { PackageCheck, Plus, GripVertical } from "lucide-react";

interface MediaPackManagerProps {
  allUrls: string[];
  fileType: string;
  selectedUrls: string[];
  onSelectionChange: (urls: string[]) => void;
}

export default function MediaPackManager({
  allUrls,
  fileType,
  selectedUrls,
  onSelectionChange,
}: MediaPackManagerProps) {
  // Items not yet included in the post
  const removedUrls = allUrls.filter(u => !selectedUrls.includes(u));

  // ── Drag-to-reorder state ─────────────────────────────────────────────────
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    dragIndex.current = idx;
    setDraggingIdx(idx);
  };

  const handleDragEnter = (idx: number) => {
    dragOverIndex.current = idx;
  };

  const handleDragEnd = useCallback(() => {
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    if (from !== null && to !== null && from !== to) {
      const next = [...selectedUrls];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onSelectionChange(next);
    }
    dragIndex.current = null;
    dragOverIndex.current = null;
    setDraggingIdx(null);
  }, [selectedUrls, onSelectionChange]);

  // ── Remove a file from the post (moves to "available" pool) ──────────────
  const removeFromPost = (url: string) => {
    onSelectionChange(selectedUrls.filter(u => u !== url));
  };

  // ── Re-add a file back into the post ─────────────────────────────────────
  const addToPost = (url: string) => {
    onSelectionChange([...selectedUrls, url]);
  };

  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-white">Media Pack Manager</span>
        </div>
        <span className="text-xs text-zinc-400">
          <span className="text-white font-bold">{selectedUrls.length}</span> / {allUrls.length} in post
        </span>
      </div>

      <div className="p-4 space-y-5">

        {/* ── SELECTED (IN POST) — draggable ────────────────────────────── */}
        <div>
          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-3">
            In Post — drag to reorder · click ✕ to remove
          </p>
          {selectedUrls.length === 0 ? (
            <p className="text-xs text-zinc-600 italic text-center py-4">
              No files selected. Add some from the pool below.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {selectedUrls.map((url, idx) => (
                <div
                  key={url}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all select-none ${
                    draggingIdx === idx
                      ? "border-indigo-500 opacity-40 scale-95"
                      : "border-zinc-700 hover:border-indigo-400"
                  }`}
                >
                  {fileType === "video" ? (
                    <video src={url} className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <img src={url} alt={`File ${idx + 1}`} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                  )}

                  {/* Order badge */}
                  <div className="absolute top-1 left-1 bg-indigo-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow pointer-events-none">
                    {idx + 1}
                  </div>

                  {/* Drag handle indicator */}
                  <div className="absolute top-1 right-6 opacity-0 group-hover:opacity-70 transition-opacity pointer-events-none">
                    <GripVertical className="w-3 h-3 text-white drop-shadow" />
                  </div>

                  {/* ✕ Remove button */}
                  <button
                    onClick={() => removeFromPost(url)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:scale-110 shadow z-10 text-[10px] font-black leading-none"
                    title="Remove from post"
                  >
                    ✕
                  </button>

                  {/* Bottom overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-[8px] text-white text-center font-bold">Drag to reorder</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── AVAILABLE POOL (removed / not yet added) ──────────────────── */}
        {removedUrls.length > 0 && (
          <div>
            <div className="h-px bg-zinc-800 mb-4" />
            <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-3">
              Available — click + to add back to post
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {removedUrls.map((url, idx) => (
                <div
                  key={url}
                  className="relative group aspect-square rounded-xl overflow-hidden border-2 border-dashed border-zinc-700 opacity-50 hover:opacity-90 transition-all"
                >
                  {fileType === "video" ? (
                    <video src={url} className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <img src={url} alt={`Available ${idx + 1}`} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                  )}

                  {/* + Re-add button */}
                  <button
                    onClick={() => addToPost(url)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Add to post"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-400 hover:scale-110 transition-all">
                      <Plus className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-1 border-t border-zinc-800 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <p className="text-[10px] text-zinc-500">
            <span className="text-white font-bold">{selectedUrls.length} file{selectedUrls.length !== 1 ? "s" : ""}</span> will be submitted as a carousel post.
            {removedUrls.length > 0 && <span className="text-zinc-600"> {removedUrls.length} in available pool.</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
