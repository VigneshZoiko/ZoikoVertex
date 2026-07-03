"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import * as tus from "tus-js-client";
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  Loader2, Image as ImageIcon, Video as VideoIcon,
  ArrowRight, ShieldCheck, X, Play, Film, FileImage,
  CloudUpload, Plus, RotateCcw, ArrowLeft, MessageSquare,
  Music,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";

// Files larger than this threshold use TUS resumable upload (Supabase standard endpoint caps at ~6 MB)
const TUS_THRESHOLD_BYTES = 6 * 1024 * 1024; // 6 MB
const TUS_CHUNK_BYTES = 6 * 1024 * 1024;     // 6 MB per chunk

const MAX_IMAGE_MB = 50;
const MAX_VIDEO_MB = 500;
const MAX_AUDIO_MB = 50;

interface FileEntry {
  file: File;
  previewUrl: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  publicUrl?: string;
  error?: string;
}

interface ExistingMedia {
  url: string;
  type: 'image' | 'video';
  kept: boolean; // false = user removed it, new file replaces it
}

interface ReviewItem {
  id: string;
  title: string;
  content_snapshot: { urls?: string[]; file_type?: string; copy?: string };
  notes?: { id: string; note_body: string; created_at: string }[];
}

function isVideo(file: File) { return file.type.startsWith('video/'); }
function isAudio(file: File) { return file.type.startsWith('audio/'); }
function isVideoUrl(url: string) { return /\.(mp4|mov|webm|ogg|avi)(\?|$)/i.test(url); }
function formatMB(bytes: number) { return (bytes / (1024 * 1024)).toFixed(1); }

function validateFile(file: File): string | null {
  if (isVideo(file)) {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024)
      return `Video exceeds ${MAX_VIDEO_MB} MB limit (${formatMB(file.size)} MB)`;
  } else if (isAudio(file)) {
    if (file.size > MAX_AUDIO_MB * 1024 * 1024)
      return `Audio exceeds ${MAX_AUDIO_MB} MB limit (${formatMB(file.size)} MB)`;
  } else if (file.type.startsWith('image/')) {
    if (file.size > MAX_IMAGE_MB * 1024 * 1024)
      return `Image exceeds ${MAX_IMAGE_MB} MB limit (${formatMB(file.size)} MB)`;
  } else {
    return 'Only images, videos, and audio files are supported';
  }
  return null;
}

