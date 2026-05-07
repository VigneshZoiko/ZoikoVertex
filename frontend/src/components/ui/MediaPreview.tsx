import React from 'react';
import Image from 'next/image';
import { Eye } from 'lucide-react';

interface MediaPreviewProps {
  url?: string;
  alt?: string;
  className?: string;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({ url, alt = "Content", className = "" }) => {
  if (!url) {
    return (
      <div className={`w-full aspect-video bg-black rounded-xl border border-zinc-800 flex items-center justify-center ${className}`}>
        <div className="text-xs text-zinc-600 font-medium text-center p-4">No Media Attached</div>
      </div>
    );
  }

  const isVideo = url.match(/\.(mp4|webm|ogg)$/i);

  return (
    <div className={`w-full aspect-video bg-black rounded-xl border border-zinc-800 flex items-center justify-center relative group overflow-hidden shrink-0 ${className}`}>
      {isVideo ? (
        <video src={url} className="w-full h-full object-cover" />
      ) : (
        <Image 
          src={url} 
          alt={alt} 
          width={400} 
          height={225} 
          className="w-full h-full object-cover" 
        />
      )}
      <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-colors flex items-center justify-center">
        <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

export default MediaPreview;
