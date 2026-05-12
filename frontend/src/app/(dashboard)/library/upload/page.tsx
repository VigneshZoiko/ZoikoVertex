"use client";

import { useState } from "react";
import { 
  Upload, FileText, CheckCircle2, AlertCircle, 
  Loader2, Image as ImageIcon, Video as VideoIcon, 
  ArrowRight, ShieldCheck, X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export const dynamic = 'force-dynamic';

export default function CreatorUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      setPreviewUrls(selectedFiles.map(file => URL.createObjectURL(file)));
    }
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !title) {
      setMessage({ type: 'error', text: 'Please provide at least one file and a title.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Upload all files to Supabase Storage
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const filePath = `library/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
        return publicUrl;
      });

      const publicUrls = await Promise.all(uploadPromises);

      // 2. Save Metadata via Backend API
      await api.post('/api/v1/library/upload', {
        title,
        urls: publicUrls,
        file_type: files[0].type.startsWith('video') ? 'video' : 'image' // simplified type
      });

      setMessage({ type: 'success', text: `Asset pack successfully uploaded (${files.length} files) to the Common Library!` });
      setTitle("");
      setFiles([]);
      setPreviewUrls([]);
      
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Upload failed. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Creator Upload Center</h1>
        <p className="text-[var(--foreground-muted)]">Upload high-quality assets for the Managers to pick and publish.</p>
      </div>

      <div className="bg-[var(--card)]/50 border border-[var(--border)] rounded-3xl p-8 backdrop-blur-xl">
        <form onSubmit={handleUpload} className="space-y-6">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Asset Title / Filename
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-muted)]" />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Summer Collection Lipstick Shot"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--foreground)] focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                required
              />
            </div>
          </div>

          {/* File Dropzone */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Media Pack (Upload Multiple Images/Videos)
            </label>

            {/* Empty state — full clickable dropzone */}
            {files.length === 0 && (
              <div className="relative group">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 border-dashed rounded-3xl p-12 text-center transition-all border-[var(--border)] group-hover:border-[var(--card-border)] bg-[var(--surface)]">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-[var(--card)] rounded-2xl flex items-center justify-center mb-4">
                      <Upload className="text-[var(--foreground-muted)]" />
                    </div>
                    <p className="text-[var(--foreground)] font-medium">Click or drag to upload</p>
                    <p className="text-[var(--foreground-muted)] text-sm">Supports high-res JPG, PNG, MP4</p>
                  </div>
                </div>
              </div>
            )}

            {/* Files selected — grid preview with individual remove buttons */}
            {files.length > 0 && previewUrls.length > 0 && (
              <div className="border-2 border-emerald-500/50 bg-emerald-500/5 rounded-3xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-black/50 border border-[var(--border)] group/thumb">
                      {files[idx].type.startsWith('video') ? (
                        <video src={url} className="w-full h-full object-cover opacity-80" />
                      ) : (
                        <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover opacity-80" />
                      )}

                      {/* File number badge */}
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur text-xs font-bold px-2 py-1 rounded text-white">
                        {idx + 1}
                      </div>

                      {/* ✕ Remove button — visible on hover */}
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all hover:bg-rose-500 hover:scale-110 shadow-lg z-10"
                        title={`Remove ${files[idx].name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* File name tooltip on hover */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                        <p className="text-[10px] text-white truncate font-medium">{files[idx].name}</p>
                        <p className="text-[9px] text-[var(--foreground-muted)]">{(files[idx].size / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                    </div>
                  ))}

                  {/* Add more files button */}
                  <label className="relative aspect-video rounded-xl border-2 border-dashed border-[var(--border)] hover:border-indigo-500 bg-[var(--surface)] hover:bg-indigo-500/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group/add">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const newFiles = Array.from(e.target.files);
                          setFiles(prev => [...prev, ...newFiles]);
                          setPreviewUrls(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
                        }
                      }}
                      accept="image/*,video/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-6 h-6 text-[var(--foreground-muted)] group-hover/add:text-indigo-400 transition-colors" />
                    <span className="text-xs text-[var(--foreground-muted)] group-hover/add:text-indigo-400 transition-colors font-medium">Add more</span>
                  </label>
                </div>

                <p className="text-center text-emerald-400 font-medium text-sm">
                  {files.length} file{files.length !== 1 ? 's' : ''} ready to upload. Hover a thumbnail to remove it.
                </p>
              </div>
            )}
          </div>

          {message && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading || files.length === 0 || !title}
            className={`
              w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all
              ${isUploading || files.length === 0 || !title 
                ? 'bg-[var(--surface)] text-[var(--foreground-muted)] cursor-not-allowed' 
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]'}
            `}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Upload to Common Library
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 flex items-center justify-center gap-4 text-[var(--foreground-muted)] text-sm">
        <p>Your upload will be visible to all Managers</p>
        <span>•</span>
        <button onClick={() => router.push('/library')} className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
          View Library <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