export default function CreatorUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewItemId = searchParams.get('review_item_id');

  // Edit-mode state
  const [reviewItem, setReviewItem] = useState<ReviewItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState<{ id: string; note_body: string; created_at: string }[]>([]);
  const [existingMedia, setExistingMedia] = useState<ExistingMedia[]>([]);
  const [loadingReviewItem, setLoadingReviewItem] = useState(!!reviewItemId);

  // Upload state
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);

  const isEditMode = !!reviewItemId;

  // Load review item data when in edit mode
  useEffect(() => {
    if (!reviewItemId) return;
    Promise.all([
      api.get(`/api/v1/review-queue/items/${reviewItemId}`),
      api.get(`/api/v1/review-queue/items/${reviewItemId}/notes`),
    ]).then(([itemRes, notesRes]) => {
      if (itemRes?.item || itemRes?.data) {
        const item: ReviewItem = itemRes.item || itemRes.data;
        setReviewItem(item);
        setTitle(item.title || "");
        const urls: string[] = item.content_snapshot?.urls || [];
        setExistingMedia(urls.map(url => ({
          url,
          type: isVideoUrl(url) ? 'video' : 'image',
          kept: true,
        })));
      }
      if (notesRes?.data) {
        setReviewNotes(notesRes.data);
      }
    }).catch(() => {}).finally(() => setLoadingReviewItem(false));
  }, [reviewItemId]);

  const addFiles = useCallback((incoming: File[]) => {
    const errors: string[] = [];
    const valid: FileEntry[] = [];
    for (const file of incoming) {
      const err = validateFile(file);
      if (err) { errors.push(`${file.name}: ${err}`); continue; }
      valid.push({ file, previewUrl: URL.createObjectURL(file), progress: 0, status: 'pending' });
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

  const removeExisting = (idx: number) => {
    setExistingMedia(prev => prev.map((m, i) => i === idx ? { ...m, kept: false } : m));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const uploadSingleFile = async (idx: number, file: File, userId: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `library/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    if (file.size > TUS_THRESHOLD_BYTES) {
      // ── Large file: TUS resumable upload (chunks of 6 MB, auto-retries) ──────
      // Supabase's standard /storage/v1/object endpoint caps at ~6 MB per request.
      // The resumable endpoint handles files up to 5 GB on Pro plans.
      // Must use *.storage.supabase.co to bypass Kong proxy body-size limits.
      await new Promise<void>((resolve, reject) => {
        supabase.auth.getSession().then(({ data: sessionData }) => {
          const token = sessionData?.session?.access_token;
          if (!token) { reject(new Error('Not authenticated')); return; }

          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
          // Use dedicated storage hostname (*.storage.supabase.co) to bypass Kong proxy body-size limits
          // Fall back to the generic API hostname for local/self-hosted Supabase
          const isManagedSupabase = supabaseUrl.includes('.supabase.co');
          const storageEndpoint = isManagedSupabase
            ? `https://${supabaseUrl.replace(/^https?:\/\//, '').split('.')[0]}.storage.supabase.co/storage/v1/upload/resumable`
            : `${supabaseUrl}/storage/v1/upload/resumable`;
          const upload = new tus.Upload(file, {
            endpoint: storageEndpoint,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
              authorization: `Bearer ${token}`,
              apikey: supabaseAnonKey,
              'x-upsert': 'true',
            },
            uploadDataDuringCreation: true, // Official Supabase TUS example requires this
            removeFingerprintOnSuccess: true,
            metadata: {
              bucketName: 'media',
              objectName: path,
              contentType: file.type,
              cacheControl: '3600',
            },
            chunkSize: TUS_CHUNK_BYTES,
            onError: (err) => reject(new Error(`Upload failed: ${(err as Error).message ?? err}`)),
            onProgress: (uploaded, total) => {
              const pct = Math.round((uploaded / total) * 95); // cap at 95 until onSuccess
              setEntries(prev => prev.map((e, i) => i === idx ? { ...e, progress: pct } : e));
            },
            onSuccess: () => resolve(),
          });
          upload.start();
        }).catch(reject);
      });
    } else {
      // ── Small file: standard SDK upload ───────────────────────────────────────
      const { error: upErr } = await supabase.storage
        .from('media')
        .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type });

      if (upErr) {
        throw new Error(`Upload failed: ${(upErr as { message?: string }).message ?? 'Unknown error'}`);
      }
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, progress: 100, status: 'done', publicUrl } : e));
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const keptUrls = existingMedia.filter(m => m.kept).map(m => m.url);
    const hasMedia = entries.length > 0 || keptUrls.length > 0;

    if (!hasMedia || !title.trim()) {
      setMessage({ type: 'error', text: 'Please add at least one file and a title.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      setEntries(prev => prev.map(e => ({ ...e, status: 'uploading' as const })));

      const newUrls: string[] = [];
      for (let i = 0; i < entries.length; i++) {
        try {
          const url = await uploadSingleFile(i, entries[i].file, user.id);
          newUrls.push(url);
        } catch (uploadErr) {
          const msg = uploadErr instanceof Error ? uploadErr.message : 'Upload failed';
          setEntries(prev => prev.map((e, j) => j === i ? { ...e, status: 'error', error: msg } : e));
          throw new Error(msg);
        }
      }

      const finalUrls = [...keptUrls, ...newUrls];

      if (isEditMode && reviewItemId) {
        // Replace media + resubmit to review queue
        await api.post(`/api/v1/review-queue/items/${reviewItemId}/action`, {
          action: 'resubmit',
          new_urls: finalUrls,
        });
        setMessage({ type: 'success', text: 'Media updated and resubmitted for review!' });
        setTimeout(() => router.push('/returned'), 1500);
      } else {
        // Normal library upload
        const hasVideo = entries.some(e => isVideo(e.file));
        const hasImage = entries.some(e => e.file.type.startsWith('image/'));
        const hasAudio = entries.some(e => isAudio(e.file));
        const fileType = (hasVideo || hasImage) && hasAudio
          ? 'mixed'
          : hasVideo && hasImage
            ? 'mixed'
            : hasVideo ? 'video'
            : hasAudio ? 'audio'
            : 'image';
        const totalSizeBytes = entries.reduce((acc, e) => acc + e.file.size, 0);

        const result = await api.post('/api/v1/library/upload', {
          title: title.trim(),
          urls: newUrls,
          file_type: fileType,
          file_size_bytes: totalSizeBytes,
        });

        if (result?.success === false || result?.error) {
          throw new Error(typeof result.error === 'string' ? result.error : 'Upload registration failed. Check the browser console for details.');
        }

        const n = entries.length;
        const filesLabel = `${n} file${n !== 1 ? 's' : ''}`;
        if (result?.status === 'pending_review') {
          setMessage({ type: 'success', text: `${filesLabel} sent to the Review Queue — a reviewer will approve before it appears in the library.` });
        } else if (result?.status === 'blocked') {
          setMessage({ type: 'error', text: `${filesLabel} flagged by the safety scanner and sent for review.` });
        } else {
          setMessage({ type: 'success', text: `${filesLabel} uploaded to the Common Library!` });
        }
        setTitle(""); setDescription(""); setEntries([]); setValidationErrors([]);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  const imageCount = entries.filter(e => e.file.type.startsWith('image/')).length;
  const videoCount = entries.filter(e => isVideo(e.file)).length;
  const audioCount = entries.filter(e => isAudio(e.file)).length;
  const keptCount = existingMedia.filter(m => m.kept).length;

  if (loadingReviewItem) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8 flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--foreground-muted)]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      {/* Header */}
      <div className="mb-8">
        {isEditMode && (
          <button
            onClick={() => router.push('/returned')}
            className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Returned Items
          </button>
        )}
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
          {isEditMode ? 'Edit & Resubmit Media' : 'Creator Upload Center'}
        </h1>
        <p className="text-[var(--foreground-muted)]">
          {isEditMode
            ? 'Replace the media, review the notes, then resubmit for review.'
            : 'Upload images, videos, and audio files for the team to pick and publish.'}
        </p>
        {!isEditMode && (
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] bg-[var(--surface)] px-3 py-1.5 rounded-full border border-[var(--border)]">
              <FileImage className="w-3.5 h-3.5 text-sky-400" /> Images up to {MAX_IMAGE_MB} MB
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] bg-[var(--surface)] px-3 py-1.5 rounded-full border border-[var(--border)]">
              <Film className="w-3.5 h-3.5 text-violet-400" /> Videos up to {MAX_VIDEO_MB} MB
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] bg-[var(--surface)] px-3 py-1.5 rounded-full border border-[var(--border)]">
              <Music className="w-3.5 h-3.5 text-emerald-400" /> Audio up to {MAX_AUDIO_MB} MB
            </span>
          </div>
        )}
      </div>

      {/* Reviewer notes banner (edit mode only) */}
      {isEditMode && reviewNotes.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl border border-orange-500/20 bg-orange-500/5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-orange-400">Reviewer Notes</span>
          </div>
          <ul className="space-y-1.5">
            {reviewNotes.map(n => (
              <li key={n.id} className="text-sm text-[var(--foreground)]">{n.note_body}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-[var(--card)]/50 border border-[var(--border)] rounded-3xl p-4 sm:p-8 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Asset Title <span className="text-error-text">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-muted)]" />
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Summer Campaign Hero Shot"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--foreground)] focus:ring-2 focus:ring-info-text transition-all outline-none"
                required
              />
            </div>
          </div>

          {/* Description (normal mode only) */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Description <span className="text-[var(--foreground-muted)] font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief notes for the manager…"
                rows={2}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-3 px-4 text-[var(--foreground)] focus:ring-2 focus:ring-info-text transition-all outline-none resize-none text-sm"
              />
            </div>
          )}

          {/* Existing media (edit mode) */}
          {isEditMode && existingMedia.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Current Media
                <span className="text-xs font-normal text-[var(--foreground-muted)] ml-2">
                  Remove to replace with a new file
                </span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {existingMedia.map((media, idx) => (
                  <div
                    key={idx}
                    className={`relative aspect-video rounded-xl overflow-hidden border transition-all group/existing ${
                      media.kept
                        ? 'border-[var(--border)] bg-black/60'
                        : 'border-red-500/40 bg-red-500/5 opacity-40'
                    }`}
                  >
                    {media.type === 'video' ? (
                      <video src={media.url} className="w-full h-full object-cover opacity-70" muted preload="metadata" />
                    ) : (
                      <Image src={media.url} alt="Current media" fill className="object-cover opacity-80" unoptimized />
                    )}

                    {media.kept ? (
                      <button
                        type="button"
                        onClick={() => removeExisting(idx)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/existing:opacity-100 transition-all shadow-lg"
                        title="Remove this media"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-semibold text-red-400 bg-black/60 px-2 py-1 rounded">Removed</span>
                        <button
                          type="button"
                          onClick={() => setExistingMedia(prev => prev.map((m, i) => i === idx ? { ...m, kept: true } : m))}
                          className="absolute bottom-2 right-2 text-[10px] text-[var(--foreground-muted)] hover:text-[var(--foreground)] underline"
                        >
                          Undo
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drop Zone */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              {isEditMode ? 'New Media' : 'Media Files'}{' '}
              {!isEditMode && <span className="text-error-text">*</span>}
              {isEditMode && (
                <span className="text-xs font-normal text-[var(--foreground-muted)] ml-2">
                  {keptCount > 0 ? 'Optional — add replacement files' : 'Required — add at least one file'}
                </span>
              )}
            </label>

            <div
              ref={dropRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-3xl transition-all ${
                isDragging
                  ? 'border-info-border bg-info-text/5 scale-[1.01]'
                  : entries.length === 0
                    ? 'border-[var(--border)] bg-[var(--surface)] hover:border-info-border/50 hover:bg-info-text/5'
                    : 'border-success-border/40 bg-success-text/5'
              }`}
            >
              {entries.length === 0 && (
                <label className="block p-14 text-center cursor-pointer">
                  <input type="file" multiple onChange={handleFileInput} accept="image/*,video/*,audio/*" className="sr-only" />
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-[var(--card)] rounded-2xl flex items-center justify-center mb-4 border border-[var(--border)]">
                      {isDragging ? <CloudUpload className="w-7 h-7 text-info-text" /> : <Upload className="w-7 h-7 text-[var(--foreground-muted)]" />}
                    </div>
                    <p className="text-[var(--foreground)] font-semibold mb-1">
                      {isDragging ? 'Drop files here' : 'Drag & drop or click to browse'}
                    </p>
                    <p className="text-[var(--foreground-muted)] text-sm">Images, videos, and audio — up to 500 MB per video</p>
                    <div className="flex gap-3 mt-4 flex-wrap justify-center">
                      <span className="flex items-center gap-1.5 text-xs bg-sky-500/10 text-sky-400 px-3 py-1.5 rounded-full border border-sky-500/20">
                        <ImageIcon className="w-3.5 h-3.5" /> Images
                      </span>
                      <span className="flex items-center gap-1.5 text-xs bg-violet-500/10 text-violet-400 px-3 py-1.5 rounded-full border border-violet-500/20">
                        <VideoIcon className="w-3.5 h-3.5" /> Videos
                      </span>
                      <span className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <Music className="w-3.5 h-3.5" /> Audio
                      </span>
                    </div>
                  </div>
                </label>
              )}

              {entries.length > 0 && (
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {entries.map((entry, idx) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-[var(--border)] group/thumb">
                        {isVideo(entry.file) ? (
                          <>
                            <video src={entry.previewUrl} className="w-full h-full object-cover opacity-70" muted preload="metadata" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Play className="w-4 h-4 text-foreground fill-white ml-0.5" />
                              </div>
                            </div>
                          </>
                        ) : isAudio(entry.file) ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-900/60 to-black/80 gap-2 p-2">
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                              <Music className="w-5 h-5 text-emerald-400" />
                            </div>
                            <audio src={entry.previewUrl} controls className="w-full h-7 opacity-80" preload="metadata" />
                          </div>
                        ) : (
                          <Image src={entry.previewUrl} alt={`Preview ${idx + 1}`} fill className="object-cover opacity-80" unoptimized />
                        )}
                        <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm ${
                          isVideo(entry.file) ? 'bg-violet-600/80 text-foreground' : isAudio(entry.file) ? 'bg-emerald-600/80 text-foreground' : 'bg-sky-600/80 text-foreground'
                        }`}>
                          {isVideo(entry.file) ? <Film className="w-2.5 h-2.5" /> : isAudio(entry.file) ? <Music className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                          {isVideo(entry.file) ? 'VIDEO' : isAudio(entry.file) ? 'AUDIO' : 'IMAGE'}
                        </div>
                        {!isUploading && (
                          <button
                            type="button"
                            onClick={() => removeEntry(idx)}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-error-text text-foreground flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all hover:scale-110 shadow-lg z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {entry.status === 'uploading' && (
                          <div className="absolute inset-x-0 bottom-0">
                            <div className="h-1.5 bg-black/40 overflow-hidden">
                              <div className="h-full bg-info-text animate-pulse" style={{ width: '100%' }} />
                            </div>
                            <div className="bg-black/60 backdrop-blur text-center text-[10px] text-foreground py-1">Uploading…</div>
                          </div>
                        )}
                        {entry.status === 'done' && (
                          <div className="absolute inset-0 bg-success-text/20 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-success-text" />
                          </div>
                        )}
                        {entry.status === 'error' && (
                          <div className="absolute inset-0 bg-error-text/20 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-error-text" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover/thumb:opacity-100 transition-opacity pointer-events-none">
                          <p className="text-[10px] text-foreground truncate font-medium">{entry.file.name}</p>
                          <p className="text-[9px] text-white/60">{formatMB(entry.file.size)} MB</p>
                        </div>
                      </div>
                    ))}

                    {!isUploading && (
                      <label className="relative aspect-video rounded-xl border-2 border-dashed border-[var(--border)] hover:border-info-border bg-[var(--surface)] hover:bg-info-text/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group/add">
                        <input type="file" multiple onChange={handleFileInput} accept="image/*,video/*,audio/*" className="sr-only" />
                        <Plus className="w-6 h-6 text-[var(--foreground-muted)] group-hover/add:text-info-text transition-colors" />
                        <span className="text-xs text-[var(--foreground-muted)] group-hover/add:text-info-text transition-colors font-medium">Add more</span>
                      </label>
                    )}
                  </div>

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
                      {audioCount > 0 && (
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <Music className="w-3.5 h-3.5" /> {audioCount} audio{audioCount !== 1 ? ' files' : ' file'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--foreground-muted)]">Hover a thumbnail to remove</span>
                  </div>
                </div>
              )}
            </div>

            {validationErrors.length > 0 && (
              <div className="mt-3 space-y-1">
                {validationErrors.map((err, i) => (
                  <p key={i} className="text-xs text-error-text flex items-center gap-1.5">
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
                ? 'bg-success-text/10 text-success-text border border-success-border/20'
                : 'bg-error-text/10 text-error-text border border-error-border/20'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isUploading || (!title.trim()) || (entries.length === 0 && keptCount === 0)}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
              isUploading || !title.trim() || (entries.length === 0 && keptCount === 0)
                ? 'bg-[var(--surface)] text-[var(--foreground-muted)] cursor-not-allowed'
                : isEditMode
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:shadow-lg hover:shadow-orange-500/20 active:scale-[0.98]'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-foreground hover:shadow-lg hover:shadow-info-text/20 active:scale-[0.98]'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {entries.length > 0
                  ? `Uploading ${entries.filter(e => e.status === 'done').length} / ${entries.length}…`
                  : 'Resubmitting…'}
              </>
            ) : isEditMode ? (
              <>
                <RotateCcw className="w-5 h-5" />
                {entries.length > 0 ? 'Update Media & Resubmit for Review' : 'Resubmit for Review'}
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

      {!isEditMode && (
        <div className="mt-6 flex items-center justify-center gap-4 text-[var(--foreground-muted)] text-sm">
          <p>Uploads are visible to all Managers in the team</p>
          <span>•</span>
          <button
            onClick={() => router.push('/library')}
            className="text-info-text hover:text-info-text transition-colors flex items-center gap-1"
          >
            View Library <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
