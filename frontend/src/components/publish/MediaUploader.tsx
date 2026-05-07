import React from 'react';
import { ImageIcon, Video, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface MediaUploaderProps {
  mediaPreview: string | null;
  mediaType?: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ 
  mediaPreview, 
  mediaType, 
  onUpload, 
  onClear 
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-white mb-4">Media Assets</h2>
      
      {!mediaPreview ? (
        <label className="w-full h-48 border-2 border-dashed border-zinc-800 hover:border-indigo-500 hover:bg-indigo-500/5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors">
          <div className="flex items-center gap-4 mb-2">
            <ImageIcon className="w-6 h-6 text-zinc-500" />
            <Video className="w-6 h-6 text-zinc-500" />
          </div>
          <span className="text-sm font-medium text-zinc-300">Click to upload Image or Video</span>
          <span className="text-xs text-zinc-500 mt-1">MP4, JPG, PNG (Max 50MB)</span>
          <input type="file" className="hidden" accept="image/*,video/*" onChange={onUpload} />
        </label>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-800">
          {mediaType?.startsWith('video') ? (
            <video src={mediaPreview} controls className="max-h-full max-w-full" />
          ) : (
            <Image src={mediaPreview} alt="Media Preview" width={600} height={400} className="object-contain max-h-full" />
          )}
          <button 
            onClick={onClear}
            className="absolute top-2 right-2 bg-black/70 hover:bg-rose-500 text-white p-1.5 rounded-lg backdrop-blur-md transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
