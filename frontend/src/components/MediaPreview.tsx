"use client";

import { useState, useEffect, useRef } from "react";
import { ImageOff, Maximize2, X } from "lucide-react";

interface MediaPreviewProps {
  src?: string | null;
  alt?: string;
  className?: string;
  type?: "image" | "video";
  fit?: "cover" | "contain";
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  expandable?: boolean;
}

export function MediaPreview({
  src,
  alt = "Media",
  className = "",
  type = "image",
  fit = "cover",
  controls = false,
  autoPlay = false,
  muted = false,
  playsInline = false,
  expandable = false,
}: MediaPreviewProps) {
  const [errored, setErrored] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setErrored(false);
  }, [src, type]);

  // Close lightbox on Escape key
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const handleExpand = () => {
    // Prefer native fullscreen; fall back to lightbox overlay
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen().catch(() => setLightbox(true));
    } else {
      setLightbox(true);
    }
  };

  if (!src) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] ${className}`}>
        <ImageOff className="w-6 h-6 opacity-40" />
        <span className="text-xs opacity-50 font-medium">No media preview</span>
      </div>
    );
  }

  if (errored) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] ${className}`}>
        <ImageOff className="w-6 h-6 opacity-40" />
        <span className="text-xs opacity-50 font-medium">Preview unavailable</span>
      </div>
    );
  }

  if (type === "video") {
    return (
      <>
        <div className={`relative group/mediaprev ${className}`}>
          <video
            ref={videoRef}
            key={src}
            src={src}
            className={`w-full h-full object-${fit}`}
            controls={controls}
            autoPlay={autoPlay}
            muted={muted}
            playsInline={playsInline}
            onError={() => setErrored(true)}
          />
          {expandable && (
            <button
              type="button"
              onClick={handleExpand}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover/mediaprev:opacity-100 transition-opacity hover:bg-black/80 z-10"
              title="View full size"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Lightbox overlay — fallback when native fullscreen is unavailable */}
        {lightbox && (
          <div
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightbox(false)}
          >
            <video
              key={src + "-lb"}
              src={src}
              className="max-w-full max-h-full w-auto h-auto rounded-lg shadow-2xl"
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => setLightbox(false)}
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={alt}
      className={`${className} object-${fit}`}
      onError={() => setErrored(true)}
    />
  );
}
