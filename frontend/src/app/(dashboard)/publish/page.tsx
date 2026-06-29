"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Send,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  XCircle,
  ListTodo,
  AlertTriangle,
  Calendar,
  Clock,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  Heart,
  Repeat2,
  MoreHorizontal,
  RotateCcw,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import dynamic from "next/dynamic";
import {
  getCompatibility,
  DEFAULT_POST_TYPES,
  type MediaMeta,
} from "@/components/publish/PlatformSelector";

const PlatformSelector = dynamic(
  () => import("@/components/publish/PlatformSelector"),
  { ssr: false },
);
const MediaUploader = dynamic(
  () => import("@/components/publish/MediaUploader"),
  { ssr: false },
);
const AIWriterPanel = dynamic(
  () => import("@/components/publish/AIWriterPanel"),
  { ssr: false },
);
const SchedulingPanel = dynamic(
  () => import("@/components/publish/SchedulingPanel"),
  { ssr: false },
);
const PendingPostItem = dynamic(
  () => import("@/components/publish/PendingPostItem"),
  { ssr: false },
);
const MediaPackManager = dynamic(
  () => import("@/components/publish/MediaPackManager"),
  { ssr: false },
);
const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then(m => ({ default: m.default })),
  { ssr: false },
);
import { useDraftGuard } from "@/lib/context/DraftGuardContext";
import { api } from "@/lib/api";
import { MediaPreview } from "@/components/MediaPreview";

// ── Platform colour map ────────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  facebook:  'bg-blue-600',
  instagram: 'bg-gradient-to-br from-yellow-400 via-pink-500 to-info-text',
  twitter:   'bg-black',
  x:         'bg-black',
  linkedin:  'bg-blue-700',
  threads:   'bg-surface',
  youtube:   'bg-red-600',
  pinterest: 'bg-red-600',
};
const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook', instagram: 'Instagram', twitter: 'X', x: 'X',
  linkedin: 'LinkedIn', threads: 'Threads', youtube: 'YouTube', pinterest: 'Pinterest',
};

