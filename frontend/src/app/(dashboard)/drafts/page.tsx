"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Edit3,
  FileText,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Globe,
  Clock,
  Calendar,
  ImageIcon,
  Video,
  MoreHorizontal,
  Eye,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useRoleContext } from "@/lib/context/RoleContext";

// ── Types ──────────────────────────────────────────────────────────────────
interface Draft {
  id: string;
  title: string;
  topic: string;
  content_type: string;
  universal_caption: string;
  platform_captions: Record<string, string>;
  media_urls: string[];
  media_type: string | null;
  target_account_ids: string[];
  status: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  ai_tone: string;
  ai_length: string;
  metrics: { viral_score?: number; sentiment_score?: number } | null;
}

// ── Format helpers ─────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getCaptionPreview(draft: Draft): string {
  if (draft.universal_caption) return draft.universal_caption.slice(0, 120);
  const platformCaps = Object.values(draft.platform_captions).filter(Boolean);
  if (platformCaps.length > 0) return platformCaps[0].slice(0, 120);
  if (draft.topic) return draft.topic.slice(0, 120);
  return "No content yet";
}

function getPlatformNames(draft: Draft): string[] {
  return Object.keys(draft.platform_captions).filter(
    (p) => draft.platform_captions[p]?.trim().length > 0
  );
}

