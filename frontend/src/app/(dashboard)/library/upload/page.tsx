"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  Loader2, Image as ImageIcon, Video as VideoIcon,
  ArrowRight, ShieldCheck, X, Play, Film, FileImage,
  CloudUpload, Plus
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";

const MAX_IMAGE_MB = 50;
const MAX_VIDEO_MB = 500;

interface FileEntry {
  file: File;
  previewUrl: string;
  progress: number; // 0–100
  status: 'pending' | 'uploading' | 'done' | 'error';
  publicUrl?: string;
  error?: string;
}

function isVideo(file: File) {
  return file.type.startsWith('video/');
}

function formatMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function validateFile(file: File): string | null {
  if (isVideo(file)) {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024)
      return `Video exceeds ${MAX_VIDEO_MB} MB limit (${formatMB(file.size)} MB)`;
  } else if (file.type.startsWith('image/')) {
    if (file.size > MAX_IMAGE_MB * 1024 * 1024)
      return `Image exceeds ${MAX_IMAGE_MB} MB limit (${formatMB(file.size)} MB)`;
  } else {
    return 'Only images and videos are supported';
  }
  return null;
}

export default function CreatorUploadPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);

  const addFiles = useCallback((incoming: File[]) => {
    const errors: string[] = [];
    const valid: FileEntry[] = [];

    for (const file of incoming) {
      const err = validateFile(file);
      if (err) { errors.push(`${file.name}: ${err}`); continue; }
      valid.push({
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: 'pending',
      });
    }

    setValidationErrors(errors);
    setEntries(prev => [...prev, ...valid]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removeEntry = (idx: number) => {
    setEntries(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  };

  const uploadSingleFile = async (
    idx: number,
    file: File,
    userId: string,
  ): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `library/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      supabase.storage.from('media').createSignedUploadUrl(path).then(({ data, error }) => {
        if (error || !data) {
          // Fall back to standard upload without progress
          supabase.storage.from('media').upload(path, file).then(({ error: upErr }) => {
            if (upErr) return reject(upErr);
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
            setEntries(prev => prev.map((e, i) => i === idx ? { ...e, progress: 100, status: 'done', publicUrl } : e));
            resolve(publicUrl);
          });
          return;
        }

        xhr.upload.addEventListener('progress', (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setEntries(prev => prev.map((e, i) => i === idx ? { ...e, progress: pct } : e));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
            setEntries(prev => prev.map((e, i) => i === idx ? { ...e, progress: 100, status: 'done', publicUrl } : e));
            resolve(publicUrl);
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));

        xhr.open('PUT', data.signedUrl);
        // The signed-upload endpoint expects the SAME multipart body that
        // supabase-js's uploadToSignedUrl sends: a FormData with the file under
        // an empty field name plus cacheControl. Sending the raw file with a
        // plain Content-Type returns 2xx but does NOT persist the object,
        // leaving a dangling URL that 404s ("Object not found") on read.
        // Do NOT set Content-Type manually — the browser sets the multipart
        // boundary header for FormData automatically.
        xhr.setRequestHeader('x-upsert', 'true');
        const form = new FormData();
        form.append('cacheControl', '3600');
        form.append('', file);
        xhr.send(form);
      });
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entries.length === 0 || !title.trim()) {
      setMessage({ type: 'error', text: 'Please add at least one file and a title.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Mark all as uploading
      setEntries(prev => prev.map(e => ({ ...e, status: 'uploading' as const })));

      const publicUrls: string[] = [];
      for (let i = 0; i < entries.length; i++) {
        try {
          const url = await uploadSingleFile(i, entries[i].file, user.id);
          publicUrls.push(url);
        } catch (err) {
          setEntries(prev => prev.map((e, idx) => idx === i
            ? { ...e, status: 'error', error: 'Upload failed' }
            : e));
          throw err;
        }
      }

      // Determine overall file_type
      const hasVideo = entries.some(e => isVideo(e.file));
      const hasImage = entries.some(e => e.file.type.startsWith('image/'));
      const fileType = hasVideo && hasImage ? 'mixed' : hasVideo ? 'video' : 'image';

      await api.post('/api/v1/library/upload', {
        title: title.trim(),
        urls: publicUrls,
        file_type: fileType,
      });

      setMessage({ type: 'success', text: `${entries.length} file${entries.length !== 1 ? 's' : ''} uploaded to the Common Library!` });
      setTitle("");
      setDescription("");
      setEntries([]);
      setValidationErrors([]);
    } catch {
      setMessage({ type: 'error', text: 'Upload failed. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  const imageCount = entries.filter(e => !isVideo(e.file)).length;
  const videoCount = entries.filter(e => isVideo(e.file)).length;

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Creator Upload Center</h1>
        <p className="text-[var(--foreground-muted)]">Upload images and videos for the team to pick and publish.</p>
        <div className="flex items-center gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] bg-[var(--surface)] px-3 py-1.5 rounded-full border border-[var(--border)]">
            <FileImage className="w-3.5 h-3.5 text-sky-400" /> Images up to {MAX_IMAGE_MB} MB
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] bg-[var(--surface)] px-3 py-1.5 rounded-full border border-[var(--border)]">
            <Film className="w-3.5 h-3.5 text-violet-400" /> Videos up to {MAX_VIDEO_MB} MB
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] bg-[var(--surface)] px-3 py-1.5 rounded-full border border-[var(--border)]">
            <CloudUpload className="w-3.5 h-3.5 text-emerald-400" /> JPG, PNG, MP4, MOV, WebM
          </span>
        </div>
      </div>

      <div className="bg-[var(--card)]/50 border border-[var(--border)] rounded-3xl p-8 backdrop-blur-xl">
        <form onSubmit={handleUpload} className="space-y-6">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Asset Title <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-muted)]" />
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Summer Campaign Hero Shot"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--foreground)] focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Description <span className="text-[var(--foreground-muted)] font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief notes for the manager — usage context, campaign, restrictions…"
              rows={2}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-3 px-4 text-[var(--foreground)] focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none text-sm"
            />
          </div>

          {/* Drop Zone */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Media Files <span className="text-rose-400">*</span>
            </label>

            <div
              ref={dropRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-3xl transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/5 scale-[1.01]'
                  : entries.length === 0
                    ? 'border-[var(--border)] bg-[var(--surface)] hover:border-indigo-500/50 hover:bg-indigo-500/5'
                    : 'border-emerald-500/40 bg-emerald-500/5'
              }`}
            >
              {/* Empty drop zone */}
              {entries.length === 0 && (
                <label className="block p-14 text-center cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileInput}
                    accept="image/*,video/*"
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-[var(--card)] rounded-2xl flex items-center justify-center mb-4 border border-[var(--border)]">
                      {isDragging
                        ? <CloudUpload className="w-7 h-7 text-indigo-400" />
                        : <Upload className="w-7 h-7 text-[var(--foreground-muted)]" />
                      }
                    </div>
                    <p className="text-[var(--foreground)] font-semibold mb-1">
                      {isDragging ? 'Drop files here' : 'Drag & drop or click to browse'}
                    </p>
                    <p className="text-[var(--foreground-muted)] text-sm">Images and videos — up to 500 MB per file</p>
                    <div className="flex gap-3 mt-4">
                      <span className="flex items-center gap-1.5 text-xs bg-sky-500/10 text-sky-400 px-3 py-1.5 rounded-full border border-sky-500/20">
                        <ImageIcon className="w-3.5 h-3.5" /> Images
                      </span>
                      <span className="flex items-center gap-1.5 text-xs bg-violet-500/10 text-violet-400 px-3 py-1.5 rounded-full border border-violet-500/20">
                        <VideoIcon className="w-3.5 h-3.5" /> Videos
                      </span>
                    </div>
                  </div>
                </label>
              )}

              {/* Files grid */}
              {entries.length > 0 && (
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {entries.map((entry, idx) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-[var(--border)] group/thumb">

                        {/* Preview */}
                        {isVideo(entry.file) ? (
                          <>
                            <video
                              src={entry.previewUrl}
                              className="w-full h-full object-cover opacity-70"
                              muted
                              preload="metadata"
                            />
                            {/* Play icon overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <Image src={entry.previewUrl} alt={`Preview ${idx + 1}`} fill className="object-cover opacity-80" unoptimized />
                        )}

                        {/* Type badge */}
                        <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm ${
                          isVideo(entry.file) ? 'bg-violet-600/80 text-white' : 'bg-sky-600/80 text-white'
                        }`}>
                          {isVideo(entry.file) ? <Film className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                          {isVideo(entry.file) ? 'VIDEO' : 'IMAGE'}
                        </div>

                        {/* Remove button */}
                        {!isUploading && (
                          <button
                            type="button"
                            onClick={() => removeEntry(idx)}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all hover:bg-rose-500 hover:scale-110 shadow-lg z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}

                        {/* Progress bar */}
                        {entry.status === 'uploading' && (
                          <div className="absolute inset-x-0 bottom-0">
                            <div className="h-1.5 bg-black/40">
                              <div
                                className="h-full bg-indigo-500 transition-all duration-300"
                                style={{ width: `${entry.progress}%` }}
                              />
                            </div>
                            <div className="bg-black/60 backdrop-blur text-center text-[10px] text-white py-1">
                              {entry.progress}%
                            </div>
                          </div>
                        )}

                        {/* Done / Error overlay */}
                        {entry.status === 'done' && (
                          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          </div>
                        )}
                        {entry.status === 'error' && (
                          <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-rose-400" />
                          </div>
                        )}

                        {/* File info on hover */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover/thumb:opacity-100 transition-opacity pointer-events-none">
                          <p className="text-[10px] text-white truncate font-medium">{entry.file.name}</p>
                          <p className="text-[9px] text-white/60">{formatMB(entry.file.size)} MB</p>
                        </div>
                      </div>
                    ))}

                    {/* Add more */}
                    {!isUploading && (
                      <label className="relative aspect-video rounded-xl border-2 border-dashed border-[var(--border)] hover:border-indigo-500 bg-[var(--surface)] hover:bg-indigo-500/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group/add">
                        <input
                          type="file"
                          multiple
                          onChange={handleFileInput}
                          accept="image/*,video/*"
                          className="sr-only"
                        />
                        <Plus className="w-6 h-6 text-[var(--foreground-muted)] group-hover/add:text-indigo-400 transition-colors" />
                        <span className="text-xs text-[var(--foreground-muted)] group-hover/add:text-indigo-400 transition-colors font-medium">Add more</span>
                      </label>
                    )}
                  </div>

                  {/* Summary bar */}
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3 text-sm">
                      {imageCount > 0 && (
                        <span className="flex items-center gap-1.5 text-sky-400">
                          <ImageIcon className="w-3.5 h-3.5" /> {imageCount} image{imageCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {videoCount > 0 && (
                        <span className="flex items-center gap-1.5 text-violet-400">
                          <Film className="w-3.5 h-3.5" /> {videoCount} video{videoCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--foreground-muted)]">Hover a thumbnail to remove</span>
                  </div>
                </div>
              )}
            </div>

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <div className="mt-3 space-y-1">
                {validationErrors.map((err, i) => (
                  <p key={i} className="text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {err}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Status message */}
          {message && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isUploading || entries.length === 0 || !title.trim()}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
              isUploading || entries.length === 0 || !title.trim()
                ? 'bg-[var(--surface)] text-[var(--foreground-muted)] cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading {entries.filter(e => e.status === 'done').length} / {entries.length}…
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Upload {entries.length > 0 ? `${entries.length} File${entries.length !== 1 ? 's' : ''}` : 'to Library'}
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4 text-[var(--foreground-muted)] text-sm">
        <p>Uploads are visible to all Managers in the team</p>
        <span>•</span>
        <button
          onClick={() => router.push('/library')}
          className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
        >
          View Library <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
