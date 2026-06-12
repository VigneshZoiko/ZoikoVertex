import React from 'react';
import Image from 'next/image';
import { Eye } from 'lucide-react';

interface MediaPreviewProps {
  url?: string | string[];
  alt?: string;
  className?: string;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({ url, alt = "Content", className = "" }) => {
  const urls = Array.isArray(url) ? url : url ? [url] : [];

  if (urls.length === 0) {
    return (
      <div className={`w-full aspect-video bg-black rounded-xl border border-[var(--border)] flex items-center justify-center ${className}`}>
        <div className="text-xs text-[var(--foreground-muted)] font-medium text-center p-4">No Media Attached</div>
      </div>
    );
  }

  return (
    <div className={`w-full aspect-video bg-black rounded-xl border border-[var(--border)] relative group overflow-hidden shrink-0 ${className}`}>
      <div className="flex w-full h-full overflow-x-auto snap-x scrollbar-hide">
        {urls.map((u, i) => {
          const isVideo = u.match(/\.(mp4|webm|ogg)$/i);
          return (
            <div key={i} className="min-w-full h-full snap-center relative">
              {isVideo ? (
                <video src={u} className="w-full h-full object-cover" />
              ) : (
                <Image 
                  src={u} 
                  alt={`${alt} ${i + 1}`} 
                  width={400} 
                  height={225} 
                  className="w-full h-full object-cover" 
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Indicator Overlay */}
      {urls.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-xl">
          <Eye className="w-3 h-3 text-info-text" />
          <span className="text-[9px] font-black text-foreground">{urls.length} Files</span>
        </div>
      )}

      {/* Swipe Hint */}
      {urls.length > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {urls.map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-white/50" />
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaPreview;