// ── DraftCard component ────────────────────────────────────────────────────
function DraftCard({
  draft,
  onDelete,
  onLoadIntoPublisher,
}: {
  draft: Draft;
  onDelete: (id: string) => void;
  onLoadIntoPublisher: (draft: Draft) => void;
}) {
  const hasMedia = draft.media_urls && draft.media_urls.length > 0;
  const platforms = getPlatformNames(draft);
  const caption = getCaptionPreview(draft);
  const hasImage =
    hasMedia &&
    (!draft.media_type || draft.media_type === "image");
  const hasVideo = draft.media_type === "video";

  return (
    <div className="group bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--card-border)] hover:shadow-lg hover:shadow-black/5 transition-all duration-200">
      {/* Media preview strip */}
      {hasMedia && (
        <div className="relative h-32 bg-[var(--surface)] overflow-hidden">
          {hasVideo ? (
            <video
              src={draft.media_urls[0]}
              preload="metadata"
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="relative w-full h-full">
              <Image
                src={draft.media_urls[0]}
                alt="preview"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
            </div>
          )}
          {draft.media_urls.length > 1 && (
            <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
              +{draft.media_urls.length - 1}
            </span>
          )}
          {hasVideo && (
            <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
              <Video className="w-3 h-3" />
              Video
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-[var(--foreground)] truncate">
              {draft.title || draft.topic || "Untitled Draft"}
            </h3>
            {draft.title && draft.topic && (
              <p className="text-[10px] text-[var(--foreground-muted)] truncate mt-0.5">
                {draft.topic}
              </p>
            )}
          </div>
          <span className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[9px] font-black uppercase tracking-widest text-[var(--foreground-muted)] shrink-0">
            {draft.content_type}
          </span>
        </div>

        {/* Caption preview */}
        {caption && (
          <p className="text-xs text-[var(--foreground-muted)] leading-relaxed line-clamp-2">
            {caption}
          </p>
        )}

        {/* Platform tags */}
        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {platforms.slice(0, 4).map((p) => (
              <span
                key={p}
                className="px-2 py-0.5 bg-info-text/10 text-info-text border border-info-border/20 rounded-full text-[9px] font-bold uppercase"
              >
                {p}
              </span>
            ))}
            {platforms.length > 4 && (
              <span className="px-2 py-0.5 bg-[var(--surface)] text-[var(--foreground-muted)] rounded-full text-[9px] font-bold">
                +{platforms.length - 4}
              </span>
            )}
          </div>
        )}

        {/* AI metrics */}
        {draft.metrics?.viral_score && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[var(--foreground-muted)] uppercase tracking-wider font-bold">
                Viral
              </span>
              <div className="w-16 h-1.5 bg-[var(--surface)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-info-text rounded-full"
                  style={{ width: `${draft.metrics.viral_score}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/50">
          <div className="flex items-center gap-2 text-[10px] text-[var(--foreground-muted)]">
            <Clock className="w-3 h-3" />
            <span>{timeAgo(draft.updated_at)}</span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onLoadIntoPublisher(draft)}
              title="Open in Publisher"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-info-text/10 text-info-text hover:bg-info-text/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(draft.id)}
              title="Delete draft"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-error-text/10 text-error-text hover:bg-error-text/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DraftsPage ─────────────────────────────────────────────────────────────
export default function DraftsPage() {
  const router = useRouter();
  const { role } = useRoleContext();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDrafts = useCallback(async () => {
    try {
      const result = await api.get("/api/v1/drafts");
      if (result.success && result.data) {
        setDrafts(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch drafts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("drafts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "publish_drafts" },
        () => {
          fetchDrafts();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDrafts]);

  const handleDelete = async (id: string) => {
    try {
      const result = await api.delete(`/api/v1/drafts/${id}`);
      if (result.success) {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
        setMessage({ type: "success", text: "Draft deleted" });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to delete draft" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete draft" });
    }
  };

  const handleLoadIntoPublisher = (draft: Draft) => {
    // Construct URL params to prefill the publishing hub
    const params = new URLSearchParams();
    if (draft.topic) params.set("topic", draft.topic);
    if (draft.universal_caption) params.set("caption", draft.universal_caption);
    if (draft.media_urls.length > 0) {
      params.set("assetUrls", JSON.stringify(draft.media_urls));
      params.set("assetType", draft.media_type || "image");
    }
    if (draft.target_account_ids.length > 0) {
      params.set("accountIds", JSON.stringify(draft.target_account_ids));
    }
    params.set("draftId", draft.id);

    // Navigate to publisher with draft data
    router.push(`/publish?${params.toString()}`);
  };

  // Filter drafts by search
  const filteredDrafts = drafts.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.title && d.title.toLowerCase().includes(q)) ||
      (d.topic && d.topic.toLowerCase().includes(q)) ||
      (d.universal_caption && d.universal_caption.toLowerCase().includes(q)) ||
      Object.values(d.platform_captions).some((v) =>
        v.toLowerCase().includes(q)
      )
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--foreground-muted)] space-y-4">
        <div className="w-10 h-10 border-4 border-info-border border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold uppercase tracking-widest animate-pulse">
          Loading drafts...
        </p>
      </div>
    );
  }

  const activeDrafts = filteredDrafts.filter((d) => d.status === "ACTIVE");

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 border-b border-[var(--border)] pb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-info-text/10 border border-info-border/20 flex items-center justify-center">
            <Edit3 className="w-6 h-6 text-info-text" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
              Drafts
            </h1>
            <p className="text-[var(--foreground-muted)] text-sm mt-1 font-medium">
              {activeDrafts.length} saved draft{activeDrafts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drafts..."
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-info-border transition-colors"
            />
          </div>

          <Link
            href="/publish"
            className="flex items-center gap-2 px-4 py-2.5 bg-info-text text-foreground rounded-xl text-xs font-bold hover:bg-info-text transition-all"
          >
            <FileText className="w-4 h-4" />
            New Post
          </Link>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in duration-300 ${
            message.type === "success"
              ? "bg-success-text/10 border border-success-border/20 text-success-text"
              : "bg-error-text/10 border border-error-border/20 text-error-text"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Drafts Grid */}
      {filteredDrafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-4">
            <Edit3 className="w-8 h-8 text-[var(--foreground-muted)] opacity-40" />
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">
            {searchQuery ? "No drafts match your search" : "No drafts yet"}
          </h3>
          <p className="text-sm text-[var(--foreground-muted)] mt-1 max-w-md">
            {searchQuery
              ? "Try a different search term."
              : "Save your work-in-progress posts from the Publishing Hub and come back to them later."}
          </p>
          {!searchQuery && (
            <Link
              href="/publish"
              className="mt-6 px-6 py-3 bg-info-text text-foreground rounded-xl text-sm font-bold hover:bg-info-text transition-all"
            >
              Go to Publishing Hub
            </Link>
          )}
        </div>
      ) : (
        <>
          {activeDrafts.length > 0 && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeDrafts.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    onDelete={handleDelete}
                    onLoadIntoPublisher={handleLoadIntoPublisher}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


