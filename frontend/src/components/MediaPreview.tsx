"use client";

import { useState } from "react";
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
}: MediaPreviewProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] ${className}`}>
        <ImageOff className="w-6 h-6 opacity-40" />
        <span className="text-xs opacity-50 font-medium">No media preview</span>
      </div>
    );
  }

  if (type === "video") {
    return (
      <video
        src={src}
        className={`${className} object-${fit}`}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`${className} object-${fit}`}
      onError={() => setErrored(true)}
    />
  );
}
