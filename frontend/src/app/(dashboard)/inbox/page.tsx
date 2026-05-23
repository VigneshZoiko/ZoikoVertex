"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Inbox, MessageSquare, MessageCircle, AtSign, Reply,
  Search, RefreshCcw, ChevronDown, Send, Sparkles,
  AlertTriangle, Archive, StickyNote, CheckCircle2, XCircle,
  Loader2, Shield, ArrowUpRight, ShieldAlert, X, History,
  ExternalLink, ChevronLeft, ChevronRight, Image as ImageIcon,
  Trash2, CheckSquare, Square,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostPreview {
  thumb: string | null;
  image: string | null;
  caption: string | null;
  media_type?: string | null;
  post_url: string | null;
}

interface InboxMessage {
  id: string;
  platform: string;
  sender_name: string;
  sender_handle: string;
  message_type: "DM" | "COMMENT" | "MENTION" | "REPLY";
  message_body: string;
  status: string;
  risk_level: string;
  sentiment: string;
  received_at: string;
  assigned_to: string | null;
  original_post_id?: string | null;
  is_demo?: boolean;
  replies?: InboxReply[];
  notes?: InboxNote[];
  audit?: InboxAuditEntry[];
  escalation?: InboxEscalation | null;
}

interface InboxReply {
  id: string;
  reply_body: string;
  reply_type: string;
  status: string;
  created_at: string;
  retryCount?: number;
}

interface InboxNote {
  id: string;
  note_body: string;
  created_at: string;
}

interface InboxAuditEntry {
  id: string;
  action: string;
  previous_value?: string;
  new_value?: string;
  performed_at: string;
}

interface InboxEscalation {
  id: string;
  escalation_reason: string;
  risk_category: string;
  risk_level: string;
  review_status: string;
  decision?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: "all",        label: "All" },
  { key: "unread",     label: "Unread" },
  { key: "assigned",   label: "Assigned" },
  { key: "inprogress", label: "In Progress" },
  { key: "escalation", label: "Escalated" },
  { key: "resolved",   label: "Resolved" },
  { key: "archived",   label: "Archived" },
];

const PLATFORMS = [
  { key: "",          label: "All" },
  { key: "INSTAGRAM", label: "Instagram" },
  { key: "FACEBOOK",  label: "Facebook" },
  { key: "THREADS",   label: "Threads" },
  { key: "LINKEDIN",  label: "LinkedIn" },
  { key: "TWITTER",   label: "Twitter" },
  { key: "YOUTUBE",   label: "YouTube" },
];

