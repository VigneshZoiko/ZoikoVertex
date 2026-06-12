import React from 'react';
import { ImageIcon, Video, X } from 'lucide-react';
import Image from 'next/image';

interface MediaUploaderProps {
  mediaPreview: string | null;
  mediaType?: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

const VIDEO_EXT = /\.(mp4|mov|webm|avi|mkv|m4v|ogv)(\?.*)?$/i;

const MediaUploader: React.FC<MediaUploaderProps> = ({
  mediaPreview,
  mediaType,
  onUpload,
  onClear
}) => {
  const isVideo =
    mediaType?.startsWith('video') ||
    (!mediaType && !!mediaPreview && VIDEO_EXT.test(mediaPreview));

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
      <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">Media Assets</h2>

      {!mediaPreview ? (
        <label className="w-full h-48 border-2 border-dashed border-[var(--border)] hover:border-info-border hover:bg-info-bg rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors">
          <div className="flex items-center gap-4 mb-2">
            <ImageIcon className="w-6 h-6 text-[var(--foreground-muted)]" />
            <Video className="w-6 h-6 text-[var(--foreground-muted)]" />
          </div>
          <span className="text-sm font-medium text-[var(--foreground)]">Click to upload Image or Video</span>
          <span className="text-xs text-[var(--foreground-muted)] mt-1">MP4, MOV, JPG, PNG (Max 50MB)</span>
          <input type="file" className="hidden" accept="image/*,video/*" onChange={onUpload} />
        </label>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-[var(--border)]">
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
