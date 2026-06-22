"use client";

import { useState, useEffect } from "react";
import { ImageOff } from "lucide-react";

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
}: MediaPreviewProps) {
  const [errored, setErrored] = useState(false);

  // Reset error state whenever src changes so switching platforms doesn't
  // keep a stale "errored" result from a previous render.
  useEffect(() => {
    setErrored(false);
  }, [src, type]);

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
      <video
        key={src}
        src={src}
        className={`${className} object-${fit}`}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        playsInline={playsInline}
        onError={() => setErrored(true)}
      />
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