const AI_TONES = [
  { key: "professional", label: "Professional" },
  { key: "friendly",     label: "Friendly" },
  { key: "apologetic",   label: "Apologetic" },
  { key: "short",        label: "Short" },
  { key: "formal",       label: "Formal" },
  { key: "brand-safe",   label: "Brand-Safe" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function platformBadge(platform: string) {
  const map: Record<string, string> = { INSTAGRAM: "IG", TWITTER: "TW", LINKEDIN: "LI", FACEBOOK: "FB", THREADS: "TH", YOUTUBE: "YT" };
  return map[platform] || "—";
}

function platformColor(platform: string): string {
  switch (platform) {
    case "INSTAGRAM": return "text-pink-400 bg-pink-400/10";
    case "TWITTER":   return "text-sky-400 bg-sky-400/10";
    case "LINKEDIN":  return "text-blue-400 bg-blue-400/10";
    case "FACEBOOK":  return "text-blue-500 bg-blue-500/10";
    case "THREADS":   return "text-white bg-white/10";
    case "YOUTUBE":   return "text-red-400 bg-red-400/10";
    default:          return "text-[#888] bg-white/5";
  }
}

function statusColor(s: string): string {
  switch (s) {
    case "UNREAD":         return "text-sky-400 bg-sky-400/10 border border-sky-400/20";
    case "OPEN":           return "text-white/50 bg-white/5 border border-white/8";
    case "ASSIGNED":       return "text-yellow-400 bg-yellow-400/10 border border-yellow-400/20";
    case "IN_PROGRESS":    return "text-blue-400 bg-blue-400/10 border border-blue-400/20";
    case "ESCALATED":      return "text-red-400 bg-red-400/10 border border-red-400/20";
    case "PENDING_REVIEW": return "text-orange-400 bg-orange-400/10 border border-orange-400/20";
    case "RESOLVED":       return "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20";
    case "ARCHIVED":       return "text-[#444] bg-white/[0.03] border border-white/5";
    default:               return "text-[#666] bg-white/[0.03] border border-white/5";
  }
}

function riskColor(r: string): string {
  switch (r) {
    case "LOW":      return "text-emerald-500";
    case "MEDIUM":   return "text-yellow-400";
    case "HIGH":     return "text-red-400";
    case "CRITICAL": return "text-red-500";
    default:         return "text-[#555]";
  }
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1)  return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(n: string): string {
  return n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function isComment(msg: InboxMessage) {
  return msg.message_type === "COMMENT" || msg.message_type === "MENTION";
}

// ─── MessageListItem ──────────────────────────────────────────────────────────

function MessageListItem({
  msg, selected, checked, selectMode, onClick, onCheck,
}: {
  msg: InboxMessage; selected: boolean; checked: boolean;
  selectMode: boolean; onClick: () => void; onCheck: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={`w-full text-left px-3 py-2.5 border-b border-[#0f0f0f] transition-all duration-100 relative group ${
        selected
          ? "bg-white/[0.05] border-l-2 border-l-sky-500/80"
          : checked
          ? "bg-red-500/[0.04] border-l-2 border-l-red-500/40"
          : "border-l-2 border-l-transparent hover:bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Checkbox — always visible in selectMode, hover-visible otherwise */}
        <button
          onClick={onCheck}
          className={`flex-shrink-0 mt-1 transition-opacity ${selectMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          {checked
            ? <CheckSquare className="w-3.5 h-3.5 text-red-400" />
            : <Square className="w-3.5 h-3.5 text-[#333]" />}
        </button>

        {/* Message content — clickable to open detail */}
        <button onClick={onClick} className="flex-1 min-w-0 text-left">
          <div className="flex items-start gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 ${
              selected ? "bg-sky-500/15 text-sky-300" : "bg-[#181818] text-[#555]"
            }`}>
              {initials(msg.sender_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${platformColor(msg.platform)}`}>
                    {platformBadge(msg.platform)}
                  </span>
                  <span className="text-[11px] text-white/90 font-medium truncate">{msg.sender_name}</span>
                  {msg.status === "UNREAD" && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />}
                </div>
                <span className="text-[9px] text-[#383838] flex-shrink-0">{timeAgo(msg.received_at)}</span>
              </div>
              <p className="text-[11px] text-[#555] line-clamp-1 leading-relaxed mb-1">{msg.message_body}</p>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${statusColor(msg.status)}`}>
                  {msg.status.replace(/_/g, " ")}
                </span>
                <span className={`text-[9px] font-medium ${riskColor(msg.risk_level)}`}>{msg.risk_level}</span>
                <span className="text-[#383838] ml-auto">
                  {isComment(msg) ? <MessageCircle className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── DM Chat Bubble ───────────────────────────────────────────────────────────

const MAX_RETRIES = 5;

function DmBubble({ body, time, isMine, status, replyType, sending, retryCount, onRetry }: {
  body: string; time: string; isMine: boolean;
  status?: string; replyType?: string; sending?: boolean;
  retryCount?: number; onRetry?: () => void;
}) {
  const failed = status === "failed";
  const maxed = (retryCount ?? 0) >= MAX_RETRIES;

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[72%] flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
        <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-[1.55] ${
          isMine
            ? failed
              ? "bg-red-900/30 text-red-200/70 rounded-br-sm border border-red-500/20"
              : sending
                ? "bg-sky-700/50 text-sky-200/80 rounded-br-sm"
                : "bg-sky-600 text-white rounded-br-sm"
            : "bg-[#161616] text-[#d4d4d4] rounded-bl-sm border border-[#202020]"
        }`}>
          {body}
        </div>
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[10px] text-[#333]">{time}</span>
          {isMine && failed && (
            <>
              <X className="w-2.5 h-2.5 text-red-400/80" />
              {!maxed ? (
                <button
                  onClick={onRetry}
                  title={`Retry (${retryCount ?? 0}/${MAX_RETRIES})`}
                  className="text-[#444] hover:text-sky-400 transition-colors"
                >
                  <RefreshCcw className="w-2.5 h-2.5" />
                </button>
              ) : (
                <span className="text-[9px] text-red-400/50">max retries</span>
              )}
            </>
          )}
          {isMine && !sending && !failed && status && (status === "SENT" || status === "draft") && (
            <span className="text-[10px] text-[#333]">✓</span>
          )}
          {isMine && sending && <span className="text-[10px] text-[#383838]">…</span>}
          {isMine && replyType === "ai_draft" && <Sparkles className="w-2.5 h-2.5 text-sky-500/70" />}
        </div>
      </div>
    </div>
  );
}

// ─── Comment Thread ───────────────────────────────────────────────────────────

function CommentItem({ body, author, time, isMine, sending, replyType, status, retryCount, onRetry }: {
  body: string; author: string; time: string;
  isMine?: boolean; sending?: boolean; replyType?: string;
  status?: string; retryCount?: number; onRetry?: () => void;
}) {
  const failed = status === "failed";
  const maxed = (retryCount ?? 0) >= MAX_RETRIES;

  return (
    <div className={`flex items-start gap-2.5 ${isMine ? "ml-7" : ""}`}>
      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold mt-0.5 ${
        isMine
          ? failed ? "bg-red-500/10 text-red-300" : "bg-sky-500/15 text-sky-300"
          : "bg-[#181818] text-[#555]"
      }`}>
        {isMine ? "ME" : initials(author)}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`text-[11px] font-semibold ${isMine ? (failed ? "text-red-400/70" : "text-sky-400") : "text-[#c0c0c0]"}`}>
            {isMine ? "You" : author}
          </span>
          <span className="text-[10px] text-[#333]">{time}</span>
          {isMine && replyType === "ai_draft" && <Sparkles className="w-2.5 h-2.5 text-sky-500/70" />}
          {isMine && failed && (
            <>
              <X className="w-2.5 h-2.5 text-red-400/80" />
              {!maxed ? (
                <button
                  onClick={onRetry}
                  title={`Retry (${retryCount ?? 0}/${MAX_RETRIES})`}
                  className="text-[#444] hover:text-sky-400 transition-colors"
                >
                  <RefreshCcw className="w-2.5 h-2.5" />
                </button>
              ) : (
                <span className="text-[9px] text-red-400/50">max retries</span>
              )}
            </>
          )}
        </div>
        <p className={`text-[13px] leading-[1.55] ${
          failed ? "text-red-200/50 line-through decoration-red-500/30" : sending ? "text-[#555]" : "text-[#bbb]"
        }`}>{body}</p>
      </div>
    </div>
  );
}

// ─── Chat Skeleton ────────────────────────────────────────────────────────────

function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header skeleton */}
      <div className="border-b border-[#111] px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#181818] skeleton-shimmer flex-shrink-0" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-28 rounded bg-[#181818] skeleton-shimmer" />
            <div className="h-2 w-16 rounded bg-[#141414] skeleton-shimmer" />
          </div>
        </div>
        <div className="flex gap-1.5">
          {[1,2,3].map(i => (
            <div key={i} className="w-6 h-6 rounded-lg bg-[#141414] skeleton-shimmer" />
          ))}
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="border-b border-[#111] px-4 py-0 flex gap-5 flex-shrink-0">
        {[60, 44, 40].map((w, i) => (
          <div key={i} className="py-2.5">
            <div className="h-2.5 rounded bg-[#161616] skeleton-shimmer" style={{ width: w }} />
          </div>
        ))}
      </div>

      {/* Bubbles skeleton */}
      <div className="flex-1 overflow-hidden px-4 py-3 flex flex-col gap-4">
        {/* Incoming */}
        <div className="flex justify-start">
          <div className="h-10 w-52 rounded-2xl rounded-bl-sm bg-[#161616] skeleton-shimmer" />
        </div>
        {/* Outgoing */}
        <div className="flex justify-end">
          <div className="h-8 w-40 rounded-2xl rounded-br-sm bg-sky-900/20 skeleton-shimmer" />
        </div>
        {/* Incoming */}
        <div className="flex justify-start">
          <div className="h-14 w-64 rounded-2xl rounded-bl-sm bg-[#161616] skeleton-shimmer" />
        </div>
        {/* Outgoing */}
        <div className="flex justify-end">
          <div className="h-8 w-48 rounded-2xl rounded-br-sm bg-sky-900/20 skeleton-shimmer" />
        </div>
        {/* Incoming */}
        <div className="flex justify-start">
          <div className="h-10 w-44 rounded-2xl rounded-bl-sm bg-[#161616] skeleton-shimmer" />
        </div>
      </div>

      {/* Compose bar skeleton */}
      <div className="border-t border-[#131313] px-4 py-3 flex-shrink-0 flex items-end gap-2">
        <div className="flex-1 h-16 rounded-2xl bg-[#0e0e0e] skeleton-shimmer" />
        <div className="flex flex-col gap-1.5 pb-0.5">
          <div className="h-7 w-24 rounded-lg bg-[#141414] skeleton-shimmer" />
          <div className="h-8 w-8 rounded-xl bg-[#141414] skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

// ─── Post Context Card ────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram", FACEBOOK: "Facebook", YOUTUBE: "YouTube",
  THREADS: "Threads", TWITTER: "Twitter / X", LINKEDIN: "LinkedIn",
};

function PostContextCard({ msg, preview, loading }: { msg: InboxMessage; preview: PostPreview | null; loading: boolean }) {
  const platformLabel = PLATFORM_LABELS[msg.platform] ?? msg.platform;
  const isVideo = preview?.media_type === "VIDEO" || preview?.media_type === "REEL";

  return (
    <div className="mx-4 mt-2 mb-1 rounded-lg border border-[#161616] bg-[#0c0c0c] overflow-hidden flex-shrink-0">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#161616]">
        <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${platformColor(msg.platform)}`}>
          {platformBadge(msg.platform)}
        </span>
        <span className="text-[9px] text-[#383838] uppercase tracking-[0.1em] font-medium">
          Original {platformLabel} {isVideo ? "video" : "post"}
        </span>
        {preview?.post_url ? (
          <a
            href={preview.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[9px] text-sky-400/60 hover:text-sky-400 transition-colors"
          >
            View {isVideo ? "video" : "post"} <ExternalLink className="w-2.5 h-2.5" />
          </a>
        ) : msg.original_post_id ? (
          <span className="ml-auto text-[9px] text-[#282828] font-mono">
            {msg.original_post_id.slice(-10)}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-14 h-10 rounded-md bg-[#141414] animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 bg-[#141414] rounded animate-pulse w-3/4" />
            <div className="h-2 bg-[#141414] rounded animate-pulse w-1/2" />
          </div>
        </div>
      ) : preview?.image || preview?.thumb ? (
        <div className="flex items-start gap-3 px-3 py-2.5">
          <div className="relative flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.thumb || preview.image || ""}
              alt="Post thumbnail"
              className="w-14 h-10 rounded-md object-cover bg-[#161616]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 8 10">
                    <path d="M0 0l8 5-8 5V0z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {preview.caption && (
              <p className="text-[11px] text-[#777] leading-relaxed line-clamp-2">{preview.caption}</p>
            )}
            {preview.media_type && preview.media_type !== "TEXT" && (
              <span className="text-[9px] text-[#383838] mt-0.5 block">{preview.media_type}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-14 h-10 rounded-md bg-[#141414] border border-[#1a1a1a] flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-3.5 h-3.5 text-[#252525]" />
          </div>
          <div>
            <p className="text-[11px] text-[#444]">Preview unavailable</p>
            {msg.original_post_id && (
              <p className="text-[10px] text-[#282828] font-mono mt-0.5">{msg.original_post_id.slice(-12)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compose Bar ─────────────────────────────────────────────────────────────

function ComposeBar({
  replyBody, setReplyBody, aiTone, setAiTone,
  generatingDraft, sendingReply, lastSendStatus, lastSendError,
  onSend, onGenerateDraft, isComment: commentMode,
  senderName, platform,
}: {
  replyBody: string; setReplyBody: (v: string) => void;
  aiTone: string; setAiTone: (v: string) => void;
  generatingDraft: boolean; sendingReply: boolean;
  lastSendStatus: "sent" | "draft" | null; lastSendError: string | null;
  onSend: () => void; onGenerateDraft: () => void;
  isComment: boolean; senderName: string; platform: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSend(); }
  };

  return (
    <div className={`border-t px-4 py-3 flex-shrink-0 ${
      commentMode ? "border-[#161616] bg-[#0b0b0b]" : "border-[#131313] bg-[#080808]"
    }`}>
      {lastSendStatus === "sent" && (
        <div className="flex items-center gap-1.5 mb-2 text-[11px] text-emerald-400/80">
          <CheckCircle2 className="w-3 h-3" />
          Sent on {platform.charAt(0) + platform.slice(1).toLowerCase()}
        </div>
      )}
      {lastSendStatus === "draft" && (
        <div className="mb-2 text-[11px] text-yellow-400/70">
          Saved as draft{lastSendError ? ` — ${lastSendError}` : ""}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={commentMode ? "Reply to comment…" : `Message ${senderName}…`}
          rows={2}
          className={`flex-1 text-[13px] text-white/90 placeholder-[#333] px-3.5 py-2.5 outline-none resize-none leading-relaxed transition-colors ${
            commentMode
              ? "bg-[#111] border border-[#1d1d1d] rounded-xl focus:border-[#2a2a2a]"
              : "bg-[#0e0e0e] border border-[#1a1a1a] rounded-2xl focus:border-sky-600/25"
          }`}
        />

        <div className="flex flex-col gap-1.5 flex-shrink-0 pb-0.5">
          <div className="flex items-center gap-1">
            <div className="relative">
              <select
                value={aiTone}
                onChange={e => setAiTone(e.target.value)}
                className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-lg text-[10px] text-[#555] px-2 py-1.5 pr-5 appearance-none outline-none"
              >
                {AI_TONES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-[#383838] pointer-events-none" />
            </div>
            <button
              onClick={onGenerateDraft}
              disabled={generatingDraft}
              title="AI draft"
              className="p-1.5 rounded-lg text-sky-400/60 bg-sky-400/5 border border-sky-400/10 hover:bg-sky-400/10 hover:text-sky-400 transition-colors disabled:opacity-30"
            >
              {generatingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={onSend}
            disabled={sendingReply || !replyBody.trim()}
            title="Send (⌘↵)"
            className={`flex items-center justify-center p-2 rounded-xl transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${
              commentMode
                ? "bg-[#161616] hover:bg-[#1e1e1e] border border-[#222] text-[#777] hover:text-white"
                : "bg-sky-600 hover:bg-sky-500 text-white"
            }`}
          >
            {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <p className="text-[9px] text-[#252525] mt-1.5">⌘↵ to send · {replyBody.length}/5000</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [tab, setTab] = useState("all");
  const [platform, setPlatform] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; message: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InboxMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [postPreview, setPostPreview] = useState<PostPreview | null>(null);
  const [postPreviewLoading, setPostPreviewLoading] = useState(false);

  const [replyBody, setReplyBody] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [aiDraft, setAiDraft] = useState("");
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [lastSendStatus, setLastSendStatus] = useState<"sent" | "draft" | null>(null);
  const [lastSendError, setLastSendError] = useState<string | null>(null);

  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [escalateReason, setEscalateReason] = useState("");
  const [escalateCategory, setEscalateCategory] = useState("SENSITIVE_CONTENT");
  const [escalating, setEscalating] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);

  const [replyTab, setReplyTab] = useState<"compose" | "notes" | "audit">("compose");

  const threadBottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    threadBottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getInboxMessages({ tab, platform, search: debouncedSearch });
      setMessages(res.data || []);
      setTotal(res.total ?? 0);
      setIsDemo(res.is_demo || false);
    } catch (e: unknown) {
      setMessages([]);
      setTotal(0);
      setError(e instanceof Error ? e.message : "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }, [tab, platform, debouncedSearch]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (detail) scrollToBottom(false); }, [detail?.id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (detail?.replies?.length) scrollToBottom(true); }, [detail?.replies?.length]);

  useEffect(() => {
    const previewablePlatforms = ["INSTAGRAM", "FACEBOOK", "YOUTUBE", "THREADS", "TWITTER", "LINKEDIN"];
    if (!detail || !isComment(detail) || !detail.original_post_id || isDemo || !previewablePlatforms.includes(detail.platform)) {
      setPostPreview(null);
      return;
    }
    setPostPreviewLoading(true);
    setPostPreview(null);
    api.getInboxPostPreview(detail.id)
      .then(res => { if (res.preview) setPostPreview(res.preview); })
      .catch(() => {})
      .finally(() => setPostPreviewLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id, isDemo]);

  const selectMessage = useCallback(async (id: string) => {
    if (selectedId !== id) {
      setSelectedId(id);
      setReplyBody("");
      setAiDraft("");
      setLastSendStatus(null);
      setLastSendError(null);
    }
    setDetailLoading(true);
    try {
      const res = await api.getInboxMessage(id);
      setDetail(res.data);
      setMessages(prev => prev.map(m => m.id === id && m.status === "UNREAD" ? { ...m, status: "OPEN" } : m));
    } catch {
      const found = messages.find(m => m.id === id);
      if (found) setDetail(found);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedId, messages]);

  const handleGenerateDraft = async () => {
    if (!selectedId) return;
    setGeneratingDraft(true);
    try {
      const res = await api.generateAiDraft(selectedId, aiTone);
      const draft = res.data?.draft || "";
      setAiDraft(draft);
      setReplyBody(draft);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedId || !replyBody.trim() || !detail) return;
    const body = replyBody.trim();
    const isAi = !!aiDraft;
    setSendingReply(true);
    setLastSendStatus(null);
    setLastSendError(null);
    const optimistic: InboxReply = {
      id: `tmp-${Date.now()}`,
      reply_body: body,
      reply_type: isAi ? "ai_draft" : "manual",
      status: "sending",
      created_at: new Date().toISOString(),
    };
    setDetail(prev => prev ? { ...prev, replies: [...(prev.replies || []), optimistic] } : prev);
    setReplyBody("");
    setAiDraft("");

    try {
      const res = await api.createInboxReply(selectedId, {
        reply_body: body,
        reply_type: isAi ? "ai_draft" : "manual",
      });
      setLastSendStatus(res.sent === true || res.data?.status === "sent" ? "sent" : "draft");
      if (res.meta_error) setLastSendError(res.meta_error);
      const confirmed: InboxReply = {
        id: res.data?.id || optimistic.id,
        reply_body: body,
        reply_type: isAi ? "ai_draft" : "manual",
        status: res.data?.status || "SENT",
        created_at: new Date().toISOString(),
      };
      setDetail(prev => prev ? {
        ...prev,
        replies: (prev.replies || []).map(r => r.id === optimistic.id ? confirmed : r),
        status: prev.status === "UNREAD" ? "IN_PROGRESS" : prev.status,
      } : prev);
      setMessages(prev => prev.map(m =>
        m.id === selectedId && m.status === "UNREAD" ? { ...m, status: "IN_PROGRESS" } : m
      ));
    } catch {
      setDetail(prev => prev ? {
        ...prev,
        replies: (prev.replies || []).map(r =>
          r.id === optimistic.id ? { ...r, status: "failed", retryCount: 0 } : r
        ),
      } : prev);
    } finally {
      setSendingReply(false);
    }
  };

  const handleRetry = useCallback(async (replyId: string) => {
    if (!selectedId || !detail) return;
    const reply = detail.replies?.find(r => r.id === replyId);
    if (!reply || (reply.retryCount ?? 0) >= MAX_RETRIES) return;

    setDetail(prev => prev ? {
      ...prev,
      replies: (prev.replies || []).map(r =>
        r.id === replyId ? { ...r, status: "sending" } : r
      ),
    } : prev);

    try {
      const res = await api.createInboxReply(selectedId, {
        reply_body: reply.reply_body,
        reply_type: reply.reply_type,
      });
      const confirmed: InboxReply = {
        id: res.data?.id || replyId,
        reply_body: reply.reply_body,
        reply_type: reply.reply_type,
        status: res.data?.status || "SENT",
        created_at: reply.created_at,
      };
      setDetail(prev => prev ? {
        ...prev,
        replies: (prev.replies || []).map(r => r.id === replyId ? confirmed : r),
        status: prev.status === "UNREAD" ? "IN_PROGRESS" : prev.status,
      } : prev);
    } catch {
      setDetail(prev => prev ? {
        ...prev,
        replies: (prev.replies || []).map(r =>
          r.id === replyId
            ? { ...r, status: "failed", retryCount: (r.retryCount ?? 0) + 1 }
            : r
        ),
      } : prev);
    }
  }, [selectedId, detail]);

  const handleAddNote = async () => {
    if (!selectedId || !noteBody.trim()) return;
    setSavingNote(true);
    try {
      await api.addInboxNote(selectedId, noteBody);
      setNoteBody("");
      const res = await api.getInboxMessage(selectedId);
      setDetail(res.data);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setSavingNote(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedId || !escalateReason.trim()) return;
    setEscalating(true);
    try {
      await api.escalateInboxMessage(selectedId, { escalation_reason: escalateReason, risk_category: escalateCategory });
      setShowEscalate(false);
      setEscalateReason("");
      setMessages(prev => prev.map(m => m.id === selectedId ? { ...m, status: "ESCALATED" } : m));
      const res = await api.getInboxMessage(selectedId);
      setDetail(res.data);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setEscalating(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedId) return;
    try {
      await api.archiveInboxMessage(selectedId);
      setMessages(prev => prev.filter(m => m.id !== selectedId));
      setSelectedId(null); setDetail(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedId) return;
    try {
      await api.updateInboxMessageStatus(selectedId, status);
      setDetail(prev => prev ? { ...prev, status } : prev);
      setMessages(prev => prev.map(m => m.id === selectedId ? { ...m, status } : m));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.syncInboxMessages();
      if (res.debug?.length) console.debug('[Inbox sync debug]', res.debug);
      if (res.errors?.length) console.warn('[Inbox sync errors]', res.errors);
      setSyncResult({ synced: res.synced ?? 0, message: res.message || 'Sync complete' });
      if ((res.synced ?? 0) > 0) await fetchMessages();
      setTimeout(() => setSyncResult(null), 4000);
    } catch (e: unknown) {
      setSyncResult({ synced: 0, message: e instanceof Error ? e.message : "Sync failed" });
      setTimeout(() => setSyncResult(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    if (!selectMode) setSelectMode(true);
  };

  const handleDeleteSelected = async () => {
    if (checkedIds.size === 0) return;
    if (!confirm(`Delete ${checkedIds.size} message${checkedIds.size > 1 ? "s" : ""} from inbox? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteInboxMessages(Array.from(checkedIds));
      setMessages(prev => prev.filter(m => !checkedIds.has(m.id)));
      setTotal(prev => Math.max(0, prev - checkedIds.size));
      if (checkedIds.has(selectedId ?? "")) {
        setSelectedId(null);
        setDetail(null);
      }
      setCheckedIds(new Set());
      setSelectMode(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const commentMode = detail ? isComment(detail) : false;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-[#080808] overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-[#111] px-5 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-sky-500/10 flex items-center justify-center">
            <Inbox className="w-3.5 h-3.5 text-sky-400/80" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-[13px] font-semibold text-white/90 tracking-tight">Inbox</h1>
            <span className="text-[10px] text-[#383838]">
              {loading ? "…" : `${total} message${total !== 1 ? "s" : ""}${isDemo ? " · demo" : ""}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDemo && (
            <span className="text-[9px] text-yellow-400/60 bg-yellow-400/5 border border-yellow-400/10 px-2 py-1 rounded-full tracking-wide uppercase">
              Demo
            </span>
          )}
          {syncResult && (
            <span className="text-[9px] text-emerald-400/60 px-2 py-1 rounded-lg border border-emerald-400/10 bg-emerald-400/5 max-w-[220px] truncate">
              {syncResult.message}
            </span>
          )}
          {isDemo ? (
            <button
              onClick={fetchMessages}
              className="flex items-center gap-1.5 text-[11px] text-[#444] hover:text-[#888] bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCcw className="w-3 h-3" />
              Reload
            </button>
          ) : (
            <button
              onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 text-[11px] text-sky-400/60 hover:text-sky-400 bg-sky-400/[0.04] hover:bg-sky-400/10 border border-sky-400/10 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-30"
            >
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
              {syncing ? "Syncing…" : "Sync"}
            </button>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Filter Panel ──────────────────────────────────────────────────── */}
        <div className={`border-r border-[#111] flex flex-col flex-shrink-0 overflow-hidden transition-all duration-200 ${filtersOpen ? "w-44" : "w-0"}`}>
          <div className="w-44 flex flex-col h-full overflow-y-auto">
            <div className="px-3 py-2 border-b border-[#111]">
              <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-[#161616] rounded-lg px-2.5 py-1.5">
                <Search className="w-3 h-3 text-[#303030]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="bg-transparent text-[11px] text-white/80 placeholder-[#303030] outline-none flex-1 w-0"
                />
              </div>
            </div>

            <div className="px-2 py-2 border-b border-[#111]">
              <p className="text-[8px] uppercase tracking-[0.14em] text-[#2e2e2e] px-1.5 mb-1.5 font-medium">Status</p>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`w-full text-left text-[11px] px-2 py-1.5 rounded-md transition-colors ${
                    tab === t.key ? "text-white/90 bg-white/[0.05]" : "text-[#3a3a3a] hover:text-[#999] hover:bg-white/[0.02]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="px-2 py-2">
              <p className="text-[8px] uppercase tracking-[0.14em] text-[#2e2e2e] px-1.5 mb-1.5 font-medium">Platform</p>
              {PLATFORMS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPlatform(p.key)}
                  className={`w-full text-left text-[11px] px-2 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
                    platform === p.key ? "text-white/90 bg-white/[0.05]" : "text-[#3a3a3a] hover:text-[#999] hover:bg-white/[0.02]"
                  }`}
                >
                  {p.key && (
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${platformColor(p.key)}`}>
                      {platformBadge(p.key)}
                    </span>
                  )}
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Message List ────────────────────────────────────────────────────── */}
        <div className="w-64 border-r border-[#111] flex flex-col flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#111]">
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className="p-1 rounded-md text-[#2a2a2a] hover:text-[#888] hover:bg-white/[0.03] transition-colors flex-shrink-0"
              title={filtersOpen ? "Hide filters" : "Show filters"}
            >
              {filtersOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {checkedIds.size > 0 ? (
              <>
                <span className="text-[9px] text-red-400/80 font-medium">{checkedIds.size} selected</span>
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="ml-auto flex items-center gap-1 text-[9px] text-red-400/70 hover:text-red-400 bg-red-400/[0.06] hover:bg-red-400/10 border border-red-400/10 px-2 py-1 rounded-md transition-colors disabled:opacity-40"
                >
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  {deleting ? "Deleting…" : "Delete"}
                </button>
                <button
                  onClick={() => { setCheckedIds(new Set()); setSelectMode(false); }}
                  className="p-1 text-[#333] hover:text-[#888] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <>
                <span className="text-[9px] text-[#2e2e2e] font-medium uppercase tracking-[0.14em]">Messages</span>
                {!loading && total > 0 && (
                  <span className="text-[9px] text-[#2e2e2e] tabular-nums">{total}</span>
                )}
                {!loading && messages.length > 0 && (
                  <button
                    onClick={() => setSelectMode(v => !v)}
                    title="Select messages"
                    className={`ml-auto p-1 rounded transition-colors ${selectMode ? "text-sky-400" : "text-[#2a2a2a] hover:text-[#888]"}`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-4 h-4 text-[#2a2a2a] animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
                <XCircle className="w-4 h-4 text-red-400/40" />
                <span className="text-[11px] text-[#444]">{error}</span>
                <button onClick={fetchMessages} className="text-[11px] text-sky-400/60 hover:text-sky-400">Retry</button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
                <Inbox className="w-5 h-5 text-[#1e1e1e]" />
                <span className="text-[11px] text-[#383838]">No messages</span>
              </div>
            ) : (
              messages.map(msg => (
                <MessageListItem
                  key={msg.id}
                  msg={msg}
                  selected={selectedId === msg.id}
                  checked={checkedIds.has(msg.id)}
                  selectMode={selectMode}
                  onClick={() => selectMessage(msg.id)}
                  onCheck={(e) => toggleCheck(msg.id, e)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Detail Panel ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden relative">

          {!selectedId ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.02] border border-[#131313] flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-[#1e1e1e]" />
              </div>
              <p className="text-[11px] text-[#2e2e2e]">Select a message to view the conversation</p>
            </div>
          ) : detailLoading ? (
            <ChatSkeleton />
          ) : detail ? (
            <div key={selectedId} className="chat-enter flex flex-col h-full overflow-hidden">

              {/* ── Conversation header ───────────────────────────────────── */}
              <div className={`border-b px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0 ${
                commentMode ? "border-[#131313] bg-[#0a0a0a]" : "border-[#111]"
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                    commentMode ? "bg-[#161616] text-[#555]" : "bg-[#181818] text-[#777]"
                  }`}>
                    {initials(detail.sender_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-white/90 tracking-tight">{detail.sender_name}</span>
                      {detail.sender_handle && (
                        <span className="text-[10px] text-[#333] truncate max-w-[100px]">{detail.sender_handle}</span>
                      )}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${platformColor(detail.platform)}`}>
                        {platformBadge(detail.platform)}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${statusColor(detail.status)}`}>
                        {detail.status.replace(/_/g, " ")}
                      </span>
                      {commentMode && (
                        <span className="flex items-center gap-1 text-[9px] text-[#383838]">
                          <MessageCircle className="w-2.5 h-2.5" /> Comment
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={`text-[10px] font-medium ${riskColor(detail.risk_level)}`}>{detail.risk_level}</span>
                      <span className="text-[10px] text-[#2e2e2e]">{timeAgo(detail.received_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {detail.status !== "ESCALATED" && detail.status !== "RESOLVED" && detail.status !== "ARCHIVED" && !isDemo && (
                    <button
                      onClick={() => setShowEscalate(true)}
                      className="p-1.5 rounded-lg text-red-400/40 hover:text-red-400/80 hover:bg-red-400/5 border border-transparent hover:border-red-400/10 transition-colors"
                      title="Escalate"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {detail.status !== "RESOLVED" && !isDemo && (
                    <button
                      onClick={() => handleStatusChange("RESOLVED")}
                      className="p-1.5 rounded-lg text-emerald-400/40 hover:text-emerald-400/80 hover:bg-emerald-400/5 border border-transparent hover:border-emerald-400/10 transition-colors"
                      title="Resolve"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!isDemo && (
                    <button
                      onClick={handleArchive}
                      className="p-1.5 rounded-lg text-[#2a2a2a] hover:text-[#888] hover:bg-white/[0.04] transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedId(null); setDetail(null); }}
                    className="p-1.5 rounded-lg text-[#2a2a2a] hover:text-[#888] hover:bg-white/[0.04] transition-colors"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Tab bar ────────────────────────────────────────────────── */}
              <div className={`border-b px-4 flex-shrink-0 ${commentMode ? "border-[#131313] bg-[#0a0a0a]" : "border-[#111]"}`}>
                <div className="flex gap-5">
                  {[
                    { key: "compose", label: commentMode ? "Thread" : "Chat",  icon: commentMode ? <MessageCircle className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" /> },
                    { key: "notes",   label: "Notes",  icon: <StickyNote className="w-3 h-3" /> },
                    { key: "audit",   label: "Audit",  icon: <History className="w-3 h-3" /> },
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => setReplyTab(t.key as typeof replyTab)}
                      className={`flex items-center gap-1.5 text-[11px] py-2.5 border-b-2 transition-colors ${
                        replyTab === t.key
                          ? "text-white/80 border-sky-500/70"
                          : "text-[#333] border-transparent hover:text-[#666]"
                      }`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Compose / Thread tab ───────────────────────────────────── */}
              {replyTab === "compose" && (
                <>
                  {commentMode && (
                    <PostContextCard
                      msg={detail}
                      preview={postPreview}
                      loading={postPreviewLoading}
                    />
                  )}

                  {detail.escalation && detail.status === "ESCALATED" && (
                    <div className="mx-4 mt-2 bg-red-400/[0.04] border border-red-400/10 rounded-lg px-3 py-2 flex-shrink-0">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-red-400/60 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[11px] font-medium text-red-400/70">{detail.escalation.escalation_reason}</p>
                          <p className="text-[10px] text-[#383838] mt-0.5">{detail.escalation.risk_category} · {detail.escalation.review_status}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`flex-1 overflow-y-auto px-4 py-3 ${commentMode ? "space-y-3" : ""}`}>

                    {commentMode ? (
                      <>
                        <CommentItem
                          body={detail.message_body}
                          author={detail.sender_name}
                          time={timeAgo(detail.received_at)}
                        />
                        {(detail.replies?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-2 pl-8">
                            <div className="flex-1 border-t border-[#161616]" />
                            <span className="text-[9px] text-[#282828]">
                              {detail.replies!.length} {detail.replies!.length === 1 ? "reply" : "replies"}
                            </span>
                            <div className="flex-1 border-t border-[#161616]" />
                          </div>
                        )}
                        {detail.replies?.map(r => (
                          <CommentItem
                            key={r.id}
                            body={r.reply_body}
                            author="You"
                            time={timeAgo(r.created_at)}
                            isMine
                            sending={r.status === "sending"}
                            replyType={r.reply_type}
                            status={r.status}
                            retryCount={r.retryCount}
                            onRetry={() => handleRetry(r.id)}
                          />
                        ))}
                      </>
                    ) : (
                      <>
                        <DmBubble
                          body={detail.message_body}
                          time={timeAgo(detail.received_at)}
                          isMine={false}
                        />
                        {detail.replies?.map(r => (
                          <DmBubble
                            key={r.id}
                            body={r.reply_body}
                            time={timeAgo(r.created_at)}
                            isMine={true}
                            status={r.status}
                            replyType={r.reply_type}
                            sending={r.status === "sending"}
                            retryCount={r.retryCount}
                            onRetry={() => handleRetry(r.id)}
                          />
                        ))}
                      </>
                    )}

                    {detail.is_demo && (
                      <div className="flex justify-center mt-3">
                        <span className="text-[9px] text-yellow-400/40 border border-yellow-400/10 px-3 py-1 rounded-full">
                          Demo — Upgrade to Growth for real messages
                        </span>
                      </div>
                    )}

                    <div ref={threadBottomRef} />
                  </div>

                  {detail.status === "ESCALATED" ? (
                    <div className="border-t border-[#111] px-4 py-3 flex items-center gap-2 text-[11px] text-[#333] flex-shrink-0">
                      <Shield className="w-3 h-3 text-red-400/40" />
                      Reply locked — awaiting escalation review
                    </div>
                  ) : isDemo ? (
                    <div className="border-t border-[#111] px-4 py-3 flex items-center gap-2 text-[11px] text-[#333] flex-shrink-0">
                      <ArrowUpRight className="w-3 h-3 text-yellow-400/40" />
                      Upgrade to Growth to reply
                    </div>
                  ) : (
                    <ComposeBar
                      replyBody={replyBody}
                      setReplyBody={setReplyBody}
                      aiTone={aiTone}
                      setAiTone={setAiTone}
                      generatingDraft={generatingDraft}
                      sendingReply={sendingReply}
                      lastSendStatus={lastSendStatus}
                      lastSendError={lastSendError}
                      onSend={handleSendReply}
                      onGenerateDraft={handleGenerateDraft}
                      isComment={commentMode}
                      senderName={detail.sender_name}
                      platform={detail.platform}
                    />
                  )}
                </>
              )}

              {/* ── Notes tab ──────────────────────────────────────────────── */}
              {replyTab === "notes" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                    {detail.notes?.length ? detail.notes.map(n => (
                      <div key={n.id} className="bg-yellow-400/[0.02] border border-yellow-400/[0.06] rounded-lg px-3 py-2.5">
                        <p className="text-[12px] text-[#aaa] leading-relaxed">{n.note_body}</p>
                        <p className="text-[10px] text-[#2e2e2e] mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    )) : (
                      <p className="text-[11px] text-[#2e2e2e] text-center py-8">No notes yet</p>
                    )}
                  </div>
                  {!isDemo && (
                    <div className="border-t border-[#111] px-4 py-3 flex gap-2 items-end flex-shrink-0">
                      <textarea
                        value={noteBody}
                        onChange={e => setNoteBody(e.target.value)}
                        placeholder="Internal note…"
                        rows={2}
                        className="flex-1 bg-[#0d0d0d] border border-[#161616] rounded-xl text-[12px] text-white/80 placeholder-[#2e2e2e] px-3 py-2 outline-none resize-none focus:border-yellow-500/15 transition-colors leading-relaxed"
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={savingNote || !noteBody.trim()}
                        className="p-2 rounded-xl bg-yellow-600/[0.08] hover:bg-yellow-600/15 border border-yellow-600/15 text-yellow-400/50 hover:text-yellow-400/80 transition-colors disabled:opacity-25"
                      >
                        {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <StickyNote className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Audit tab ──────────────────────────────────────────────── */}
              {replyTab === "audit" && (
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {detail.audit?.length ? detail.audit.map(entry => (
                    <div key={entry.id} className="flex items-start gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-[#222] mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] text-[#666]">{entry.action}</p>
                        {(entry.previous_value || entry.new_value) && (
                          <p className="text-[10px] text-[#333] mt-0.5">{entry.previous_value} → {entry.new_value}</p>
                        )}
                        <p className="text-[10px] text-[#252525] mt-0.5">{timeAgo(entry.performed_at)}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-[11px] text-[#2e2e2e] text-center py-8">No audit trail yet</p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Escalation modal ────────────────────────────────────────────────── */}
      {showEscalate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[#0c0c0c] border border-[#161616] rounded-xl p-5 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400/60" />
                <h3 className="text-[13px] font-semibold text-white/90">Escalate</h3>
              </div>
              <button onClick={() => setShowEscalate(false)} className="text-[#2e2e2e] hover:text-white/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-[#444] mb-1.5 block uppercase tracking-[0.12em]">Category</label>
                <select
                  value={escalateCategory}
                  onChange={e => setEscalateCategory(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#161616] rounded-lg text-[12px] text-white/80 px-3 py-2 outline-none"
                >
                  <option value="SENSITIVE_CONTENT">Sensitive Content</option>
                  <option value="LEGAL_RISK">Legal Risk</option>
                  <option value="BRAND_SAFETY">Brand Safety</option>
                  <option value="HARASSMENT">Harassment</option>
                  <option value="CRISIS_MANAGEMENT">Crisis Management</option>
                  <option value="COMPLIANCE">Compliance</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] text-[#444] mb-1.5 block uppercase tracking-[0.12em]">Reason</label>
                <textarea
                  value={escalateReason}
                  onChange={e => setEscalateReason(e.target.value)}
                  placeholder="Describe the escalation reason…"
                  rows={3}
                  className="w-full bg-[#0d0d0d] border border-[#161616] rounded-lg text-[12px] text-white/80 placeholder-[#2e2e2e] px-3 py-2.5 outline-none resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setShowEscalate(false)}
                  className="text-[11px] text-[#444] hover:text-white/70 px-3 py-1.5 rounded-lg border border-[#161616] hover:bg-white/[0.04] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEscalate}
                  disabled={escalating || !escalateReason.trim()}
                  className="flex items-center gap-1.5 text-[11px] text-white/90 bg-red-700/80 hover:bg-red-600/80 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30"
                >
                  {escalating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                  {escalating ? "Escalating…" : "Escalate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