// ── PostPreview component ──────────────────────────────────────────────────────
function PostPreview({
  connectedAccounts,
  selectedAccountIds,
  description,
  isPlatformSpecific,
  platformCaptions,
  mediaPreview,
  mediaUrls,
  carouselIndex,
  mediaType,
}: {
  connectedAccounts: any[];
  selectedAccountIds: string[];
  description: string;
  isPlatformSpecific: boolean;
  platformCaptions: Record<string, string>;
  mediaPreview: string | null;
  mediaUrls: string[];
  carouselIndex: number;
  mediaType?: string;
}) {
  const [activePlatform, setActivePlatform] = React.useState('');

  const selectedAccs = connectedAccounts.filter(a => selectedAccountIds.includes(a.id));
  const platforms    = [...new Set(selectedAccs.map((a: any) => a.platform as string))];

  React.useEffect(() => {
    const lowerPlatforms = platforms.map(p => p.toLowerCase());
    if (platforms.length > 0 && !lowerPlatforms.includes(activePlatform)) {
      setActivePlatform(platforms[0].toLowerCase());
    }
    if (platforms.length === 0) setActivePlatform('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountIds.join(',')]);

  const account     = selectedAccs.find((a: any) => a.platform === activePlatform);
  const caption     = isPlatformSpecific
    ? (platformCaptions[activePlatform] || platformCaptions[activePlatform?.toLowerCase()] || platformCaptions[activePlatform?.charAt(0)?.toUpperCase() + activePlatform?.slice(1)] || description)
    : description;
  const currentMedia = mediaUrls.length > 0 ? (mediaUrls[carouselIndex] || mediaUrls[0]) : mediaPreview;
  const isVideoMedia = (src?: string | null) =>
    mediaType?.startsWith('video') ||
    mediaType === 'video' ||
    !!(src?.match(/\.(mp4|mov|webm|avi|m4v)(\?.*)?$/i));
  const initials     = account?.account_name?.charAt(0)?.toUpperCase() || account?.account_handle?.charAt(0)?.toUpperCase() || '?';
  const displayName  = account?.account_name || account?.account_handle || 'Your Account';
  const handle       = account?.account_handle ? `@${account.account_handle}` : '';

  // Empty state
  if (platforms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center py-10 px-4">
        <Eye className="w-8 h-8 text-[var(--foreground-muted)] mb-3 opacity-40" />
        <p className="text-xs font-semibold text-[var(--foreground-muted)]">Post Preview</p>
        <p className="text-[11px] text-[var(--foreground-muted)] mt-1 opacity-60">Select a platform to see how your post will look</p>
      </div>
    );
  }

  const normalizedPlatform = activePlatform.toLowerCase();
  const isFacebook  = normalizedPlatform === 'facebook';
  const isInstagram = normalizedPlatform === 'instagram';
  const isTwitter   = normalizedPlatform === 'twitter' || normalizedPlatform === 'x';
  const isLinkedIn  = normalizedPlatform === 'linkedin';
  const isThreads   = normalizedPlatform === 'threads';
  const isYouTube   = normalizedPlatform === 'youtube';
  const isPinterest = normalizedPlatform === 'pinterest';

  return (
    <div className="space-y-3">
      {/* Platform tabs */}
      <div className="flex flex-wrap gap-1.5">
        {platforms.map(p => (
          <button
            key={p}
            onClick={() => setActivePlatform(p.toLowerCase())}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
              normalizedPlatform === p.toLowerCase()
                ? 'bg-info-text text-foreground border-info-border'
                : 'bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-info-border/50'
            }`}
          >
            {PLATFORM_LABEL[p.toLowerCase()] || PLATFORM_LABEL[p] || p}
          </button>
        ))}
      </div>

      {/* Preview card */}
      {/* ── YouTube preview ─────────────────────────────────── */}
      {isYouTube && (
        <div className="rounded-xl overflow-hidden border border-zinc-200 bg-white text-zinc-900">
          {/* Video thumbnail */}
          <div className="relative w-full aspect-video bg-surface">
            <MediaPreview
              src={currentMedia}
              alt="thumbnail"
              type={isVideoMedia(currentMedia) ? "video" : "image"}
              className="w-full h-full"
              fit="cover"
              controls={isVideoMedia(currentMedia)}
              muted
              playsInline
              expandable={isVideoMedia(currentMedia)}
            />
            {!isVideoMedia(currentMedia) && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-foreground text-[10px] px-1.5 py-0.5 rounded font-bold">0:00</div>
            )}
          </div>
          {/* Video info */}
          <div className="flex gap-3 p-3">
            <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-foreground text-xs font-bold shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-snug line-clamp-2">{caption || 'Your video title'}</p>
              <p className="text-[11px] text-foreground-muted mt-1">{displayName}</p>
              <p className="text-[11px] text-foreground-muted">0 views · Just now</p>
            </div>
            <MoreHorizontal className="w-4 h-4 text-foreground-muted shrink-0 mt-0.5" />
          </div>
        </div>
      )}

      {/* ── Pinterest preview ────────────────────────────────── */}
      {isPinterest && (
        <div className="rounded-xl overflow-hidden bg-white text-zinc-900 max-w-[220px] mx-auto shadow-md">
          {/* Pin image */}
          <div className="relative bg-zinc-100" style={{ aspectRatio: '2/3' }}>
            <MediaPreview
              src={currentMedia}
              alt="pin"
              type={isVideoMedia(currentMedia) ? "video" : "image"}
              className="w-full h-full"
              fit="cover"
              controls={isVideoMedia(currentMedia)}
              muted
              playsInline
              expandable={isVideoMedia(currentMedia)}
            />
            {/* Save button overlay */}
            <button className="absolute top-2.5 right-2.5 bg-red-600 text-foreground text-xs font-bold px-3 py-1.5 rounded-full hover:bg-red-700 transition-colors">
              Save
            </button>
          </div>
          {/* Pin caption */}
          {caption && (
            <div className="p-3">
              <p className="text-xs font-semibold line-clamp-2 text-zinc-900">{caption}</p>
            </div>
          )}
          {/* Creator */}
          <div className="flex items-center gap-2 px-3 pb-3">
            <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-foreground text-[10px] font-bold shrink-0">{initials}</div>
            <p className="text-[11px] text-foreground-muted truncate">{displayName}</p>
          </div>
        </div>
      )}

      {/* ── All other platforms ──────────────────────────────── */}
      {!isYouTube && !isPinterest && <div className={`rounded-xl overflow-hidden border text-sm ${
        isTwitter || isThreads
          ? 'bg-card border-border text-foreground'
          : 'bg-white border-zinc-200 text-zinc-900'
      }`}>

        {/* ── Facebook / LinkedIn header ── */}
        {(isFacebook || isLinkedIn) && (
          <div className="flex items-start gap-2.5 p-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-foreground text-sm font-bold shrink-0 ${PLATFORM_COLORS[activePlatform] || 'bg-zinc-400'}`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight">{displayName}</p>
              <p className="text-[11px] text-foreground-muted">Just now · <Globe className="w-2.5 h-2.5 inline mb-0.5" /></p>
            </div>
            <MoreHorizontal className="w-4 h-4 text-foreground-muted shrink-0 mt-1" />
          </div>
        )}

        {/* ── Instagram header ── */}
        {isInstagram && (
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-info-text p-0.5 shrink-0">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-bold text-zinc-900">
                {initials}
              </div>
            </div>
            <p className="font-bold text-sm flex-1">{handle || displayName}</p>
            <MoreHorizontal className="w-4 h-4 text-foreground-muted shrink-0" />
          </div>
        )}

        {/* ── Twitter/X header ── */}
        {isTwitter && (
          <div className="flex items-start gap-2.5 p-3">
            <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-foreground text-sm font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm">{displayName}</span>
                <span className="text-foreground-muted text-[11px]">{handle}</span>
              </div>
              {caption && <p className="text-sm mt-1 leading-relaxed text-foreground">{caption}</p>}
            </div>
            <MoreHorizontal className="w-4 h-4 text-foreground-muted shrink-0" />
          </div>
        )}

        {/* ── Threads header ── */}
        {isThreads && (
          <div className="flex items-start gap-2.5 p-3">
            <div className="w-9 h-9 rounded-full bg-surface-hover flex items-center justify-center text-foreground text-sm font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{handle || displayName}</p>
              {caption && <p className="text-sm mt-1 text-foreground leading-relaxed">{caption}</p>}
            </div>
            <MoreHorizontal className="w-4 h-4 text-foreground-muted shrink-0 mt-1" />
          </div>
        )}

        {/* Caption (Facebook / LinkedIn / Instagram — below header) */}
        {(isFacebook || isLinkedIn || isInstagram) && caption && (
          <p className={`px-3 pb-2.5 text-[13px] leading-relaxed ${isInstagram ? 'text-zinc-900' : 'text-zinc-800'}`}>
            {caption.length > 200 ? caption.slice(0, 200) + '…' : caption}
          </p>
        )}

        {/* Media */}
        <MediaPreview
          src={currentMedia}
          alt="preview"
          type={isVideoMedia(currentMedia) ? "video" : "image"}
          className={`w-full ${isInstagram ? 'aspect-square' : 'aspect-video'}`}
          fit="cover"
          controls={isVideoMedia(currentMedia)}
          muted
          playsInline
          expandable={isVideoMedia(currentMedia)}
        />

        {/* ── Facebook action bar ── */}
        {isFacebook && (
          <>
            <div className="px-3 py-1.5 flex items-center justify-between text-[11px] text-foreground-muted border-b border-zinc-100">
              <span>👍 Like</span>
              <span>0 comments · 0 shares</span>
            </div>
            <div className="flex divide-x divide-zinc-100">
              {[['👍', 'Like'], ['💬', 'Comment'], ['↗', 'Share']].map(([icon, label]) => (
                <button key={label} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold text-foreground-muted hover:bg-zinc-50 transition-colors">
                  <span>{icon}</span>{label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Instagram action bar ── */}
        {isInstagram && (
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-4">
              <Heart className="w-5 h-5 text-zinc-800" />
              <MessageCircle className="w-5 h-5 text-zinc-800" />
              <Share2 className="w-5 h-5 text-zinc-800" />
              <Bookmark className="w-5 h-5 text-zinc-800 ml-auto" />
            </div>
            <p className="text-[12px] font-bold mt-2 text-zinc-900">0 likes</p>
          </div>
        )}

        {/* ── Twitter/X action bar ── */}
        {isTwitter && (
          <div className="flex items-center justify-between px-3 py-2 text-foreground-muted">
            {[MessageCircle, Repeat2, Heart, Share2].map((Icon, i) => (
              <div key={i} className="flex items-center gap-1 hover:text-blue-400 transition-colors cursor-pointer">
                <Icon className="w-4 h-4" />
                <span className="text-[11px]">0</span>
              </div>
            ))}
          </div>
        )}

        {/* ── LinkedIn action bar ── */}
        {isLinkedIn && (
          <div className="flex divide-x divide-zinc-100 border-t border-zinc-100 mt-1">
            {[['👍', 'Like'], ['💬', 'Comment'], ['↗', 'Repost'], ['📤', 'Send']].map(([icon, label]) => (
              <button key={label} className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-semibold text-foreground-muted hover:bg-zinc-50 transition-colors">
                <span>{icon}</span><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Threads action bar ── */}
        {isThreads && (
          <div className="flex items-center gap-4 px-3 py-2.5 text-foreground-muted">
            <Heart className="w-5 h-5 hover:text-foreground cursor-pointer transition-colors" />
            <MessageCircle className="w-5 h-5 hover:text-foreground cursor-pointer transition-colors" />
            <Repeat2 className="w-5 h-5 hover:text-foreground cursor-pointer transition-colors" />
            <Share2 className="w-5 h-5 hover:text-foreground cursor-pointer transition-colors" />
          </div>
        )}
      </div>}
    </div>
  );
}

// ── AccountDropdown component ─────────────────────────────────────────────────
const PLATFORM_DOT: Record<string, string> = {
  facebook: 'bg-blue-500', instagram: 'bg-pink-500', twitter: 'bg-sky-400',
  x: 'bg-black border border-border', linkedin: 'bg-blue-700', threads: 'bg-surface-hover',
  youtube: 'bg-red-600', pinterest: 'bg-red-500',
};

function AccountDropdown({
  connectedAccounts,
  selectedAccountIds,
  toggleAccountSelection,
  mediaType,
  mediaCount,
  mediaMeta,
  platformPostTypes,
}: {
  connectedAccounts: any[];
  selectedAccountIds: string[];
  toggleAccountSelection: (id: string) => void;
  mediaType: string;
  mediaCount: number;
  mediaMeta: MediaMeta | null;
  platformPostTypes: Record<string, string[]>;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const dropRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const postableAccounts = connectedAccounts;

  const filtered = postableAccounts.filter(a =>
    !search ||
    a.account_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.account_handle?.toLowerCase().includes(search.toLowerCase()) ||
    a.platform?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedAccs = postableAccounts.filter(a => selectedAccountIds.includes(a.id));

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4" ref={dropRef}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-info-text" />
          Post To
        </label>
        {selectedAccs.length > 0 && (
          <span className="text-[11px] text-[var(--foreground-muted)]">
            {selectedAccs.length} account{selectedAccs.length > 1 ? 's' : ''} selected
          </span>
        )}
      </div>

      {/* Selected chips */}
      {selectedAccs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selectedAccs.map(a => (
            <div key={a.id} className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-full px-2.5 py-1">
              <div className={`w-2 h-2 rounded-full shrink-0 ${PLATFORM_DOT[a.platform] || 'bg-zinc-500'}`} />
              <span className="text-[11px] font-semibold text-[var(--foreground)] truncate max-w-[100px]">
                {a.account_name || a.account_handle || a.platform}
              </span>
              <button onClick={() => toggleAccountSelection(a.id)} className="text-[var(--foreground-muted)] hover:text-error-text transition-colors ml-0.5">
                <XCircle className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Trigger */}
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] hover:border-info-border/50 rounded-xl px-3 py-2.5 text-sm text-[var(--foreground-muted)] transition-all text-left"
        >
          <Globe className="w-4 h-4 shrink-0" />
          <span className="flex-1">{selectedAccs.length === 0 ? 'Select social accounts…' : 'Add more accounts…'}</span>
          <ChevronRight className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-[var(--border)]">
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search accounts…"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-info-border transition-colors"
              />
            </div>
            {/* List — capped at ~4 accounts (56px each) with scroll */}
            <div className="overflow-y-auto" style={{ maxHeight: '224px' }}>
              {filtered.length === 0 ? (
                <p className="text-xs text-[var(--foreground-muted)] text-center py-6">
                  {postableAccounts.length === 0 ? 'No social accounts connected — go to Platform Accounts to connect.' : 'No accounts match your search.'}
                </p>
              ) : (
                filtered.map(a => {
                  const isSel = selectedAccountIds.includes(a.id);
                  const postTypes = platformPostTypes[a.platform] || platformPostTypes[a.platform?.charAt(0)?.toUpperCase() + a.platform?.slice(1)];
                  const { blocked, warning } = mediaCount > 0 && mediaType
                    ? getCompatibility(a.platform, postTypes, mediaCount, mediaType, mediaMeta ?? undefined)
                    : { blocked: false, warning: null };

                  return (
                    <button
                      key={a.id}
                      onClick={() => !blocked && toggleAccountSelection(a.id)}
                      disabled={blocked}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                        blocked
                          ? 'opacity-40 cursor-not-allowed bg-error-text/5'
                          : isSel
                            ? 'bg-info-text/5 hover:bg-info-text/10'
                            : 'hover:bg-[var(--surface)]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-foreground text-xs font-bold shrink-0 ${PLATFORM_DOT[a.platform] || 'bg-zinc-500'}`}>
                        {(a.account_name || a.platform)?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{a.account_name || a.account_handle}</p>
                        {blocked ? (
                          <p className="text-[11px] text-error-text truncate">Not supported — {warning || 'incompatible media'}</p>
                        ) : warning ? (
                          <p className="text-[11px] text-warning-text truncate">{warning}</p>
                        ) : (
                          <p className="text-[11px] text-[var(--foreground-muted)] capitalize">{a.platform}{a.account_handle ? ` · @${a.account_handle}` : ''}</p>
                        )}
                      </div>
                      {blocked ? (
                        <XCircle className="w-4 h-4 text-error-text shrink-0" />
                      ) : (
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSel ? 'bg-info-text border-info-border' : 'border-[var(--border)]'}`}>
                          {isSel && <CheckCircle2 className="w-3 h-3 text-foreground" />}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            {/* Footer */}
            {selectedAccs.length > 0 && (
              <div className="p-3 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--foreground-muted)]">{selectedAccs.length} selected</span>
                <button onClick={() => setOpen(false)} className="text-xs font-bold text-info-text hover:text-info-text transition-colors">Done</button>
              </div>
            )}
          </div>
        )}
      </div>

      {postableAccounts.length === 0 && (
        <p className="text-[11px] text-warning-text mt-2">
          No social accounts connected yet — <a href="/accounts" className="underline">connect platforms</a> to start posting.
        </p>
      )}
    </div>
  );
}

function PublishPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isDirty, setIsDirty, setSaveDraftHandler } = useDraftGuard();

  // Basic Content State
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState("Entertainment");
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]); // all URLs in the pack
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]); // manager's finalized selection
  const [carouselIndex, setCarouselIndex] = useState(0);

  // AI & Formatting State
  const [aiTone, setAiTone] = useState("professional");
  const [aiLength, setAiLength] = useState("medium");
  const [aiStyleMode, setAiStyleMode] = useState("");
  const [aiAudience, setAiAudience] = useState("General");
  const [useEmojis, setUseEmojis] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAIWriter, setShowAIWriter] = useState(false);
  const [metrics, setMetrics] = useState<{
    viral_score?: number;
    sentiment_score?: number;
  } | null>(null);

  // Platform Specific State
  const [isPlatformSpecific, setIsPlatformSpecific] = useState(false);
  const [platformCaptions, setPlatformCaptions] = useState<
    Record<string, string>
  >({});
  const [activePlatformTab, setActivePlatformTab] = useState<string>("");
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  // Post type per platform (e.g. instagram→reel, youtube→short)
  const [platformPostTypes, setPlatformPostTypes] = useState<Record<string, string[]>>({});
  // Detected media dimensions/duration for smart platform constraint warnings
  const [mediaMeta, setMediaMeta] = useState<MediaMeta | null>(null);

  const PLATFORM_LIMITS: Record<string, number> = {
    "Instagram": 2200,
    "Facebook": 5000,
    "X": 280,
    "LinkedIn": 3000,
    "Threads": 500,
    "Pinterest": 500,
    "YouTube": 5000,
  };

  // Target publish date (optional — shown on calendar)
  const [scheduledFor, setScheduledFor] = useState("");
  const [bestSlotLoading, setBestSlotLoading] = useState(false);

  // Governance State
  const [userRole, setUserRole] = useState<string | null>(null);
  const canPublish = ['PUBLISHER','CAMPAIGN_MANAGER','MANAGER','CREATOR','ADMIN','WORKSPACE_OWNER','SUPERADMIN'].includes(userRole ?? '');
  const [revisions, setRevisions] = useState<any[]>([]);
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const [reviewComment, setReviewComment] = useState("");

  // Recent publish intents (for status diagnostics)
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const pollTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Scheduled Posts State
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [selectedScheduledPost, setSelectedScheduledPost] = useState<any>(null);
  const [showEditScheduledModal, setShowEditScheduledModal] = useState(false);
  const [userTimezone, setUserTimezone] = useState("UTC");

  // Campaign linking (active campaigns only)

  // AI Recommendations State
  const [suggestedTimes, setSuggestedTimes] = useState<any[]>([]);
  const [schedulerDate, setSchedulerDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );

  // Manual Scheduler State
  const [manualScheduleDate, setManualScheduleDate] = useState<string>('');
  const [manualScheduleTime, setManualScheduleTime] = useState<string>('');

  // Edit mode — returned post from review queue
  const [reviewItem, setReviewItem] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState<any[]>([]);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const assetUrls = searchParams.get('assetUrls');
  const assetUrl  = searchParams.get('assetUrl');
  const assetType = searchParams.get('assetType');
  const assetTitle = searchParams.get('assetTitle');
  const reviewItemId = searchParams.get('review_item_id');

  useEffect(() => {
    const timers = pollTimers.current;
    return () => { timers.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    if (!message) return;
    messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [message]);

  useEffect(() => {
    if (assetUrls) {
      try {
        const parsed: string[] = JSON.parse(assetUrls);
        setMediaUrls(parsed);
        setSelectedUrls(parsed);
        setMediaPreview(parsed[0] || null);
        setCarouselIndex(0);
      } catch {}
    } else if (assetUrl) {
      setMediaUrls([assetUrl]);
      setSelectedUrls([assetUrl]);
      setMediaPreview(assetUrl);
    }
    if (assetTitle && !topic) setTopic(assetTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetUrls, assetUrl, assetTitle]);

  // Prefill all fields when editing a returned review-queue post
  useEffect(() => {
    if (!reviewItemId) return;
    api.get(`/api/v1/review-queue/items/${reviewItemId}`)
      .then(r => {
        if (!r.success || !r.data) return;
        const it = r.data;
        setReviewItem(it);
        const snap = (it.content_snapshot || {}) as any;
        // Topic / title
        if (snap.topic) setTopic(snap.topic);
        else if (it.title) setTopic(it.title);
        // Media
        if (Array.isArray(snap.urls) && snap.urls.length > 0) {
          setMediaUrls(snap.urls);
          setSelectedUrls(snap.urls);
          setMediaPreview(snap.urls[0]);
          setCarouselIndex(0);
        }
        // Captions — prefer platform-specific if present
        if (snap.platform_captions && Object.keys(snap.platform_captions).length > 0) {
          setIsPlatformSpecific(true);
          setPlatformCaptions(snap.platform_captions);
          const first = Object.keys(snap.platform_captions)[0];
          if (first) setActivePlatformTab(first);
          // Also populate universal textarea from first caption as fallback
          if (!description) setDescription(snap.copy || snap.universal || '');
        } else if (snap.copy || snap.universal) {
          setIsPlatformSpecific(false);
          setDescription(snap.copy || snap.universal || '');
        }
        // Target accounts
        if (Array.isArray(snap.target_account_ids) && snap.target_account_ids.length > 0) {
          setSelectedAccountIds(snap.target_account_ids);
        }
      })
      .catch(() => {});

    api.get(`/api/v1/review-queue/items/${reviewItemId}/notes`)
      .then(r => setReviewNotes(r.data || []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewItemId]);

  // Mark draft as dirty whenever meaningful content exists
  useEffect(() => {
    const hasDraft =
      topic.trim().length > 0 ||
      description.trim().length > 0 ||
      media !== null ||
      mediaUrls.length > 0;
    setIsDirty(hasDraft);
  }, [topic, description, media, mediaUrls, setIsDirty]);

  // Reset dirty flag when navigating away from this page
  useEffect(() => {
    return () => { setIsDirty(false); };
  }, [setIsDirty]);



  // Save to Drafts handler
  const handleSaveToDrafts = useCallback(async () => {
    try {
      const payload = {
        title: topic.trim() || description.trim().slice(0, 80) || "Untitled Draft",
        topic: topic.trim(),
        content_type: contentType,
        universal_caption: description,
        platform_captions: isPlatformSpecific ? platformCaptions : {},
        media_urls: selectedUrls.length > 0 ? selectedUrls : (mediaPreview ? [mediaPreview] : []),
        media_type: assetType || (media?.type?.startsWith("video") ? "video" : media ? "image" : null),
        target_account_ids: selectedAccountIds,
        platform_post_types: platformPostTypes,
        ai_tone: aiTone,
        ai_length: aiLength,
        ai_style: aiStyleMode,
        ai_audience: aiAudience,
        use_emojis: useEmojis,
        metrics: metrics,
      };
      const result = await api.post("/api/v1/drafts", payload);
      if (result.success) {
        setMessage({ type: "success", text: "Draft saved! You can find it in the Drafts page." });
        setIsDirty(false);
      } else {
        setMessage({ type: "error", text: result.error || "Failed to save draft" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to save draft" });
    }
  }, [topic, description, contentType, isPlatformSpecific, platformCaptions, selectedUrls, mediaPreview, media, assetType, selectedAccountIds, platformPostTypes, aiTone, aiLength, aiStyleMode, aiAudience, useEmojis, metrics, setIsDirty]);

  // Register save-to-draft handler with DraftGuard context
  useEffect(() => {
    setSaveDraftHandler(handleSaveToDrafts);
    return () => setSaveDraftHandler(null);
  }, [handleSaveToDrafts, setSaveDraftHandler]);


  // Discard handler
  const handleDiscard = useCallback(() => {
    setTopic(""); setDescription(""); setMedia(null); setMediaPreview(null);
    setMediaUrls([]); setSelectedUrls([]); setCarouselIndex(0);
    setSuggestedTimes([]); setActiveRevisionId(null);
    setSelectedAccountIds([]); setPlatformCaptions({}); setPlatformPostTypes({}); setMediaMeta(null);
    setIsDirty(false);
    setMessage({
      type: "success",
      text: "Draft discarded. Start fresh anytime.",
    });
  }, [setIsDirty]);
  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showEmojiPicker]);

  // Insert emoji at cursor position in the active caption
  const handleEmojiSelect = useCallback((emojiData: any) => {
    const emoji: string = emojiData.emoji;
    const textarea = textareaRef.current;
    const cursorPos = textarea?.selectionStart ?? null;

    if (isPlatformSpecific) {
      const current = platformCaptions[activePlatformTab] || '';
      const pos = cursorPos ?? current.length;
      const next = current.slice(0, pos) + emoji + current.slice(pos);
      setPlatformCaptions(prev => ({ ...prev, [activePlatformTab]: next }));
      setTimeout(() => {
        if (textarea) { textarea.focus(); textarea.selectionStart = textarea.selectionEnd = pos + emoji.length; }
      }, 0);
    } else {
      const pos = cursorPos ?? description.length;
      const next = description.slice(0, pos) + emoji + description.slice(pos);
      setDescription(next);
      setTimeout(() => {
        if (textarea) { textarea.focus(); textarea.selectionStart = textarea.selectionEnd = pos + emoji.length; }
      }, 0);
    }
  }, [isPlatformSpecific, activePlatformTab, platformCaptions, description]);

  const [isFetchingRecommendations, setIsFetchingRecommendations] =
    useState(false);

  // Scheduling State
  const [selectedTime, setSelectedTime] = useState<string>("immediate");
  const [customTime, setCustomTime] = useState<string>("");
  const [audienceRegion, setAudienceRegion] = useState("Global");
  const [audienceAgeGroup, setAudienceAgeGroup] = useState("All Ages");

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  const loadRevision = useCallback((rev: any) => {
    try {
      const parsedContent = JSON.parse(rev.content);
      if (
        typeof parsedContent === "object" &&
        !Array.isArray(parsedContent) &&
        parsedContent !== null
      ) {
        setIsPlatformSpecific(true);
        setPlatformCaptions(parsedContent);
        const firstPlatform = Object.keys(parsedContent)[0];
        if (firstPlatform) setActivePlatformTab(firstPlatform);
      } else {
        setIsPlatformSpecific(false);
        setDescription(rev.content);
      }
    } catch {
      setIsPlatformSpecific(false);
      setDescription(rev.content);
    }

    setActiveRevisionId(rev.id);
    setMediaPreview(rev.media_url);
    if (rev.target_account_ids) {
      setSelectedAccountIds(rev.target_account_ids);
    }
    setMessage({
      type: "success",
      text: "Revision loaded. Modify your content and resubmit.",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const fetchUserData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: member } = await supabase
      .from("workspace_members")
      .select("role, workspace_id")
      .eq("user_id", user.id)
      .single();

    if (member) {
      setUserRole(member.role);

      const queueStatus =
        member.role === "MANAGER" ? "PENDING_MANAGER" : "PENDING_ADMIN";

      const [{ data: accounts }, { data: revs }, { data: queue }] =
        await Promise.all([
          supabase
            .from("connected_accounts")
            .select("id, platform, account_name, account_handle")
            .eq("workspace_id", member.workspace_id)
            .eq("status", "active"),
          supabase
            .from("publish_intents")
            .select("id, content, media_url, feedback, target_account_ids")
            .eq("creator_id", user.id)
            .eq("status", "RETURNED"),
          member.role === "ADMIN" || member.role === "MANAGER"
            ? supabase
                .from("publish_intents")
                .select("id, content, platform, media_url, feedback, created_at, users!publish_intents_creator_id_fkey(full_name)")
                .eq("status", queueStatus)
            : Promise.resolve({ data: null }),
        ]);

      if (accounts) {
        setConnectedAccounts(accounts);
      }
      if (revs) setRevisions(revs);
      if (queue) setPendingPosts(queue);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(tz);
  }, []);

  const fetchRecentPosts = useCallback(async () => {
    try {
      const result = await api.get("/api/v1/governance/intents");
      if (result.success && result.data) {
        setRecentPosts(result.data.slice(0, 8));
      }
    } catch {}
  }, []);

  const fetchScheduledPosts = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const result = await api.get("/api/v1/scheduler/posts?limit=50");
      if (result.success && result.posts) {
        setScheduledPosts(result.posts);
      }
    } catch (err) {
      console.error("Failed to fetch scheduled posts:", err);
    }
  }, []);

  useEffect(() => {
    fetchScheduledPosts();
    fetchRecentPosts();
  }, [fetchScheduledPosts, fetchRecentPosts]);

  useEffect(() => {
    const revisionId = searchParams.get("revisionId");
    if (!revisionId) return;
    let isMounted = true;
    const fetchSpecificRevision = async () => {
      const { data, error } = await supabase
        .from("publish_intents")
        .select("id, content, media_url, feedback, target_account_ids")
        .eq("id", revisionId)
        .single();
      if (!error && data && isMounted) {
        loadRevision(data);
      }
    };
    fetchSpecificRevision();
    return () => {
      isMounted = false;
    };
  }, [searchParams, loadRevision]);

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((prev) => {
      const isSelected = prev.includes(accountId);
      const newSelection = isSelected
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId];

      const account = connectedAccounts.find((a) => a.id === accountId);
      if (account && !isSelected) {
        const currentDesc = isPlatformSpecific
          ? platformCaptions[activePlatformTab]
          : description;
        if (!platformCaptions[account.platform]) {
          setPlatformCaptions((pc) => ({
            ...pc,
            [account.platform]: currentDesc || description,
          }));
        }
        if (!activePlatformTab) setActivePlatformTab(account.platform);
      }
      return newSelection;
    });
  };

  const [platforms, setPlatforms] = useState({
    "Instagram": true,
    "Facebook": true,
    "X": true,
    "LinkedIn": true,
    "Threads": true,
    "Pinterest": true,
    "YouTube": true,
  });

  const getSelectedPlatforms = useCallback(() => {
    return Object.keys(platforms).filter(
      (p) => platforms[p as keyof typeof platforms],
    );
  }, [platforms]);

  const [hasImageAnalysis, setHasImageAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Check if there's already an analysis in the session
    const existing = sessionStorage.getItem("lastImageAnalysis");
    if (existing) setHasImageAnalysis(true);
  }, []);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHasImageAnalysis(false);
    setMedia(file);
    setMediaMeta(null);

    // --- Detect video metadata (dimensions + duration) via object URL ---
    if (file.type.startsWith("video")) {
      const previewUrl = URL.createObjectURL(file);
      // Keep previewUrl alive for display — use a separate URL for metadata probing
      // so revoking the probe URL does not invalidate the preview.
      const metaUrl = URL.createObjectURL(file);
      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      videoEl.src = metaUrl;
      videoEl.onloadedmetadata = () => {
        const w = videoEl.videoWidth || 0,
          h = videoEl.videoHeight || 0;
        setMediaMeta({
          width: w,
          height: h,
          duration: isFinite(videoEl.duration) ? videoEl.duration : undefined,
          aspectRatio: h > 0 ? w / h : 1,
          isVertical: w > 0 && h > 0 && w < h,
          fileSize: file.size,
        });
        URL.revokeObjectURL(metaUrl);
      };
      videoEl.onerror = () => URL.revokeObjectURL(metaUrl);
      // Use object URL as preview for videos (efficient — no base64 for large files)
      setMediaPreview(previewUrl);
      setIsAnalyzing(false);
      return;
    }

    // --- Image path: FileReader for base64 preview + AI analysis ---
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      setMediaPreview(rawBase64);

      // Detect image dimensions
      const imgMeta = document.createElement("img");
      imgMeta.src = rawBase64;
      imgMeta.onload = () => {
        const w = imgMeta.naturalWidth,
          h = imgMeta.naturalHeight;
        setMediaMeta({
          width: w,
          height: h,
          aspectRatio: h > 0 ? w / h : 1,
          isVertical: w < h,
          fileSize: file.size,
        });
      };

      try {
        // Resize for AI processing to avoid payload limits
        const img = document.createElement("img");
        img.src = rawBase64;
        await new Promise((r) => (img.onload = r));
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1024 / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas
          .getContext("2d")
          ?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const optimizedBase64 = canvas.toDataURL("image/jpeg", 0.8);

        const data = await api.post("/api/v1/ai/analyze-image", {
          imageBase64: optimizedBase64,
        });
        if (data.success && data.analysis) {
          sessionStorage.setItem("lastImageAnalysis", data.analysis);
          setHasImageAnalysis(true);
          setShowAIWriter(true);
        } else {
          const errorMsg =
            data.error?.message ||
            data.error ||
            "Vision analysis returned no data";
          const errorDetails = data.error?.details || "";
          console.error("[VISION] Failed:", errorMsg, errorDetails);
          setMessage({
            type: "error",
            text: `AI Vision: ${errorMsg}. ${errorDetails}`,
          });
        }
      } catch (err: any) {
        console.error("[VISION] Network Error:", err);
        setMessage({
          type: "error",
          text: `Connection Error: Could not reach AI server`,
        });
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddImageInsight = () => {
    const analysis = sessionStorage.getItem("lastImageAnalysis");
    console.log("[VISION] Adding insight to topic:", analysis);
    if (analysis) {
      setTopic((prev) => {
        const cleaned = prev.trim();
        return cleaned
          ? `${cleaned}\n\n[AI Image Insight]: ${analysis}`
          : analysis;
      });
      // Optionally clear it so they don't add it twice
      // sessionStorage.removeItem('lastImageAnalysis');
      // setHasImageAnalysis(false);
    }
  };

  // Probe media dimensions/duration from library URL (no local File object)
  useEffect(() => {
    if (media || !mediaPreview) return; // local file handled in handleMediaUpload
    const type = assetType || "";
    if (type === "video") {
      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      videoEl.crossOrigin = "anonymous";
      videoEl.src = mediaPreview;
      videoEl.onloadedmetadata = () => {
        const w = videoEl.videoWidth || 0,
          h = videoEl.videoHeight || 0;
        setMediaMeta({
          width: w,
          height: h,
          duration: isFinite(videoEl.duration) ? videoEl.duration : undefined,
          aspectRatio: h > 0 ? w / h : 1,
          isVertical: w > 0 && h > 0 && w < h,
          fileSize: 0,
        });
      };
    } else if (type === "image") {
      const imgEl = document.createElement("img");
      imgEl.crossOrigin = "anonymous";
      imgEl.src = mediaPreview;
      imgEl.onload = () => {
        const w = imgEl.naturalWidth,
          h = imgEl.naturalHeight;
        setMediaMeta({
          width: w,
          height: h,
          aspectRatio: h > 0 ? w / h : 1,
          isVertical: w < h,
          fileSize: 0,
        });
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaPreview, assetType]);

  // Auto-switch YouTube post type based on detected video metadata
  useEffect(() => {
    if (!mediaMeta?.width || mediaMeta.duration === undefined) return;
    const willBeShort = mediaMeta.isVertical && mediaMeta.duration <= 180;
    setPlatformPostTypes(prev => {
      const currentArr = prev['youtube'] ?? [DEFAULT_POST_TYPES['youtube'] ?? 'video'];
      const isShort = currentArr.includes('short');
      if (willBeShort && !isShort) {
        setTimeout(() => setMessage({ type: 'success', text: 'YouTube post type auto-switched to "Short" — vertical video ≤ 3 min detected.' }), 50);
        return { ...prev, youtube: ['short'] };
      }
      if (!willBeShort && isShort) {
        return { ...prev, youtube: ['video'] };
      }
      return prev;
    });
  }, [mediaMeta]);

  const handleGenerateAI = async () => {
    if (!topic) return;
    setGenerating(true);
    setMetrics(null);
    try {
      let imageBase64 = null;
      if (mediaPreview) {
        imageBase64 = mediaPreview;
      }

      const data = await api.post('/api/v1/ai/generate', {
        topic, contentType,
        platforms: ["Instagram", "Facebook", "X", "LinkedIn", "Threads", "Pinterest", "YouTube"],
        length: aiLength,
        tone: aiTone,
        useEmojis,
        styleMode: aiStyleMode,
        imageBase64,
      });

      if (data.success) {
        // 1. Update Universal Description
        setDescription(data.description);

        // 2. Update Platform Specific Captions
        if (data.platform_content) {
          const newCaptions = { ...platformCaptions };
          Object.keys(data.platform_content).forEach((p) => {
            const content = data.platform_content[p];
            newCaptions[p] =
              content.caption + "\n\n" + content.hashtags.join(" ");
          });
          setPlatformCaptions(newCaptions);

          // If the user hasn't selected a tab yet, set it to the first platform returned
          if (
            !activePlatformTab &&
            Object.keys(data.platform_content).length > 0
          ) {
            setActivePlatformTab(Object.keys(data.platform_content)[0]);
          }
        }

        if (data.metadata) {
          setMetrics({
            viral_score: data.metadata.viral_score,
            sentiment_score: data.metadata.sentiment_score,
          });
        }
        // suggestedTimes intentionally NOT set here — only shown when user clicks "Get Best Times"
      } else {
        const errorMsg =
          typeof data.error === "object" ? data.error.message : data.error;
        setMessage({ type: "error", text: errorMsg || "AI Generation Failed" });
      }
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: "AI generation failed. Please check your topic and try again.",
      });
    }
    setGenerating(false);
  };

  // Returns per-platform constraint violations for selected accounts given current media
  const getPlatformViolations = useCallback(() => {
    const count = selectedUrls.length || (media ? 1 : 0);
    const type =
      assetType ||
      (media?.type?.startsWith("video") ? "video" : media ? "image" : "");
    if (!count || !type) return [];

    const seen = new Set<string>();
    const violations: { platform: string; postType: string | string[]; message: string }[] = [];

    for (const id of selectedAccountIds) {
      const acc = connectedAccounts.find((a) => a.id === id);
      if (!acc) continue;
      if (seen.has(acc.platform)) continue;
      seen.add(acc.platform);

      const postType =
        platformPostTypes[acc.platform] ?? DEFAULT_POST_TYPES[acc.platform];
      const { blocked, warning } = getCompatibility(
        acc.platform,
        postType,
        count,
        type,
        mediaMeta,
      );
      if (blocked || warning) {
        violations.push({
          platform: acc.platform,
          postType: postType ?? acc.platform,
          message: warning ?? `${acc.platform} does not support this media.`,
        });
      }
    }
    return violations;
  }, [
    selectedAccountIds,
    connectedAccounts,
    selectedUrls,
    media,
    assetType,
    platformPostTypes,
    mediaMeta,
  ]);

  const handleSubmitIntent = async () => {
    if (selectedAccountIds.length === 0) {
      setMessage({
        type: "error",
        text: "Please select at least one target account in the sidebar.",
      });
      return;
    }

    // Require at least one non-empty caption
    const hasCaption = isPlatformSpecific
      ? Object.values(platformCaptions).some((v) => v.trim().length > 0)
      : description.trim().length > 0;

    if (!hasCaption) {
      setMessage({
        type: "error",
        text: "Please write a caption before publishing.",
      });
      return;
    }

    // Block hard constraint violations (incompatible media type)
    const violations = getPlatformViolations();
    const blocking = violations.filter((v) => {
      const type =
        assetType ||
        (media?.type?.startsWith("video") ? "video" : media ? "image" : "");
      const { blocked } = getCompatibility(
        v.platform,
        v.postType,
        selectedUrls.length || (media ? 1 : 0),
        type,
      );
      return blocked;
    });
    if (blocking.length > 0) {
      setMessage({
        type: "error",
        text: `Media incompatible with: ${blocking.map((b) => b.platform).join(", ")}. Deselect those accounts or change the post type.`,
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Handle Media Upload to Supabase Storage (only if a new local file is attached)
      let finalUrls: string[] = [...selectedUrls];
      if (media) {
        const fileExt = media.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, media, { contentType: media.type, cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const {
          data: { publicUrl: newUrl },
        } = supabase.storage.from("media").getPublicUrl(filePath);

        // AI content scan — runs for images; videos return pending_review automatically
        const scanResult = await api.post('/api/v1/media/scan', { url: newUrl });
        if (scanResult?.status === 'blocked') {
          await supabase.storage.from('media').remove([filePath]);
          throw new Error(`Image blocked by content policy: ${scanResult.reason || 'Content not allowed'}`);
        }

        finalUrls = [newUrl];
      }

      // 2. Submit to Governance Engine
      // Normalize caption keys to lowercase to match connected_accounts.platform values in DB.
      // Only include platform-specific captions when per-platform mode is active — otherwise
      // send empty so the backend uses the universal caption for every selected account.
      const normalizedCaptions = isPlatformSpecific
        ? Object.fromEntries(
            Object.entries(platformCaptions)
              .filter(([, v]) => v.trim().length > 0)
              .map(([k, v]) => [k.toLowerCase(), v])
          )
        : {};

      const payload = {
        topic,
        content: {
          universal: description,
          platforms: normalizedCaptions,
        },
        mediaUrls: finalUrls,
        mediaUrl: finalUrls[0] || null,
        targetAccountIds: selectedAccountIds,
        platformPostTypes,
        userId: user.id,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      };

      if (reviewItemId) {
        // Resubmit mode — update the existing review item and send back to queue
        const res = await api.post(`/api/v1/review-queue/items/${reviewItemId}/action`, {
          action: 'resubmit',
          new_urls: finalUrls,
          content: payload.content,
          topic: payload.topic,
        });
        if (!res.success) throw new Error(res.error || 'Resubmit failed');
        setMessage({ type: 'success', text: 'Resubmitted for review. The reviewer has been notified.' });
        setIsDirty(false);
        setTimeout(() => router.push('/returned'), 1500);
      } else {
        const result = await api.post("/api/v1/governance/submit", payload);

        setMessage({
          type: "success",
          text: `Publishing ${result.count || ""} post${(result.count || 0) > 1 ? "s" : ""} to your selected accounts!`,
        });

        // Cleanup State
        setTopic(""); setDescription(""); setMedia(null); setMediaPreview(null);
        setMediaUrls([]); setSelectedUrls([]); setCarouselIndex(0);
        setSuggestedTimes([]); setActiveRevisionId(null);
        setSelectedAccountIds([]); setPlatformCaptions({}); setPlatformPostTypes({}); setMediaMeta(null);
        setCustomTime(""); setSelectedTime("immediate"); setScheduledFor("");
        setIsDirty(false);
        fetchUserData();
        // Poll for publish result — backend needs a moment to process
        const t1 = setTimeout(() => fetchRecentPosts(), 3000);
        const t2 = setTimeout(() => fetchRecentPosts(), 8000);
        pollTimers.current.push(t1, t2);
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message || err?.error || "Failed to publish. Please try again.",
      });
    }
    setSubmitting(false);
  };

  const handleAdminAction = async (postId: string, action: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const response = await api.post("/api/v1/governance/transition", {
        intentId: postId,
        newStatus: action,
        feedback: action === "RETURNED" ? reviewComment : null,
        userRole,
      });

      setReviewComment("");
      fetchUserData();
      setMessage({ type: "success", text: `Action completed.` });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: "Failed to process action. Please try again.",
      });
    }
  };

  const handleManualSchedule = async () => {
    if (selectedAccountIds.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one target account first.' });
      return;
    }
    if (!manualScheduleDate || !manualScheduleTime) {
      setMessage({ type: 'error', text: 'Pick a date and time to schedule.' });
      return;
    }
    const hasCaption = isPlatformSpecific
      ? Object.values(platformCaptions).some(v => v.trim().length > 0)
      : description.trim().length > 0;
    if (!hasCaption) {
      setMessage({ type: 'error', text: 'Write a caption before scheduling.' });
      return;
    }

    const scheduledTime = new Date(`${manualScheduleDate}T${manualScheduleTime}:00`).toISOString();
    if (new Date(scheduledTime) <= new Date()) {
      setMessage({ type: 'error', text: 'Scheduled time must be in the future.' });
      return;
    }

    const platformsToSchedule = [
      ...new Set(
        selectedAccountIds
          .map(id => connectedAccounts.find(a => a.id === id)?.platform)
          .filter(Boolean) as string[]
      ),
    ];

    setSubmitting(true);
    setMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let mediaUrl: string | null = selectedUrls[0] || null;
      if (media) {
        const fileExt = media.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, media, { contentType: media.type, cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

        // AI content scan — blocks disallowed content before scheduling
        const scanResult = await api.post('/api/v1/media/scan', { url: publicUrl });
        if (scanResult?.status === 'blocked') {
          await supabase.storage.from('media').remove([filePath]);
          throw new Error(`Image blocked by content policy: ${scanResult.reason || 'Content not allowed'}`);
        }

        mediaUrl = publicUrl;
      }

      const results = await Promise.allSettled(
        platformsToSchedule.map(platform =>
          api.post('/api/v1/scheduler/posts', {
            content: isPlatformSpecific
              ? (platformCaptions[platform] || platformCaptions[platform.charAt(0).toUpperCase() + platform.slice(1)] || description)
              : description,
            mediaUrl: mediaUrl || undefined,
            platform,
            scheduledTime,
          })
        )
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (succeeded > 0) {
        setMessage({
          type: 'success',
          text: `Scheduled ${succeeded} post${succeeded > 1 ? 's' : ''} for ${new Date(scheduledTime).toLocaleString('en', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}${failed > 0 ? ` (${failed} failed)` : ''}!`,
        });
        setManualScheduleDate('');
        setManualScheduleTime('');
        fetchScheduledPosts();
      } else {
        setMessage({ type: 'error', text: 'Failed to schedule posts. Please try again.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to schedule post. Please try again.' });
    }
    setSubmitting(false);
  };

  const handleMagicSchedule = async () => {
    const selectedPlatforms = getSelectedPlatforms();
    if (selectedPlatforms.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one platform.' });
      return;
    }

    // Auto-derive niche: extract keywords from description, fall back to topic
    const descWords = description.trim().split(/\s+/).slice(0, 25).join(' ');
    const derivedNiche = topic.trim() || descWords || 'general content';

    // Append image analysis context if available
    const imageAnalysis = hasImageAnalysis ? sessionStorage.getItem('lastImageAnalysis') : null;
    const nicheWithContext = imageAnalysis
      ? `${derivedNiche}. Visual context: ${imageAnalysis.slice(0, 300)}`
      : derivedNiche;

    setIsFetchingRecommendations(true);
    try {
      const data = await api.post('/api/v1/scheduler/recommend', {
        platform: selectedPlatforms[0],
        niche: nicheWithContext,
        audienceRegion,
        audienceAgeGroup,
        userTimezone,
        targetDate: schedulerDate,
      });
      if (data.recommendations) {
        const formattedSlots = data.recommendations.map((rec: any) => ({
          time: `${rec.target_date || schedulerDate}T${rec.user_local_time || rec.best_time}:00`,
          label: rec.user_local_time || rec.best_time,
          audience_time: rec.best_time,
          reasoning_points: rec.reasoning_points || (rec.reasoning ? [rec.reasoning] : []),
          confidence_score: rec.confidence_score,
          audience_timezone: rec.audience_timezone,
          target_date: rec.target_date || schedulerDate,
          user_local_time_start: rec.user_local_time_start,
          user_local_time_end: rec.user_local_time_end,
        }));
        setSuggestedTimes(formattedSlots);
        setMessage({ type: 'success', text: `AI analyzed ${imageAnalysis ? 'your image and content' : 'your content'} and generated peak time slots!` });
      } else {
        setMessage({
          type: "error",
          text: data.error || "AI Scheduling failed",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Could not fetch scheduling recommendations. Try again later.",
      });
    }
    setIsFetchingRecommendations(false);
  };

  const handleEditScheduledPost = async (
    postId: string,
    newContent: string,
    newTime: string,
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const result = await api.put(`/api/v1/scheduler/posts/${postId}`, {
        content: newContent,
        scheduledTime: newTime,
      });
      if (result.success) {
        setScheduledPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, content: newContent, scheduled_time: newTime }
              : p,
          ),
        );
        setShowEditScheduledModal(false);
        setSelectedScheduledPost(null);
        setMessage({ type: "success", text: "Post updated successfully!" });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to update post",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update post" });
    }
  };

  const handleCancelScheduledPost = async (postId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const result = await api.delete(`/api/v1/scheduler/posts/${postId}`);
      if (result.success) {
        setScheduledPosts((prev) => prev.filter((p) => p.id !== postId));
        setSelectedScheduledPost(null);
        setMessage({ type: "success", text: "Post cancelled successfully!" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to cancel post" });
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentCalendarDate);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getPostsForDay = (day: number) => {
    const dateStr = `${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return scheduledPosts.filter((p) => p.scheduled_time.startsWith(dateStr));
  };

  const navigateMonth = (direction: number) => {
    setCurrentCalendarDate(
      new Date(
        currentCalendarDate.getFullYear(),
        currentCalendarDate.getMonth() + direction,
        1,
      ),
    );
  };

  if (loading || userRole === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--foreground-muted)] space-y-4">
        <div className="w-10 h-10 border-4 border-info-border border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold uppercase tracking-widest animate-pulse">
          Syncing Environment...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto pb-20 px-4 sm:px-6">
      {/* Decent Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 border-b border-[var(--border)] pb-8">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl shadow-info-text/20">
            <Image
              src="/images/zoikovertexlogo.png"
              alt="Logo"
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
              Social Publisher
            </h1>
            <p className="text-[var(--foreground-muted)] text-sm mt-1 font-medium">
              Compose and schedule your cross-platform content.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Discard Draft button — only show when dirty and user is MANAGER */}
          {isDirty && userRole === "MANAGER" && (
            <button
              onClick={handleDiscard}
              className="flex items-center gap-2 px-4 py-2 bg-error-text/10 border border-error-border/20 text-error-text hover:bg-error-text/20 rounded-xl text-xs font-bold transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Discard Draft
            </button>
          )}
          {revisions.length > 0 && userRole === "CREATOR" && (
            <button
              onClick={() => router.push("/review")}
              className="flex items-center gap-2 px-4 py-2 bg-warning-text/10 border border-warning-border/20 text-warning-text rounded-xl text-xs font-bold"
            >
              <AlertCircle className="w-4 h-4" />
              {revisions.length} Tasks Awaiting Review
            </button>
          )}
          <div className="px-4 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${userRole?.toUpperCase() === "ADMIN" ? "bg-error-text" : "bg-success-text"}`}
            />
            <span className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">
              {userRole}
            </span>
          </div>
        </div>
      </div>

      {/* Revisions Banner */}
      {revisions.length > 0 && userRole === "CREATOR" && (
        <div className="mb-8 p-6 bg-warning-text/5 border border-warning-border/20 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-warning-text shrink-0" />
            <p className="text-sm font-black text-warning-text uppercase tracking-tight">
              Revisions Requested: {revisions.length} Drafts
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {revisions.map((rev) => (
              <div
                key={rev.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3"
              >
                <p className="text-[10px] text-[var(--foreground-muted)] line-clamp-2 italic">
                  &quot;{rev.feedback || "No feedback provided"}&quot;
                </p>
                <button
                  onClick={() => loadRevision(rev)}
                  className="w-full py-1.5 bg-warning-text/20 text-warning-text text-[10px] font-bold rounded-lg uppercase hover:bg-warning-text/30 transition-all"
                >
                  Edit Revision
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div
          ref={messageRef}
          className={`mb-8 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in duration-300 ${message.type === "success" ? "bg-success-text/10 border border-success-border/20 text-success-text" : "bg-error-text/10 border border-error-border/20 text-error-text"}`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Composer - Left Side */}
        <div className="lg:col-span-7 space-y-4">

          {/* Returned-post edit mode banner */}
          {reviewItemId && (
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 overflow-hidden">
              <div className="flex items-start gap-3 px-5 py-4 border-b border-orange-500/10">
                <RotateCcw className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-orange-400">Editing Returned Post</p>
                  <p className="text-xs text-orange-300/70 mt-0.5 truncate">
                    {reviewItem?.title || "Review item"} — make your changes then click Resubmit for Review
                  </p>
                </div>
              </div>
              {reviewNotes.length > 0 && (
                <div className="px-5 py-3 space-y-2">
                  <p className="text-[10px] font-bold text-orange-400/60 uppercase tracking-wider">
                    Reviewer Instructions
                  </p>
                  {reviewNotes.map(n => (
                    <div
                      key={n.id}
                      className="text-xs text-[var(--foreground)] bg-orange-500/5 border border-orange-500/10 rounded-lg px-3 py-2 leading-relaxed"
                    >
                      {n.note_body}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Post To — Account Dropdown (top) ───────────────────────────── */}
          <AccountDropdown
            connectedAccounts={connectedAccounts}
            selectedAccountIds={selectedAccountIds}
            toggleAccountSelection={toggleAccountSelection}
            mediaType={assetType || (media?.type?.startsWith('video') ? 'video' : media ? 'image' : '')}
            mediaCount={selectedUrls.length || (media ? 1 : 0)}
            mediaMeta={mediaMeta}
            platformPostTypes={platformPostTypes}
          />

          {/* Media Section */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                Media
              </h3>
              <div className="flex items-center gap-2">
                {mediaUrls.length > 1 && (
                  <span className="text-xs text-info-text font-bold bg-info-text/10 border border-info-border/20 px-3 py-1 rounded-lg">
                    Pack · {mediaUrls.length} files
                  </span>
                )}
                <button type="button" onClick={() => router.push('/library')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)] transition-colors">
                  Media Vault
                </button>
              </div>
            </div>

            {/* Carousel preview when library pack is loaded */}
            {mediaUrls.length > 1 ? (
              <div className="space-y-4">
                <div
                  className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-black select-none"
                  style={{ touchAction: "pan-y" }}
                  onPointerDown={(e) => {
                    (e.currentTarget as any)._dragStartX = e.clientX;
                    (e.currentTarget as any)._dragging = true;
                  }}
                  onPointerMove={(e) => {
                    if (!(e.currentTarget as any)._dragging) return;
                    (e.currentTarget as any)._dragCurrentX = e.clientX;
                  }}
                  onPointerUp={(e) => {
                    if (!(e.currentTarget as any)._dragging) return;
                    (e.currentTarget as any)._dragging = false;
                    const start =
                      (e.currentTarget as any)._dragStartX ?? e.clientX;
                    const delta =
                      (e.currentTarget as any)._dragCurrentX - start;
                    if (
                      delta < -60 &&
                      carouselIndex < selectedUrls.length - 1
                    ) {
                      const ni = carouselIndex + 1;
                      setCarouselIndex(ni);
                      setMediaPreview(selectedUrls[ni]);
                    } else if (delta > 60 && carouselIndex > 0) {
                      const ni = carouselIndex - 1;
                      setCarouselIndex(ni);
                      setMediaPreview(selectedUrls[ni]);
                    }
                  }}
                  onPointerLeave={(e) => {
                    (e.currentTarget as any)._dragging = false;
                  }}
                >
                  <div className="aspect-video relative cursor-grab active:cursor-grabbing">
                    {assetType === "video" ? (
                      <div
                        className="w-full h-full"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <video
                          key={
                            selectedUrls[
                              Math.min(carouselIndex, selectedUrls.length - 1)
                            ]
                          }
                          src={
                            selectedUrls[
                              Math.min(carouselIndex, selectedUrls.length - 1)
                            ]
                          }
                          controls
                          playsInline
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        <Image
                          key={
                            selectedUrls[
                              Math.min(carouselIndex, selectedUrls.length - 1)
                            ]
                          }
                          src={
                            selectedUrls[
                              Math.min(carouselIndex, selectedUrls.length - 1)
                            ]
                          }
                          alt={`media ${carouselIndex + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 66vw"
                          className="object-contain pointer-events-none"
                          draggable={false}
                        />
                      </div>
                    )}

                    {/* Left arrow */}
                    {carouselIndex > 0 && (
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                          const ni = carouselIndex - 1;
                          setCarouselIndex(ni);
                          setMediaPreview(selectedUrls[ni]);
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-foreground rounded-full w-9 h-9 flex items-center justify-center transition-all z-10"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}

                    {/* Right arrow */}
                    {carouselIndex < selectedUrls.length - 1 && (
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                          const ni = carouselIndex + 1;
                          setCarouselIndex(ni);
                          setMediaPreview(selectedUrls[ni]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-foreground rounded-full w-9 h-9 flex items-center justify-center transition-all z-10"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}

                    {/* Dot indicators */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {selectedUrls.map((_, i) => (
                        <button
                          key={i}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => {
                            setCarouselIndex(i);
                            setMediaPreview(selectedUrls[i]);
                          }}
                          className={`rounded-full transition-all ${i === carouselIndex ? "bg-white w-4 h-2" : "bg-white/40 hover:bg-white/70 w-2 h-2"}`}
                        />
                      ))}
                    </div>

                    {/* Swipe hint */}
                    <div className="absolute top-3 right-3 bg-black/50 text-foreground text-[10px] px-2 py-1 rounded-lg font-medium opacity-60">
                      {carouselIndex + 1} / {selectedUrls.length}
                    </div>
                  </div>

                  {/* Thumbnail strip */}
                  <div className="flex gap-2 p-3 bg-[var(--surface)]/80 overflow-x-auto">
                    {selectedUrls.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setCarouselIndex(i);
                          setMediaPreview(url);
                        }}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 relative transition-all ${i === carouselIndex ? "border-info-border" : "border-transparent opacity-60 hover:opacity-100"}`}
                      >
                        {assetType === "video" ? (
                          <video
                            src={url}
                            preload="metadata"
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image
                            src={url}
                            alt={`thumb ${i}`}
                            fill
                            sizes="64px"
                            className="object-cover"
                            draggable={false}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Media Pack Manager */}
                <MediaPackManager
                  allUrls={mediaUrls}
                  fileType={assetType || "image"}
                  selectedUrls={selectedUrls}
                  onSelectionChange={(next) => {
                    setSelectedUrls(next);
                    // Keep carousel index in bounds
                    if (carouselIndex >= next.length)
                      setCarouselIndex(Math.max(0, next.length - 1));
                    setMediaPreview(next[0] || null);
                  }}
                />
              </div>
            ) : (
              <MediaUploader
                mediaPreview={mediaPreview}
                mediaType={
                  media?.type ||
                  (assetType === "video"
                    ? "video/mp4"
                    : assetType === "image"
                      ? "image/jpeg"
                      : undefined)
                }
                onUpload={handleMediaUpload}
                onClear={() => {
                  setMedia(null);
                  setMediaPreview(null);
                  setMediaUrls([]);
                  setSelectedUrls([]);
                  setMediaMeta(null);
                }}
              />
            )}
          </div>

          {/* Content Area (Instagram-style: Bottom) */}
          <div className="bg-[var(--card)]/50 border border-[var(--border)] rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold text-[var(--foreground)] leading-none">
                    Draft Composer
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-[var(--surface)] text-[var(--foreground-muted)] text-[9px] font-black uppercase tracking-widest rounded-md border border-[var(--border)]/50">
                      {contentType}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-[var(--surface)] p-1 rounded-lg border border-[var(--border)]">
                  <button
                    onClick={() => setIsPlatformSpecific(false)}
                    className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${!isPlatformSpecific ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}
                  >
                    Universal
                  </button>
                  <button
                    onClick={() => {
                      setIsPlatformSpecific(true);
                      if (!activePlatformTab) setActivePlatformTab("Instagram");
                    }}
                    className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${isPlatformSpecific ? "bg-info-text text-foreground shadow-sm shadow-info-text/20" : "text-[var(--foreground-muted)] hover:text-[var(--foreground-muted)]"}`}
                  >
                    Per Platform
                  </button>
                </div>
              </div>

              {isPlatformSpecific && (
                <div className="flex flex-wrap gap-2 mb-6 p-2 bg-[var(--surface)]/50 border border-[var(--border)]/50 rounded-2xl overflow-x-auto scrollbar-hide">
                  {Object.keys(platforms).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setActivePlatformTab(p);
                        // Ensure it's selected for generation
                        setPlatforms((prev) => ({ ...prev, [p]: true }));
                        // Copy description if empty
                        if (!platformCaptions[p]) {
                          setPlatformCaptions((prev) => ({
                            ...prev,
                            [p]: description,
                          }));
                        }
                      }}
                      className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${activePlatformTab === p ? "bg-warning-text/10 border-warning-border text-warning-text" : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--card-border)]"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl transition-all focus-within:border-[var(--card-border)]">
                <textarea
                  ref={textareaRef}
                  value={
                    isPlatformSpecific
                      ? platformCaptions[activePlatformTab] || ""
                      : description
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isPlatformSpecific) {
                      setPlatformCaptions((prev) => ({
                        ...prev,
                        [activePlatformTab]: val,
                      }));
                    } else {
                      setDescription(val);
                    }
                  }}
                  placeholder={
                    isPlatformSpecific
                      ? `Write custom caption for ${activePlatformTab}...`
                      : "Write your universal caption here..."
                  }
                  className="w-full bg-transparent p-6 text-[var(--foreground)] text-base leading-relaxed outline-none resize-none min-h-[250px]"
                />

                <div className="p-4 flex items-center justify-between border-t border-[var(--border)]/50 bg-[var(--card)]/30">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAIWriter(!showAIWriter)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${showAIWriter ? "bg-info-text text-foreground" : "bg-[var(--surface)] text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Studio
                    </button>
                    <div className="relative" ref={emojiPickerRef}>
                      <button
                        onClick={() => setShowEmojiPicker(v => !v)}
                        title="Insert emoji"
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all border text-base ${showEmojiPicker ? "bg-warning-text/10 border-warning-border/20" : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-hover)]"}`}
                      >
                        😊
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute bottom-12 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden"
                          style={{ maxWidth: 'calc(100vw - 2rem)' }}
                        >
                          <EmojiPicker
                            onEmojiClick={handleEmojiSelect}
                            theme={"dark" as any}
                            searchPlaceHolder="Search emojis…"
                            width={320}
                            height={420}
                            lazyLoadEmojis
                            skinTonesDisabled
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest ${
                        isPlatformSpecific &&
                        (platformCaptions[activePlatformTab]?.length || 0) >
                          (PLATFORM_LIMITS[activePlatformTab] || 9999)
                          ? "text-error-text"
                          : "text-[var(--foreground-muted)]"
                      }`}
                    >
                      {isPlatformSpecific
                        ? platformCaptions[activePlatformTab]?.length || 0
                        : description.length}{" "}
                      /{" "}
                      {isPlatformSpecific
                        ? PLATFORM_LIMITS[activePlatformTab] || "∞"
                        : "∞"}{" "}
                      Characters
                    </span>
                    {isPlatformSpecific &&
                      (platformCaptions[activePlatformTab]?.length || 0) >
                        (PLATFORM_LIMITS[activePlatformTab] || 9999) && (
                        <span className="text-[9px] text-error-text font-bold flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Exceeds limit
                        </span>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {showAIWriter && (
              <AIWriterPanel
                topic={topic}
                onTopicChange={setTopic}
                contentType={contentType}
                onContentTypeChange={setContentType}
                aiLength={aiLength}
                onAiLengthChange={setAiLength}
                audience={aiAudience}
                onAudienceChange={setAiAudience}
                onGenerate={handleGenerateAI}
                generating={generating}
                hasImageAnalysis={hasImageAnalysis}
                isAnalyzing={isAnalyzing}
                onAddImageInsight={handleAddImageInsight}
              />
            )}

            {metrics && (
              <div className="p-6 border-t border-[var(--border)] bg-[var(--card)]/20 flex gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] block mb-1">
                    Viral Score
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-bold text-[var(--foreground)]">
                      {metrics.viral_score}/100
                    </div>
                    <div className="w-24 h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-info-text"
                        style={{ width: `${metrics.viral_score}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] block mb-1">
                    Sentiment
                  </label>
                  <div className="text-xl font-bold text-success-text">
                    {metrics.sentiment_score && metrics.sentiment_score > 0.7
                      ? "Positive"
                      : "Balanced"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Platform Selection — hidden (moved to top; PlatformSelector kept for post-type/compat logic) */}
          <div className="hidden bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-[var(--foreground)] mb-4">
              Post To
            </h3>
            {/* Smart media info badge */}
            {mediaMeta && mediaMeta.width > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)]">
                  {mediaMeta.width}×{mediaMeta.height}
                  {mediaMeta.isVertical
                    ? " · Vertical (9:16)"
                    : mediaMeta.aspectRatio > 1.5
                      ? " · Landscape (16:9)"
                      : " · Square"}
                </span>
                {mediaMeta.duration !== undefined && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)]">
                    {mediaMeta.duration < 60
                      ? `${Math.round(mediaMeta.duration)}s`
                      : `${Math.floor(mediaMeta.duration / 60)}m ${Math.round(mediaMeta.duration % 60)}s`}
                  </span>
                )}
                {mediaMeta.fileSize > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)]">
                    {mediaMeta.fileSize > 1024 ** 3
                      ? `${(mediaMeta.fileSize / 1024 ** 3).toFixed(1)} GB`
                      : mediaMeta.fileSize > 1024 ** 2
                        ? `${(mediaMeta.fileSize / 1024 ** 2).toFixed(1)} MB`
                        : `${(mediaMeta.fileSize / 1024).toFixed(0)} KB`}
                  </span>
                )}
              </div>
            )}
            <PlatformSelector
              connectedAccounts={connectedAccounts}
              selectedAccountIds={selectedAccountIds}
              onToggleAccount={toggleAccountSelection}
              userRole={userRole}
              mediaCount={selectedUrls.length || (media ? 1 : 0)}
              mediaType={
                assetType ||
                (media?.type?.startsWith("video")
                  ? "video"
                  : media
                    ? "image"
                    : "")
              }
              mediaMeta={mediaMeta}
              platformPostTypes={platformPostTypes}
              onPostTypeChange={(platform, postType) =>
                setPlatformPostTypes((prev) => ({
                  ...prev,
                  [platform]: postType,
                }))
              }
            />
          </div>

          {/* Platform constraint warnings — shown ABOVE campaign selector */}
          {(() => {
            const mediaType = assetType || (media?.type?.startsWith("video") ? "video" : media ? "image" : "");
            const count = selectedUrls.length || (media ? 1 : 0);
            const violations = getPlatformViolations();
            if (violations.length === 0) return null;

            const blocking = violations.filter(v => {
              const { blocked } = getCompatibility(v.platform, v.postType, count, mediaType, mediaMeta);
              return blocked;
            });
            const warnings = violations.filter(v => !blocking.includes(v));

            // Extra Meta-specific format hints
            const metaFormatHints: string[] = [];
            if (mediaType === "video" && mediaMeta && !mediaMeta.isVertical) {
              const hasInstagram = selectedAccountIds.some(id =>
                connectedAccounts.find(a => a.id === id)?.platform === "instagram"
              );
              const hasFacebook = selectedAccountIds.some(id =>
                connectedAccounts.find(a => a.id === id)?.platform === "facebook"
              );
              const postTypes = Object.values(platformPostTypes).flat();
              if ((hasInstagram || hasFacebook) && (postTypes.includes("reel") || postTypes.includes("story"))) {
                metaFormatHints.push("Reels & Stories require vertical video (9:16 ratio). Your video is landscape — it won't appear in Reels or Stories placement.");
              }
            }
            if (mediaType === "video" && mediaMeta && mediaMeta.duration && mediaMeta.duration > 90) {
              const hasInstagram = selectedAccountIds.some(id =>
                connectedAccounts.find(a => a.id === id)?.platform === "instagram"
              );
              if (hasInstagram) metaFormatHints.push("Instagram Reels max duration is 90 seconds. Your video may be trimmed.");
            }

            return (
              <div className="space-y-2">
                {blocking.map((v, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-error-text/10 border border-error-border/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-error-text mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-error-text capitalize">{v.platform} — not supported</p>
                      <p className="text-[11px] text-error-text mt-0.5">{v.message}</p>
                    </div>
                  </div>
                ))}
                {metaFormatHints.map((hint, i) => (
                  <div key={`hint-${i}`} className="flex items-start gap-3 p-3 bg-warning-text/8 border border-warning-border/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-warning-text mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-warning-text">Meta Format Warning</p>
                      <p className="text-[11px] text-warning-text mt-0.5">{hint}</p>
                    </div>
                  </div>
                ))}
                {warnings.filter(v => !metaFormatHints.length).map((v, i) => (
                  <div key={`w-${i}`} className="flex items-start gap-3 p-3 bg-warning-text/8 border border-warning-border/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-warning-text mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-warning-text capitalize">{v.platform}</p>
                      <p className="text-[11px] text-warning-text mt-0.5">{v.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}


          {/* Submit */}
          <button
            onClick={handleSubmitIntent}
            disabled={submitting || !canPublish}
            title={!canPublish ? "Your role cannot publish content" : undefined}
            className={`w-full py-4 font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
              reviewItemId
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/20"
                : "bg-info-text text-foreground hover:bg-info-text"
            }`}
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : reviewItemId ? (
              <RotateCcw className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitting
              ? (reviewItemId ? "Resubmitting…" : "Publishing…")
              : reviewItemId
                ? "Update & Resubmit for Review"
                : activeRevisionId
                  ? "Republish"
                  : "Publish Now"}
          </button>
          {/* Save to Drafts */}
          <button
            onClick={handleSaveToDrafts}
            disabled={submitting}
            className="w-full py-4 font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--card-border)] hover:bg-[var(--surface-hover)]"
          >
            <Bookmark className="w-4 h-4" />
            Save to Drafts
          </button>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-5 space-y-4">
          {/* Post Preview */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2 mb-3">
              <Eye className="w-3.5 h-3.5 text-info-text" />
              Post Preview
            </h3>
            <PostPreview
              connectedAccounts={connectedAccounts}
              selectedAccountIds={selectedAccountIds}
              description={description}
              isPlatformSpecific={isPlatformSpecific}
              platformCaptions={platformCaptions}
              mediaPreview={mediaPreview}
              mediaUrls={selectedUrls}
              carouselIndex={carouselIndex}
              mediaType={assetType || (media?.type?.startsWith('video') ? 'video' : media ? 'image' : undefined)}
            />
          </div>

          {/* REMOVE: Week Calendar — moved to calendar page */}
          {/* REMOVE: Scheduled Posts — moved to calendar page */}
          {/* REMOVE: Recent Posts — moved to calendar page */}

          {/* placeholder so existing code below finds the right opening div */}
          <div className="hidden bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 hidden-week-cal">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
                <Calendar className="w-3 h-3 text-info-text" />
                This Week
              </h3>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (day, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - date.getDay() + i);
                  const dateStr = date.toISOString().split("T")[0];
                  const posts = scheduledPosts.filter((p) =>
                    p.scheduled_time.startsWith(dateStr),
                  );
                  const isToday =
                    new Date().toDateString() === date.toDateString();
                  return (
                    <div key={day} className="text-center">
                      <div
                        className={`text-[10px] font-medium mb-1 ${isToday ? "text-info-text" : "text-[var(--foreground-muted)]"}`}
                      >
                        {day}
                      </div>
                      <div
                        className={`text-sm font-bold mb-2 ${isToday ? "text-info-text" : "text-[var(--foreground)]"}`}
                      >
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {posts.slice(0, 2).map((post) => (
                          <div
                            key={post.id}
                            className={`h-1.5 rounded-full ${post.status === "SCHEDULED" ? "bg-success-text" : post.status === "PUBLISHED" ? "bg-blue-500" : "bg-error-text"}`}
                          />
                        ))}
                        {posts.length > 2 && (
                          <div className="text-[8px] text-[var(--foreground-muted)]">
                            +{posts.length - 2}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {/* Scheduled Posts — moved to Calendar page */}
          <div className="hidden bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
            <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2 mb-2">
              <Clock className="w-3 h-3 text-success-text" />
              Scheduled ({scheduledPosts.length})
            </h3>
            {scheduledPosts.length === 0 ? (
              <p className="text-xs text-[var(--foreground-muted)] text-center py-4">
                No posts scheduled
              </p>
            ) : (
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {scheduledPosts.slice(0, 5).map((post) => (
                  <button
                    key={post.id}
                    onClick={() => {
                      setSelectedScheduledPost(post);
                      setShowEditScheduledModal(true);
                    }}
                    className="w-full p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--card-border)] transition-all text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-info-text">
                        {post.platform}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${post.status === "SCHEDULED" ? "bg-success-text/20 text-success-text" : "bg-[var(--surface-hover)] text-[var(--foreground-muted)]"}`}
                      >
                        {post.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--foreground-muted)] truncate mb-1">
                      {post.content}
                    </p>
                    <p className="text-[10px] text-[var(--foreground-muted)]">
                      {new Date(post.scheduled_time).toLocaleDateString()} at{" "}
                      {new Date(post.scheduled_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent Posts — moved to Calendar page */}
          <div className="hidden bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
                <ListTodo className="w-3 h-3 text-info-text" />
                Recent Posts
              </h3>
              <button
                onClick={fetchRecentPosts}
                className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <RefreshCcw className="w-3 h-3" />
              </button>
            </div>
            {recentPosts.length === 0 ? (
              <p className="text-xs text-[var(--foreground-muted)] text-center py-4">
                No posts yet
              </p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {recentPosts.map((post) => {
                  const isPub = post.status === "PUBLISHED";
                  const isFailed = post.status === "FAILED";
                  const isApproved = post.status === "APPROVED";
                  const isPending = post.status === "PENDING_REVIEW";
                  const isReturned = post.status === "RETURNED";
                  const isRejected = post.status === "REJECTED";
                  const reviewerNote = post.reviewer_feedback || post.feedback;
                  return (
                    <div
                      key={post.id}
                      className={`p-2.5 bg-[var(--surface)] border rounded-xl ${
                        isReturned ? "border-orange-500/40" : "border-[var(--border)]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-info-text uppercase">
                          {post.platform}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isPub
                              ? "bg-success-text/20 text-success-text"
                              : isFailed || isRejected
                                ? "bg-error-text/20 text-error-text"
                                : isReturned
                                  ? "bg-orange-500/20 text-orange-400"
                                  : isPending
                                    ? "bg-blue-500/20 text-blue-400"
                                    : isApproved
                                      ? "bg-warning-text/20 text-warning-text"
                                      : "bg-[var(--surface-hover)] text-[var(--foreground-muted)]"
                          }`}
                        >
                          {isPub
                            ? "PUBLISHED"
                            : isFailed
                              ? "FAILED"
                              : isRejected
                                ? "REJECTED"
                                : isReturned
                                  ? "NEEDS CHANGES"
                                  : isPending
                                    ? "IN REVIEW"
                                    : isApproved
                                      ? "APPROVED"
                                      : post.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--foreground-muted)] truncate mb-1">
                        {post.content}
                      </p>
                      {(isFailed || isReturned || isRejected) && reviewerNote && (
                        <p className={`text-[9px] rounded px-1.5 py-1 mt-1 break-words ${
                          isReturned
                            ? "text-orange-400 bg-orange-500/10"
                            : "text-error-text bg-error-text/10"
                        }`}>
                          {isReturned ? "Reviewer: " : ""}{reviewerNote}
                        </p>
                      )}
                      <p className="text-[9px] text-[var(--foreground-muted)] mt-1">
                        {new Date(post.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Scheduler */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-warning-text" />
              AI Scheduler
            </h3>

            <div className="space-y-3">
              {/* Auto-detected niche display */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2">
                <p className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-1">Detected Niche</p>
                <p className="text-xs text-[var(--foreground)] truncate">
                  {topic.trim() || description.trim().split(/\s+/).slice(0, 8).join(' ') || (
                    <span className="italic text-[var(--foreground-muted)]">Write a description first</span>
                  )}
                </p>
              </div>

              {/* Image analysis signal */}
              {hasImageAnalysis && (
                <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                  <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
                  <p className="text-[10px] text-violet-300 font-medium">Image context will be included in timing analysis</p>
                </div>
              )}

              {/* Date strip — 7 upcoming days + custom picker */}
              <div>
                <p className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-1.5">Schedule For</p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 mb-2">
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const dateStr = d.toISOString().split('T')[0];
                    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en', { weekday: 'short' });
                    return (
                      <button
                        key={dateStr}
                        onClick={() => { setSchedulerDate(dateStr); setSuggestedTimes([]); }}
                        className={`flex flex-col items-center py-1.5 rounded-lg border text-center transition-all ${
                          schedulerDate === dateStr
                            ? 'bg-warning-text/20 border-warning-border/50 text-warning-text'
                            : 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-warning-border/30 hover:text-[var(--foreground)]'
                        }`}
                      >
                        <span className="text-[8px] font-bold uppercase leading-none">{dayLabel}</span>
                        <span className="text-sm font-black leading-tight mt-0.5">{d.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Custom date picker for dates beyond the 7-day strip */}
                <input
                  type="date"
                  value={schedulerDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => {
                    if (e.target.value) {
                      setSchedulerDate(e.target.value);
                      setSuggestedTimes([]);
                    }
                  }}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-xs outline-none focus:border-warning-border/50 transition-colors"
                />
              </div>

              <select
                value={audienceRegion}
                onChange={(e) => setAudienceRegion(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-xs outline-none focus:border-warning-border/50"
              >
                <option value="Global">Global Audience</option>
                <option value="US (EST)">US (EST)</option>
                <option value="US (PST)">US (PST)</option>
                <option value="UK / Europe">UK / Europe</option>
                <option value="Asia Pacific">Asia Pacific</option>
                <option value="India">India</option>
                <option value="Australia">Australia</option>
              </select>

              <select
                value={audienceAgeGroup}
                onChange={(e) => setAudienceAgeGroup(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-xs outline-none focus:border-warning-border/50"
              >
                <option value="All Ages">All Ages</option>
                <option value="18-24">18-24 Gen Z</option>
                <option value="25-34">25-34 Millennials</option>
                <option value="35-44">35-44</option>
                <option value="Professionals">Professionals</option>
              </select>

              <button
                onClick={handleMagicSchedule}
                disabled={isFetchingRecommendations}
                className="w-full bg-warning-text hover:bg-warning-text text-zinc-900 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isFetchingRecommendations ? (
                  <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Get Best Times
              </button>
            </div>

            {suggestedTimes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
                    Best Times · {new Date(schedulerDate + 'T12:00:00').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                {suggestedTimes.map((rec, i) => (
                  <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-black text-success-text tabular-nums">
                        {rec.label}
                      </span>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] bg-success-text/20 text-success-text px-1.5 py-0.5 rounded-full font-bold">
                          {Math.round(rec.confidence_score * 100)}%
                        </span>
                        {rec.audience_time && rec.audience_timezone && (
                          <span className="text-[9px] text-[var(--foreground-muted)]">
                            {rec.audience_time} {rec.audience_timezone.split('/').pop()?.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-1 mb-2.5">
                      {(rec.reasoning_points || []).slice(0, 4).map((pt: string, j: number) => (
                        <li key={j} className="text-[10px] text-[var(--foreground-muted)] flex items-start gap-1.5 leading-relaxed">
                          <span className="text-success-text font-bold mt-0.5 shrink-0">·</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => {
                        setSelectedTime(rec.time);
                        const [datePart, timePart] = rec.time.split('T');
                        setManualScheduleDate(datePart || '');
                        setManualScheduleTime((timePart || '').slice(0, 5));
                      }}
                      className={`w-full py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                        selectedTime === rec.time
                          ? 'bg-success-text text-foreground'
                          : 'bg-success-text/20 hover:bg-success-text/40 text-success-text'
                      }`}
                    >
                      {selectedTime === rec.time ? '✓ Noted — see scheduler below' : 'Note this slot'}
                    </button>
                  </div>
                ))}
                <p className="text-[10px] text-[var(--foreground-muted)] text-center pt-1">
                  Publishing Hub posts immediately through governance. To schedule at a specific time, use the{' '}
                  <a href="/calendar" className="text-info-text hover:text-info-text underline">Calendar</a>.
                </p>
              </div>
            )}
          </div>
          {/* Manual Scheduler */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-info-text" />
              Schedule for Later
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    value={manualScheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setManualScheduleDate(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-2 text-[var(--foreground)] text-xs outline-none focus:border-info-border/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider block mb-1">Time</label>
                  <input
                    type="time"
                    value={manualScheduleTime}
                    onChange={e => setManualScheduleTime(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-2 text-[var(--foreground)] text-xs outline-none focus:border-info-border/60 transition-colors"
                  />
                </div>
              </div>

              {manualScheduleDate && manualScheduleTime && (
                <div className="bg-info-text/8 border border-info-border/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-info-text shrink-0" />
                  <p className="text-[10px] text-info-text font-medium">
                    {new Date(`${manualScheduleDate}T${manualScheduleTime}:00`).toLocaleString('en', {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {selectedAccountIds.length === 0 && (
                <p className="text-[10px] text-warning-text/80 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  Select accounts in &quot;Post To&quot; first
                </p>
              )}

              <button
                onClick={handleManualSchedule}
                disabled={submitting || !manualScheduleDate || !manualScheduleTime || selectedAccountIds.length === 0 || !canPublish}
                title={!canPublish ? "Your role cannot schedule posts" : undefined}
                className="w-full bg-info-text hover:bg-info-text text-foreground font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                Schedule Post
              </button>

              <p className="text-[9px] text-[var(--foreground-muted)] text-center leading-relaxed">
                Bypasses governance — posts directly at the selected time.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Edit Scheduled Post Modal */}
      {/* Edit Scheduled Post Modal */}
      {showEditScheduledModal && selectedScheduledPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[var(--foreground)]">
                Edit Scheduled Post
              </h3>
              <button
                onClick={() => {
                  setShowEditScheduledModal(false);
                  setSelectedScheduledPost(null);
                }}
                className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                <div className="text-xs text-[var(--foreground-muted)] mb-1">
                  Platform
                </div>
                <p className="text-[var(--foreground)] font-medium">
                  {selectedScheduledPost.platform}
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--foreground-muted)] mb-1">
                  Content
                </label>
                <textarea
                  defaultValue={selectedScheduledPost.content}
                  id="editContent"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-sm outline-none focus:border-success-border min-h-[100px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--foreground-muted)] mb-1">
                  Scheduled Time
                </label>
                <input
                  type="datetime-local"
                  defaultValue={selectedScheduledPost.scheduled_time.slice(
                    0,
                    16,
                  )}
                  id="editTime"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-sm outline-none focus:border-success-border"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    const newContent = (
                      document.getElementById(
                        "editContent",
                      ) as HTMLTextAreaElement
                    ).value;
                    const newTime = (
                      document.getElementById("editTime") as HTMLInputElement
                    ).value;
                    handleEditScheduledPost(
                      selectedScheduledPost.id,
                      newContent,
                      new Date(newTime).toISOString(),
                    );
                  }}
                  className="flex-1 bg-success-text hover:bg-success-text text-foreground font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Save Changes
                </button>
                <button
                  onClick={() =>
                    handleCancelScheduledPost(selectedScheduledPost.id)
                  }
                  className="px-6 py-3 bg-error-text/20 hover:bg-error-text/30 text-error-text font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Cancel Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default function PublishPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--foreground-muted)]">
          <div className="w-10 h-10 border-4 border-info-border border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-bold uppercase tracking-widest">
            Warming Engine...
          </p>
        </div>
      }
    >
      <PublishPageInner />
    </Suspense>
  );
}
