'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, X } from 'lucide-react';
import Image from 'next/image';

interface MediaUploaderProps {
  mediaPreview: string | null;
  mediaType?: string;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

const VIDEO_EXT = /\.(mp4|mov|webm|avi|mkv|m4v|ogv)(\?.*)?$/i;

const MediaUploader: React.FC<MediaUploaderProps> = ({
  mediaPreview,
  mediaType,
  onClear,
}) => {
  const router = useRouter();

  const isVideo =
    mediaType?.startsWith('video') ||
    (!mediaType && !!mediaPreview && VIDEO_EXT.test(mediaPreview));

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h2 className="text-lg font-bold text-foreground mb-4">Media Assets</h2>

      {!mediaPreview ? (
        <button
          type="button"
          onClick={() => router.push('/library')}
          className="w-full h-48 border-2 border-dashed border-border hover:border-info-border hover:bg-info-bg rounded-xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <FolderOpen className="w-7 h-7 text-foreground-muted" />
          <span className="text-sm font-medium text-foreground-muted">Select from Media Vault</span>
          <span className="text-xs text-(--foreground-muted)/60">Click to open the Media Vault and pick an asset</span>
        </button>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-border">
          {isVideo ? (
            <video src={mediaPreview} controls className="max-h-full max-w-full w-full h-full object-contain" />
          ) : (
            <Image src={mediaPreview} alt="Media Preview" width={600} height={400} className="object-contain max-h-full" />
          )}
          <button
            onClick={onClear}
            className="absolute top-3 right-3 bg-card/80 hover:brightness-110 text-foreground p-2 rounded-xl backdrop-blur-md transition-all border border-white/10"
            title="Remove Media"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
