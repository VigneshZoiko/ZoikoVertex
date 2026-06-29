"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Inbox, MessageSquare, MessageCircle, AtSign, Reply,
  Search, RefreshCcw, ChevronDown, Send, Sparkles,
  AlertTriangle, Archive, StickyNote, CheckCircle2, XCircle,
  Loader2, Shield, ArrowUpRight, ShieldAlert, X, History,
  ExternalLink, ChevronLeft, ChevronRight, Image as ImageIcon,
  Trash2, CheckSquare, Square, Settings, Plus, Pencil, ToggleLeft, ToggleRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useRoleContext } from "@/lib/context/RoleContext";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import Toast from "@/components/Toast";

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
  recipient_account_handle?: string | null;
  recipient_account_name?: string | null;
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

interface AutoReplyRule {
  id: string;
  rule_name: string;
  keywords: string[];
  reply_body: string;
  is_active: boolean;
  is_case_sensitive: boolean;
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
  decision_note?: string | null;
  is_auto_escalated?: boolean;
  resolved_by?: string | null;
  resolved_by_name?: string | null;
  assigned_reviewer?: string | null;
  assigned_reviewer_name?: string | null;
  escalated_by_name?: string | null;
  resolved_at?: string | null;
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
    case "THREADS":   return "text-foreground bg-surface";
    case "YOUTUBE":   return "text-red-400 bg-red-400/10";
    default:          return "text-foreground-muted bg-surface";
  }
}

function statusColor(s: string): string {
  switch (s) {
    case "UNREAD":         return "text-info-text bg-info-bg border border-info-border";
    case "OPEN":           return "text-foreground/50 bg-surface border border-border";
    case "ASSIGNED":       return "text-warning-text bg-warning-bg border border-warning-border";
    case "IN_PROGRESS":    return "text-info-text bg-info-bg border border-info-border";
    case "ESCALATED":      return "text-error-text bg-error-bg border border-error-border";
    case "PENDING_REVIEW": return "text-warning-text bg-warning-bg border border-warning-border";
    case "RESOLVED":       return "text-success-text bg-success-bg border border-success-border";
    case "ARCHIVED":       return "text-foreground-muted bg-surface-hover border border-border";
    default:               return "text-foreground-muted bg-surface-hover border border-border";
  }
}

function riskColor(r: string): string {
  switch (r) {
    case "LOW":      return "text-success-text";
    case "MEDIUM":   return "text-warning-text";
    case "HIGH":     return "text-error-text";
    case "CRITICAL": return "text-error-text";
    default:         return "text-foreground-muted";
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
      className={`w-full text-left px-3 py-2.5 border-b border-border transition-all duration-100 relative group ${
        selected
          ? "bg-surface border-l-2 border-l-info-border"
          : checked
          ? "bg-error-bg border-l-2 border-l-error-border"
          : "border-l-2 border-l-transparent hover:bg-surface-hover"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Checkbox — always visible in selectMode, hover-visible otherwise */}
        <button
          onClick={onCheck}
          className={`flex-shrink-0 mt-1 transition-opacity ${selectMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          {checked
            ? <CheckSquare className="w-3.5 h-3.5 text-error-text" />
            : <Square className="w-3.5 h-3.5 text-foreground-muted" />}
        </button>

        {/* Message content — clickable to open detail */}
        <button onClick={onClick} className="flex-1 min-w-0 text-left">
          <div className="flex items-start gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 ${
              selected ? "bg-info-bg text-info-text" : "bg-surface text-foreground-muted"
            }`}>
              {initials(msg.sender_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${platformColor(msg.platform)}`}>
                    {platformBadge(msg.platform)}
                  </span>
                  <span className="text-[11px] text-foreground font-medium truncate">{msg.sender_name}</span>
                  {msg.status === "UNREAD" && <span className="w-1.5 h-1.5 rounded-full bg-info-text flex-shrink-0" />}
                </div>
                <span className="text-[9px] text-foreground-muted flex-shrink-0">{timeAgo(msg.received_at)}</span>
              </div>
              <p className="text-[11px] text-foreground-muted line-clamp-1 leading-relaxed mb-1">{msg.message_body}</p>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${statusColor(msg.status)}`}>
                  {msg.status.replace(/_/g, " ")}
                </span>
                <span className={`text-[9px] font-medium ${riskColor(msg.risk_level)}`}>{msg.risk_level}</span>
                {msg.recipient_account_handle && (
                  <span className="text-[9px] text-foreground/50 truncate ml-1 max-w-[80px]" title={`Your account: ${msg.recipient_account_name || msg.recipient_account_handle}`}>
                    → @{msg.recipient_account_handle}
                  </span>
                )}
                <span className="text-foreground-muted ml-auto">
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
  const isAutoSent = replyType === "auto_reply" && status === "sent";

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[72%] flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
        {isAutoSent && (
          <span className="text-[9px] text-success-text/50 px-1 mb-0.5">⚡ Auto-replied</span>
        )}
        <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-[1.55] ${
          isMine
            ? isAutoSent
              ? "bg-success-bg text-success-text rounded-br-sm border border-success-border"
              : failed
                ? "bg-error-text/30 text-error-text rounded-br-sm border border-error-border"
                : sending
                  ? "bg-info-text/50 text-info-text/80 rounded-br-sm"
                  : "bg-info-text text-foreground rounded-br-sm"
            : "bg-surface text-foreground rounded-bl-sm border border-border"
        }`}>
          {body}
        </div>
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[10px] text-foreground-muted">{time}</span>
          {isMine && failed && (
            <>
              <X className="w-2.5 h-2.5 text-error-text/80" />
              {!maxed ? (
                <button
                  onClick={onRetry}
                  title={`Retry (${retryCount ?? 0}/${MAX_RETRIES})`}
                  className="text-foreground-muted hover:text-info-text transition-colors"
                >
                  <RefreshCcw className="w-2.5 h-2.5" />
                </button>
              ) : (
                <span className="text-[9px] text-error-text/50">max retries</span>
              )}
            </>
          )}
          {isMine && !isAutoSent && !sending && !failed && status === "sent" && (
            <span className="text-[10px] text-foreground-muted">✓</span>
          )}
          {isMine && sending && <span className="text-[10px] text-foreground-muted">…</span>}
          {isMine && replyType === "ai_draft" && <Sparkles className="w-2.5 h-2.5 text-info-text/70" />}
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
  const isAutoSent = replyType === "auto_reply" && status === "sent";

  return (
    <div className={`flex items-start gap-2.5 ${isMine ? "ml-7" : ""}`}>
      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold mt-0.5 ${
        isMine
          ? failed ? "bg-error-bg text-error-text" : isAutoSent ? "bg-success-bg text-success-text/70" : "bg-info-bg text-info-text"
          : "bg-surface text-foreground-muted"
      }`}>
        {isMine ? "ME" : initials(author)}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`text-[11px] font-semibold ${isMine ? (failed ? "text-error-text/70" : isAutoSent ? "text-success-text/60" : "text-info-text") : "text-foreground"}`}>
            {isMine ? (isAutoSent ? "⚡ Auto-reply" : "You") : author}
          </span>
          <span className="text-[10px] text-foreground-muted">{time}</span>
          {isMine && replyType === "ai_draft" && <Sparkles className="w-2.5 h-2.5 text-info-text/70" />}
          {isMine && failed && (
            <>
              <X className="w-2.5 h-2.5 text-error-text/80" />
              {!maxed ? (
                <button
                  onClick={onRetry}
                  title={`Retry (${retryCount ?? 0}/${MAX_RETRIES})`}
                  className="text-foreground-muted hover:text-info-text transition-colors"
                >
                  <RefreshCcw className="w-2.5 h-2.5" />
                </button>
              ) : (
                <span className="text-[9px] text-error-text/50">max retries</span>
              )}
            </>
          )}
        </div>
        <p className={`text-[13px] leading-[1.55] ${
          failed ? "text-error-text line-through decoration-error-border" : isAutoSent ? "text-success-text italic" : sending ? "text-foreground-muted" : "text-foreground-muted"
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
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-surface skeleton-shimmer flex-shrink-0" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-28 rounded bg-surface skeleton-shimmer" />
            <div className="h-2 w-16 rounded bg-surface skeleton-shimmer" />
          </div>
        </div>
        <div className="flex gap-1.5">
          {[1,2,3].map(i => (
            <div key={i} className="w-6 h-6 rounded-lg bg-surface skeleton-shimmer" />
          ))}
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="border-b border-border px-4 py-0 flex gap-5 flex-shrink-0">
        {[60, 44, 40].map((w, i) => (
          <div key={i} className="py-2.5">
            <div className="h-2.5 rounded bg-surface skeleton-shimmer" style={{ width: w }} />
          </div>
        ))}
      </div>

      {/* Bubbles skeleton */}
      <div className="flex-1 overflow-hidden px-4 py-3 flex flex-col gap-4">
        {/* Incoming */}
        <div className="flex justify-start">
          <div className="h-10 w-52 rounded-2xl rounded-bl-sm bg-surface skeleton-shimmer" />
        </div>
        {/* Outgoing */}
        <div className="flex justify-end">
          <div className="h-8 w-40 rounded-2xl rounded-br-sm bg-info-text/20 skeleton-shimmer" />
        </div>
        {/* Incoming */}
        <div className="flex justify-start">
          <div className="h-14 w-64 rounded-2xl rounded-bl-sm bg-surface skeleton-shimmer" />
        </div>
        {/* Outgoing */}
        <div className="flex justify-end">
          <div className="h-8 w-48 rounded-2xl rounded-br-sm bg-info-text/20 skeleton-shimmer" />
        </div>
        {/* Incoming */}
        <div className="flex justify-start">
          <div className="h-10 w-44 rounded-2xl rounded-bl-sm bg-surface skeleton-shimmer" />
        </div>
      </div>

      {/* Compose bar skeleton */}
      <div className="border-t border-border px-4 py-3 flex-shrink-0 flex items-end gap-2">
        <div className="flex-1 h-16 rounded-2xl bg-background skeleton-shimmer" />
        <div className="flex flex-col gap-1.5 pb-0.5">
          <div className="h-7 w-24 rounded-lg bg-surface skeleton-shimmer" />
          <div className="h-8 w-8 rounded-xl bg-surface skeleton-shimmer" />
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
    <div className="mx-4 mt-2 mb-1 rounded-lg border border-border bg-background overflow-hidden flex-shrink-0">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
        <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${platformColor(msg.platform)}`}>
          {platformBadge(msg.platform)}
        </span>
        <span className="text-[9px] text-foreground-muted uppercase tracking-[0.1em] font-medium">
          Original {platformLabel} {isVideo ? "video" : "post"}
        </span>
        {preview?.post_url ? (
          <a
            href={preview.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[9px] text-info-text/60 hover:text-info-text transition-colors"
          >
            View {isVideo ? "video" : "post"} <ExternalLink className="w-2.5 h-2.5" />
          </a>
        ) : msg.original_post_id ? (
          <span className="ml-auto text-[9px] text-foreground-muted font-mono">
            {msg.original_post_id.slice(-10)}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-14 h-10 rounded-md bg-surface animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 bg-surface rounded animate-pulse w-3/4" />
            <div className="h-2 bg-surface rounded animate-pulse w-1/2" />
          </div>
        </div>
      ) : preview?.image || preview?.thumb ? (
        <div className="flex items-start gap-3 px-3 py-2.5">
          <div className="relative flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.thumb || preview.image || ""}
              alt="Post thumbnail"
              className="w-14 h-10 rounded-md object-cover bg-surface"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-background/60 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-foreground ml-0.5" fill="currentColor" viewBox="0 0 8 10">
                    <path d="M0 0l8 5-8 5V0z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {preview.caption && (
              <p className="text-[11px] text-foreground-muted leading-relaxed line-clamp-2">{preview.caption}</p>
            )}
            {preview.media_type && preview.media_type !== "TEXT" && (
              <span className="text-[9px] text-foreground-muted mt-0.5 block">{preview.media_type}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-14 h-10 rounded-md bg-surface border border-border flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-3.5 h-3.5 text-foreground/50" />
          </div>
          <div>
            <p className="text-[11px] text-foreground-muted">Preview unavailable</p>
            {msg.original_post_id && (
              <p className="text-[10px] text-foreground-muted font-mono mt-0.5">{msg.original_post_id.slice(-12)}</p>
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
      commentMode ? "border-border bg-background" : "border-border bg-background"
    }`}>
      {lastSendStatus === "sent" && (
        <div className="flex items-center gap-1.5 mb-2 text-[11px] text-success-text/80">
          <CheckCircle2 className="w-3 h-3" />
          Sent on {platform.charAt(0) + platform.slice(1).toLowerCase()}
        </div>
      )}
      {lastSendStatus === "draft" && (
        <div className="mb-2 text-[11px] text-warning-text/70">
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
          className={`flex-1 text-[13px] text-foreground placeholder-foreground-muted px-3.5 py-2.5 outline-none resize-none leading-relaxed transition-colors ${
            commentMode
              ? "bg-surface border border-border rounded-xl focus:border-border"
              : "bg-background border border-border rounded-2xl focus:border-info-border/25"
          }`}
        />

        <div className="flex flex-col gap-1.5 flex-shrink-0 pb-0.5">
          <div className="flex items-center gap-1">
            <div className="relative">
              <select
                value={aiTone}
                onChange={e => setAiTone(e.target.value)}
                className="bg-background border border-border rounded-lg text-[10px] text-foreground-muted px-2 py-1.5 pr-5 appearance-none outline-none"
              >
                {AI_TONES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-foreground-muted pointer-events-none" />
            </div>
            <button
              onClick={onGenerateDraft}
              disabled={generatingDraft}
              title="AI draft"
              className="p-1.5 rounded-lg text-info-text/60 bg-info-bg border border-info-border hover:brightness-110 hover:text-info-text transition-colors disabled:opacity-30"
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
                ? "bg-surface hover:bg-surface border border-border text-foreground-muted hover:text-foreground"
                : "bg-info-text hover:brightness-110 text-foreground"
            }`}
          >
            {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <p className="text-[9px] text-foreground/50 mt-1.5">⌘↵ to send · {replyBody.length}/5000</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { role, isSuperAdmin } = useRoleContext();
  const canManageInboxRules = isSuperAdmin || ['ADMIN','WORKSPACE_OWNER','GOVERNANCE_ADMIN'].includes(role ?? '');
  const [tab, setTab] = useState("all");
  const [platform, setPlatform] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; message: string; errors?: string[] } | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [deleteRuleConfirm, setDeleteRuleConfirm] = useState<{ id: string } | null>(null);
  const [showDeleteSelectedConfirm, setShowDeleteSelectedConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InboxMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // Mobile: "list" shows message list, "detail" shows conversation panel
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

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

  // Settings modal — auto-reply rules
  const [showSettings, setShowSettings] = useState(false);
  const [autoReplyRules, setAutoReplyRules] = useState<AutoReplyRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleKeywords, setNewRuleKeywords] = useState("");
  const [newRuleReply, setNewRuleReply] = useState("");
  const [newRuleCaseSensitive, setNewRuleCaseSensitive] = useState(false);
  const [savingRule, setSavingRule] = useState(false);

  const threadBottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    threadBottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res = await api.listInboxAutoReplyRules();
      setAutoReplyRules(res.data || []);
    } catch { /* silent */ }
    finally { setRulesLoading(false); }
  }, []);

  const openSettings = useCallback(() => {
    setShowSettings(true);
    setEditingRule(null);
    setNewRuleName(""); setNewRuleKeywords(""); setNewRuleReply(""); setNewRuleCaseSensitive(false);
    fetchRules();
  }, [fetchRules]);

  const handleSaveRule = async () => {
    const keywords = newRuleKeywords.split(",").map(k => k.trim()).filter(Boolean);
    if (!keywords.length || !newRuleReply.trim()) return;
    setSavingRule(true);
    try {
      if (editingRule) {
        const res = await api.updateInboxAutoReplyRule(editingRule.id, {
          rule_name: newRuleName || editingRule.rule_name,
          keywords, reply_body: newRuleReply, is_case_sensitive: newRuleCaseSensitive,
        });
        setAutoReplyRules(prev => prev.map(r => r.id === editingRule.id ? res.data : r));
      } else {
        const res = await api.createInboxAutoReplyRule({
          rule_name: newRuleName || "Untitled Rule", keywords, reply_body: newRuleReply,
          is_case_sensitive: newRuleCaseSensitive,
        });
        setAutoReplyRules(prev => [res.data, ...prev]);
      }
      setEditingRule(null);
      setNewRuleName(""); setNewRuleKeywords(""); setNewRuleReply(""); setNewRuleCaseSensitive(false);
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "Failed to save rule", type: 'error' });
    } finally {
      setSavingRule(false);
    }
  };

  const handleToggleRule = async (rule: AutoReplyRule) => {
    try {
      const res = await api.updateInboxAutoReplyRule(rule.id, { is_active: !rule.is_active });
      setAutoReplyRules(prev => prev.map(r => r.id === rule.id ? res.data : r));
    } catch { /* silent */ }
  };

  const handleDeleteRule = async (id: string) => {
    setDeleteRuleConfirm({ id });
  };

  const startEditRule = (rule: AutoReplyRule) => {
    setEditingRule(rule);
    setNewRuleName(rule.rule_name);
    setNewRuleKeywords(rule.keywords.join(", "));
    setNewRuleReply(rule.reply_body);
    setNewRuleCaseSensitive(rule.is_case_sensitive);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchMessages = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) { setLoading(true); setError(null); }
    else setLoadingMore(true);
    try {
      const res = await api.getInboxMessages({ tab, platform, search: debouncedSearch, page: pageNum, limit: PAGE_SIZE });
      if (pageNum === 1) setMessages(res.data || []);
      else setMessages(prev => [...prev, ...(res.data || [])]);
      setTotal(res.total ?? 0);
      setIsDemo(res.is_demo || false);
    } catch (e: unknown) {
      if (pageNum === 1) { setMessages([]); setTotal(0); setError(e instanceof Error ? e.message : "Failed to load inbox"); }
    } finally {
      if (pageNum === 1) setLoading(false);
      else setLoadingMore(false);
    }
  }, [tab, platform, debouncedSearch]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); fetchMessages(1); }, [fetchMessages]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchMessages(next);
  };

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
    setMobileView("detail");
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
      const draft = (typeof res.data?.draft === "string" && res.data.draft.trim()) ? res.data.draft : null;
      if (!draft) throw new Error("AI returned an empty draft. Try a different tone.");
      setAiDraft(draft);
      setReplyBody(draft);
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "Failed to generate AI draft", type: 'error' });
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
        status: res.data?.status || "sent",
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

    // tmp- prefix means the original send never reached the DB — safe to create new record.
    // A real ID means it was persisted but the platform API failed — don't duplicate, just resend.
    const isUnsaved = replyId.startsWith("tmp-");

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
        id: isUnsaved ? (res.data?.id || replyId) : replyId,
        reply_body: reply.reply_body,
        reply_type: reply.reply_type,
        status: res.data?.status || "sent",
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
      setToast({ message: e instanceof Error ? e.message : "Failed to add note", type: 'error' });
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
      setToast({ message: e instanceof Error ? e.message : "Failed to escalate", type: 'error' });
    } finally {
      setEscalating(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedId) return;
    try {
      await api.archiveInboxMessage(selectedId);
      setMessages(prev => prev.filter(m => m.id !== selectedId));
      setSelectedId(null); setDetail(null); setMobileView("list");
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "Failed to archive", type: 'error' });
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedId) return;
    try {
      await api.updateInboxMessageStatus(selectedId, status);
      setDetail(prev => prev ? { ...prev, status } : prev);
      setMessages(prev => prev.map(m => m.id === selectedId ? { ...m, status } : m));
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "Failed to update status", type: 'error' });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.syncInboxMessages();
      const liDebug = (res.debug || []).filter((d: string) => d.includes('linkedin') || d.includes('LinkedIn'));
      if (liDebug.length) console.group('[LinkedIn Sync]'); liDebug.forEach((d: string) => console.log(d)); if (liDebug.length) console.groupEnd();
      if (res.debug?.length) console.debug('[Inbox sync debug]', res.debug);
      const visibleErrors: string[] = (res.errors || []).filter((e: string) =>
        !e.startsWith('[') // hide internal debug-prefixed lines
      );
      setSyncResult({ synced: res.synced ?? 0, message: res.message || 'Sync complete', errors: visibleErrors });
      if ((res.synced ?? 0) > 0) await fetchMessages();
      setLastSynced(new Date());
      setTimeout(() => setSyncResult(null), 6000);
    } catch (e: unknown) {
      setSyncResult({ synced: 0, message: e instanceof Error ? e.message : "Sync failed" });
      setTimeout(() => setSyncResult(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  // Auto-sync on mount and every 15 minutes (skip when tab is hidden).
  // LinkedIn's socialActions/comments endpoint has a ~100 calls/day limit;
  // backend throttle enforces a 2-hour minimum interval per account regardless.
  useEffect(() => {
    handleSync();
    const id = setInterval(() => { if (document.visibilityState === 'visible') handleSync(); }, 15 * 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setShowDeleteSelectedConfirm(true);
  };

  const executeDeleteSelected = async () => {
    setShowDeleteSelectedConfirm(false);
    setDeleting(true);
    try {
      await api.deleteInboxMessages(Array.from(checkedIds));
      setMessages(prev => prev.filter(m => !checkedIds.has(m.id)));
      setTotal(prev => Math.max(0, prev - checkedIds.size));
      if (checkedIds.has(selectedId ?? "")) {
        setSelectedId(null);
        setDetail(null);
        setMobileView("list");
      }
      setCheckedIds(new Set());
      setSelectMode(false);
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "Delete failed", type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const commentMode = detail ? isComment(detail) : false;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-border px-5 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-info-bg flex items-center justify-center">
            <Inbox className="w-3.5 h-3.5 text-info-text/80" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-[13px] font-semibold text-foreground tracking-tight">Inbox</h1>
            <span className="text-[10px] text-foreground-muted">
              {loading ? "…" : `${total} message${total !== 1 ? "s" : ""}${isDemo ? " · demo" : ""}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDemo && (
            <span className="text-[9px] text-warning-text/60 bg-warning-bg border border-warning-border px-2 py-1 rounded-full tracking-wide uppercase">
              Demo
            </span>
          )}
          {syncResult && (
            <div className="flex flex-col gap-1 max-w-[280px]">
              <span className={`text-[9px] px-2 py-1 rounded-lg border truncate ${
                syncResult.errors?.length
                  ? "text-error-text/70 border-error-border bg-error-bg"
                  : "text-success-text/60 border-success-border bg-success-bg"
              }`}>
                {syncResult.message}
              </span>
              {syncResult.errors?.map((e, i) => (
                <span key={i} className="text-[9px] text-error-text/70 px-2 py-1 rounded-lg border border-error-border bg-error-bg truncate" title={e}>
                  ⚠ {e}
                </span>
              ))}
            </div>
          )}
          {isDemo ? (
            <button
              onClick={() => fetchMessages(1)}
              className="flex items-center gap-1.5 text-[11px] text-foreground-muted hover:text-foreground-muted bg-surface-hover hover:bg-surface-hover border border-border px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCcw className="w-3 h-3" />
              Reload
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {lastSynced && !syncing && (
                <span className="flex items-center gap-1 text-[10px] text-green-500/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live · {timeAgo(lastSynced.toISOString())} ago
                </span>
              )}
              <button
                onClick={handleSync} disabled={syncing}
                className="flex items-center gap-1.5 text-[11px] text-info-text/60 hover:text-info-text bg-info-bg hover:brightness-110 border border-info-border px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-30"
              >
                {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
                {syncing ? "Syncing…" : "Sync"}
              </button>
            </div>
          )}
          <button
            onClick={openSettings}
            className="flex items-center justify-center w-7 h-7 text-foreground-muted hover:text-foreground/70 bg-surface-hover hover:bg-surface-hover border border-border rounded-lg transition-colors"
            title="Inbox Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-w-0">

        {/* ── Filter Panel — hidden on mobile, slide-in on md+ ────────────── */}
        <div className={`hidden md:flex border-r border-border flex-col flex-shrink-0 overflow-hidden transition-all duration-200 ${filtersOpen ? "w-44" : "w-0"}`}>
          <div className="w-44 flex flex-col h-full overflow-y-auto">
            <div className="px-3 py-2 border-b border-border">
              <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5">
                <Search className="w-3 h-3 text-foreground-muted" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="bg-transparent text-[11px] text-foreground placeholder-foreground-muted outline-none flex-1 w-0"
                />
              </div>
            </div>

            <div className="px-2 py-2 border-b border-border">
              <p className="text-[8px] uppercase tracking-[0.14em] text-foreground/50 px-1.5 mb-1.5 font-medium">Status</p>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`w-full text-left text-[11px] px-2 py-1.5 rounded-md transition-colors ${
                    tab === t.key ? "text-foreground bg-surface" : "text-foreground-muted hover:text-foreground-muted hover:bg-surface-hover"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="px-2 py-2">
              <p className="text-[8px] uppercase tracking-[0.14em] text-foreground/50 px-1.5 mb-1.5 font-medium">Platform</p>
              {PLATFORMS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPlatform(p.key)}
                  className={`w-full text-left text-[11px] px-2 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
                    platform === p.key ? "text-foreground bg-surface" : "text-foreground-muted hover:text-foreground-muted hover:bg-surface-hover"
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
        <div className={`border-r border-border flex flex-col flex-shrink-0 w-full md:w-64 ${mobileView === "detail" ? "hidden md:flex" : "flex"}`}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className="p-1 rounded-md text-foreground/50 hover:text-foreground-muted hover:bg-surface-hover transition-colors flex-shrink-0"
              title={filtersOpen ? "Hide filters" : "Show filters"}
            >
              {filtersOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {checkedIds.size > 0 ? (
              <>
                <span className="text-[9px] text-error-text/80 font-medium">{checkedIds.size} selected</span>
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="ml-auto flex items-center gap-1 text-[9px] text-error-text/70 hover:text-error-text bg-error-bg hover:brightness-110 border border-error-border px-2 py-1 rounded-md transition-colors disabled:opacity-40"
                >
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  {deleting ? "Deleting…" : "Delete"}
                </button>
                <button
                  onClick={() => { setCheckedIds(new Set()); setSelectMode(false); }}
                  className="p-1 text-foreground-muted hover:text-foreground-muted transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <>
                <span className="text-[9px] text-foreground/50 font-medium uppercase tracking-[0.14em]">Messages</span>
                {!loading && total > 0 && (
                  <span className="text-[9px] text-foreground/50 tabular-nums">{total}</span>
                )}
                {!loading && messages.length > 0 && (
                  <button
                    onClick={() => setSelectMode(v => !v)}
                    title="Select messages"
                    className={`ml-auto p-1 rounded transition-colors ${selectMode ? "text-info-text" : "text-foreground/50 hover:text-foreground-muted"}`}
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
                <Loader2 className="w-4 h-4 text-foreground/50 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
                <XCircle className="w-4 h-4 text-error-text/40" />
                <span className="text-[11px] text-foreground-muted">{error}</span>
                <button onClick={() => fetchMessages(1)} className="text-[11px] text-info-text/60 hover:text-info-text">Retry</button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
                <Inbox className="w-5 h-5 text-foreground-muted" />
                <span className="text-[11px] text-foreground-muted">No messages</span>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <MessageListItem
                    key={msg.id}
                    msg={msg}
                    selected={selectedId === msg.id}
                    checked={checkedIds.has(msg.id)}
                    selectMode={selectMode}
                    onClick={() => selectMessage(msg.id)}
                    onCheck={(e) => toggleCheck(msg.id, e)}
                  />
                ))}
                {messages.length < total && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-2.5 text-[10px] text-foreground-muted hover:text-foreground-muted border-t border-border flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {loadingMore ? "Loading…" : `${total - messages.length} more`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Detail Panel ──────────────────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col overflow-hidden relative min-w-0 ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>

          {!selectedId ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <div className="w-10 h-10 rounded-2xl bg-surface-hover border border-border flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-foreground-muted" />
              </div>
              <p className="text-[11px] text-foreground/50">Select a message to view the conversation</p>
            </div>
          ) : detailLoading ? (
            <ChatSkeleton />
          ) : detail ? (
            <div key={selectedId} className="chat-enter flex flex-col h-full overflow-hidden">

              {/* ── Conversation header ───────────────────────────────────── */}
              <div className={`border-b px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0 ${
                commentMode ? "border-border bg-background" : "border-border"
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  {/* Back to list — mobile only */}
                  <button
                    onClick={() => setMobileView("list")}
                    className="p-1 text-foreground-muted hover:text-foreground flex-shrink-0 md:hidden"
                    title="Back to messages"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                    commentMode ? "bg-surface text-foreground-muted" : "bg-surface text-foreground-muted"
                  }`}>
                    {initials(detail.sender_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-foreground tracking-tight">{detail.sender_name}</span>
                      {detail.sender_handle && (
                        <span className="text-[10px] text-foreground-muted truncate max-w-[100px]">{detail.sender_handle}</span>
                      )}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${platformColor(detail.platform)}`}>
                        {platformBadge(detail.platform)}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${statusColor(detail.status)}`}>
                        {detail.status.replace(/_/g, " ")}
                      </span>
                      {commentMode && (
                        <span className="flex items-center gap-1 text-[9px] text-foreground-muted">
                          <MessageCircle className="w-2.5 h-2.5" /> Comment
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className={`text-[10px] font-medium ${riskColor(detail.risk_level)}`}>{detail.risk_level}</span>
                      <span className="text-[10px] text-foreground/50">{timeAgo(detail.received_at)}</span>
                      {detail.recipient_account_handle && (
                        <span className="text-[10px] text-foreground/50" title="Your connected account">
                          → <span className="text-foreground-muted">{detail.recipient_account_name || detail.recipient_account_handle}</span>
                          <span className="text-foreground/50 ml-0.5">(@{detail.recipient_account_handle})</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {detail.status !== "ESCALATED" && detail.status !== "RESOLVED" && detail.status !== "ARCHIVED" && !isDemo && (
                    <button
                      onClick={() => setShowEscalate(true)}
                      className="p-1.5 rounded-lg text-error-text/40 hover:text-error-text/80 hover:brightness-110 border border-transparent hover:border-error-border transition-colors"
                      title="Escalate"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {detail.status !== "RESOLVED" && !isDemo && (
                    <button
                      onClick={() => handleStatusChange("RESOLVED")}
                      className="p-1.5 rounded-lg text-success-text/40 hover:text-success-text/80 hover:brightness-110 border border-transparent hover:border-success-border transition-colors"
                      title="Resolve"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!isDemo && (
                    <button
                      onClick={handleArchive}
                      className="p-1.5 rounded-lg text-foreground/50 hover:text-foreground-muted hover:bg-surface-hover transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedId(null); setDetail(null); setMobileView("list"); }}
                    className="p-1.5 rounded-lg text-foreground/50 hover:text-foreground-muted hover:bg-surface-hover transition-colors"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Tab bar ────────────────────────────────────────────────── */}
              <div className={`border-b px-4 flex-shrink-0 ${commentMode ? "border-border bg-background" : "border-border"}`}>
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
                          ? "text-foreground border-info-border"
                          : "text-foreground-muted border-transparent hover:text-foreground-muted"
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

                  {detail.escalation && (
                    <div className={`mx-4 mt-2 border rounded-lg px-3 py-2 flex-shrink-0 ${
                      detail.escalation.review_status === "RESOLVED"
                        ? "bg-success-bg border-success-border"
                        : "bg-error-bg border-error-border"
                    }`}>
                      <div className="flex items-start gap-2">
                        {detail.escalation.review_status === "RESOLVED"
                          ? <CheckCircle2 className="w-3 h-3 text-success-text/60 mt-0.5 flex-shrink-0" />
                          : <AlertTriangle className="w-3 h-3 text-error-text/60 mt-0.5 flex-shrink-0" />
                        }
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {detail.escalation.is_auto_escalated && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider bg-warning-bg text-warning-text border border-warning-border px-1.5 py-0.5 rounded-full">
                                Auto-escalated
                              </span>
                            )}
                            <p className={`text-[11px] font-medium ${detail.escalation.review_status === "RESOLVED" ? "text-success-text/70" : "text-error-text/70"}`}>
                              {detail.escalation.review_status === "RESOLVED"
                                ? `Resolved${detail.escalation.decision ? ` · ${detail.escalation.decision}` : ""}`
                                : detail.escalation.escalation_reason
                              }
                            </p>
                          </div>
                          {detail.escalation.review_status === "RESOLVED" ? (
                            <p className="text-[10px] text-foreground-muted mt-0.5">
                              {detail.escalation.resolved_by_name
                                ? `Resolved by ${detail.escalation.resolved_by_name}`
                                : "Resolved"
                              }
                              {detail.escalation.decision_note && (
                                <span className="text-foreground-muted"> — {detail.escalation.decision_note}</span>
                              )}
                            </p>
                          ) : (
                            <p className="text-[10px] text-foreground-muted mt-0.5">
                              {detail.escalation.risk_category !== "AUTO_DETECTED" ? detail.escalation.risk_category : detail.escalation.risk_level} · Awaiting review
                              {detail.escalation.assigned_reviewer_name && (
                                <span className="text-foreground-muted"> · Assigned to {detail.escalation.assigned_reviewer_name}</span>
                              )}
                            </p>
                          )}
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
                            <div className="flex-1 border-t border-border" />
                            <span className="text-[9px] text-foreground-muted">
                              {detail.replies!.length} {detail.replies!.length === 1 ? "reply" : "replies"}
                            </span>
                            <div className="flex-1 border-t border-border" />
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
                        <span className="text-[9px] text-warning-text/40 border border-warning-border px-3 py-1 rounded-full">
                          Demo — Upgrade to Growth for real messages
                        </span>
                      </div>
                    )}

                    <div ref={threadBottomRef} />
                  </div>

                  {detail.status === "ESCALATED" ? (
                    <div className="border-t border-border px-4 py-3 flex items-center gap-2 text-[11px] flex-shrink-0">
                      <Shield className="w-3 h-3 text-error-text/40 flex-shrink-0" />
                      <span className="text-foreground-muted">Reply locked — awaiting escalation review</span>
                      {detail.escalation?.assigned_reviewer_name && (
                        <span className="ml-auto text-[10px] text-foreground/50">
                          → {detail.escalation.assigned_reviewer_name}
                        </span>
                      )}
                    </div>
                  ) : detail.status === "RESOLVED" && detail.escalation?.review_status === "RESOLVED" ? (
                    <div className="border-t border-border px-4 py-3 flex items-center gap-2 text-[11px] flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-success-text/50 flex-shrink-0" />
                      <span className="text-foreground-muted">
                        {detail.escalation.resolved_by_name
                          ? `Resolved by ${detail.escalation.resolved_by_name}`
                          : "Escalation resolved"
                        }
                        {detail.escalation.decision && (
                          <span className="text-foreground-muted"> · {detail.escalation.decision}</span>
                        )}
                      </span>
                    </div>
                  ) : isDemo ? (
                    <div className="border-t border-border px-4 py-3 flex items-center gap-2 text-[11px] text-foreground-muted flex-shrink-0">
                      <ArrowUpRight className="w-3 h-3 text-warning-text/40" />
                      Upgrade to Growth to reply
                    </div>
                  ) : detail.platform === "LINKEDIN" && detail.message_type === "DM" ? (
                    <div className="border-t border-border px-4 py-3 flex items-start gap-2 text-[11px] flex-shrink-0">
                      <span className="text-[16px] leading-none mt-0.5">🔒</span>
                      <div>
                        <p className="text-foreground font-medium">LinkedIn DMs not available via API</p>
                        <p className="text-foreground-muted mt-0.5">LinkedIn restricts Messaging API access to approved partner apps. Open LinkedIn to reply directly.</p>
                      </div>
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
                      <div key={n.id} className="bg-warning-bg border border-warning-border rounded-lg px-3 py-2.5">
                        <p className="text-[12px] text-foreground/70 leading-relaxed">{n.note_body}</p>
                        <p className="text-[10px] text-foreground/50 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    )) : (
                      <p className="text-[11px] text-foreground/50 text-center py-8">No notes yet</p>
                    )}
                  </div>
                  {!isDemo && (
                    <div className="border-t border-border px-4 py-3 flex gap-2 items-end flex-shrink-0">
                      <textarea
                        value={noteBody}
                        onChange={e => setNoteBody(e.target.value)}
                        placeholder="Internal note…"
                        rows={2}
                        className="flex-1 bg-background border border-border rounded-xl text-[12px] text-foreground placeholder-foreground-muted px-3 py-2 outline-none resize-none focus:border-warning-border transition-colors leading-relaxed"
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={savingNote || !noteBody.trim()}
                        className="p-2 rounded-xl bg-warning-bg hover:brightness-110 border border-warning-border text-warning-text/50 hover:text-warning-text/80 transition-colors disabled:opacity-25"
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
                      <div className="w-1 h-1 rounded-full bg-surface mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] text-foreground-muted">{entry.action}</p>
                        {(entry.previous_value || entry.new_value) && (
                          <p className="text-[10px] text-foreground-muted mt-0.5">{entry.previous_value} → {entry.new_value}</p>
                        )}
                        <p className="text-[10px] text-foreground/50 mt-0.5">{timeAgo(entry.performed_at)}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-[11px] text-foreground/50 text-center py-8">No audit trail yet</p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Escalation modal ────────────────────────────────────────────────── */}
      {showEscalate && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-background border border-border rounded-xl p-5 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-error-text/60" />
                <h3 className="text-[13px] font-semibold text-foreground">Escalate</h3>
              </div>
              <button onClick={() => setShowEscalate(false)} className="text-foreground/50 hover:text-foreground/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-foreground-muted mb-1.5 block uppercase tracking-[0.12em]">Category</label>
                <select
                  value={escalateCategory}
                  onChange={e => setEscalateCategory(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg text-[12px] text-foreground px-3 py-2 outline-none"
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
                <label className="text-[9px] text-foreground-muted mb-1.5 block uppercase tracking-[0.12em]">Reason</label>
                <textarea
                  value={escalateReason}
                  onChange={e => setEscalateReason(e.target.value)}
                  placeholder="Describe the escalation reason…"
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg text-[12px] text-foreground placeholder-foreground-muted px-3 py-2.5 outline-none resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setShowEscalate(false)}
                  className="text-[11px] text-foreground-muted hover:text-foreground/70 px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEscalate}
                  disabled={escalating || !escalateReason.trim()}
                  className="flex items-center gap-1.5 text-[11px] text-foreground bg-error-text/80 hover:brightness-110 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30"
                >
                  {escalating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                  {escalating ? "Escalating…" : "Escalate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal (portal → renders into document.body, escapes layout transforms) */}
      {showSettings && createPortal(
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-background border border-border rounded-xl w-full max-w-[560px] shadow-2xl">

              {/* ── Modal header ─────────────────────────────────────────── */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-info-bg flex items-center justify-center">
                    <Settings className="w-3.5 h-3.5 text-info-text/70" />
                  </div>
                  <h3 className="text-[13px] font-semibold text-foreground tracking-tight">Inbox Settings</h3>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground/60 hover:bg-surface-hover transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5 space-y-5">

                {/* ── Risk Classification ─────────────────────────────────── */}
                <section>
                  <p className="text-[9px] text-foreground-muted uppercase tracking-[0.14em] font-medium mb-2.5">Risk Classification</p>
                  <div className="bg-surface border border-border rounded-lg overflow-hidden">
                    <div className="divide-y divide-border">
                      {[
                        { level: "CRITICAL", color: "text-error-text",     bg: "bg-error-bg",     desc: "Threats, extreme abuse, slurs — 10 languages" },
                        { level: "HIGH",     color: "text-warning-text",  bg: "bg-warning-bg",  desc: "Legal threats, chargeback, fraud claims" },
                        { level: "MEDIUM",   color: "text-warning-text",  bg: "bg-warning-bg",  desc: "Strong complaints and frustration" },
                        { level: "LOW",      color: "text-success-text", bg: "bg-success-bg", desc: "General inquiries and positive messages" },
                      ].map(({ level, color, bg, desc }) => (
                        <div key={level} className="flex items-center gap-3 px-3.5 py-2.5">
                          <span className={`text-[10px] font-bold ${color} ${bg} px-2 py-0.5 rounded w-[68px] text-center flex-shrink-0`}>{level}</span>
                          <span className="text-[11px] text-foreground-muted">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* ── Auto-Reply Rules ────────────────────────────────────── */}
                <section>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] text-foreground-muted uppercase tracking-[0.14em] font-medium">Smart Auto-Reply</p>
                    <span className="text-[9px] text-foreground/50">{autoReplyRules.length} rule{autoReplyRules.length !== 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-[10px] text-foreground-muted mb-3">When a new message matches a keyword, a draft reply is auto-created for one-click sending.</p>

                  {/* Form */}
                  <div className="bg-surface border border-border rounded-lg p-3.5 mb-3 space-y-2.5">
                    <p className="text-[10px] text-foreground-muted font-medium">{editingRule ? "Edit rule" : "Add new rule"}</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[9px] text-foreground-muted uppercase tracking-[0.1em] mb-1 block">Rule name</label>
                        <input
                          value={newRuleName}
                          onChange={e => setNewRuleName(e.target.value)}
                          placeholder="e.g. Greeting reply"
                          className="w-full bg-background border border-border rounded-lg text-[11px] text-foreground placeholder-foreground-muted px-2.5 py-1.5 outline-none focus:border-border transition-colors"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[9px] text-foreground-muted uppercase tracking-[0.1em]">Keywords <span className="normal-case">(comma-sep.)</span></label>
                          <button
                            type="button"
                            onClick={() => setNewRuleCaseSensitive(v => !v)}
                            className="flex items-center gap-1.5 group"
                            title="Toggle case-sensitive matching"
                          >
                            <span className={`text-[9px] font-mono font-bold transition-colors ${newRuleCaseSensitive ? "text-info-text" : "text-foreground-muted group-hover:text-foreground-muted"}`}>Aa</span>
                            <div className={`relative w-7 h-4 rounded-full transition-colors duration-200 ${newRuleCaseSensitive ? "bg-info-text" : "bg-surface"}`}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${newRuleCaseSensitive ? "left-[14px]" : "left-0.5"}`} />
                            </div>
                          </button>
                        </div>
                        <input
                          value={newRuleKeywords}
                          onChange={e => setNewRuleKeywords(e.target.value)}
                          placeholder="hello, hi, hey"
                          className="w-full bg-background border border-border rounded-lg text-[11px] text-foreground placeholder-foreground-muted px-2.5 py-1.5 outline-none focus:border-border transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] text-foreground-muted uppercase tracking-[0.1em] mb-1 block">Auto-reply message</label>
                      <textarea
                        value={newRuleReply}
                        onChange={e => setNewRuleReply(e.target.value)}
                        placeholder="Thank you for contacting us! We'll get back to you shortly."
                        rows={2}
                        className="w-full bg-background border border-border rounded-lg text-[11px] text-foreground placeholder-foreground-muted px-2.5 py-2 outline-none resize-none focus:border-border transition-colors"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {editingRule && (
                        <button
                          onClick={() => { setEditingRule(null); setNewRuleName(""); setNewRuleKeywords(""); setNewRuleReply(""); setNewRuleCaseSensitive(false); }}
                          className="text-[11px] text-foreground-muted hover:text-foreground/60 px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={handleSaveRule}
                        disabled={savingRule || !newRuleKeywords.trim() || !newRuleReply.trim() || !canManageInboxRules}
                        title={!canManageInboxRules ? "Only Admins can manage auto-reply rules" : undefined}
                        className="flex items-center gap-1.5 text-[11px] text-foreground bg-info-text/70 hover:brightness-110 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30"
                      >
                        {savingRule ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        {editingRule ? "Save Changes" : "Add Rule"}
                      </button>
                    </div>
                  </div>

                  {/* Rules list */}
                  {rulesLoading ? (
                    <div className="flex items-center gap-2 py-5 justify-center">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground-muted" />
                      <span className="text-[11px] text-foreground-muted">Loading rules…</span>
                    </div>
                  ) : autoReplyRules.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg py-6 text-center">
                      <p className="text-[11px] text-foreground/50">No auto-reply rules yet.</p>
                      <p className="text-[10px] text-foreground-muted mt-0.5">Add a rule above to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {autoReplyRules.map(rule => (
                        <div
                          key={rule.id}
                          className={`border rounded-lg px-3.5 py-2.5 transition-all ${
                            rule.is_active
                              ? "bg-surface border-border"
                              : "bg-background border-border opacity-40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <p className="text-[11px] text-foreground font-medium truncate">{rule.rule_name}</p>
                                {rule.is_active && (
                                  <span className="text-[8px] text-success-text/60 bg-success-bg border border-success-border px-1.5 py-0.5 rounded-full flex-shrink-0">active</span>
                                )}
                                {rule.is_case_sensitive && (
                                  <span className="text-[8px] text-info-text/60 bg-info-bg border border-info-border px-1.5 py-0.5 rounded-full flex-shrink-0 font-mono">Aa</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mb-1">
                                {rule.keywords.map(kw => (
                                  <span key={kw} className="text-[9px] bg-surface text-foreground-muted border border-border px-1.5 py-0.5 rounded font-mono">{kw}</span>
                                ))}
                              </div>
                              <p className="text-[10px] text-foreground-muted line-clamp-1 italic">&ldquo;{rule.reply_body}&rdquo;</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <button
                                onClick={() => handleToggleRule(rule)}
                                disabled={!canManageInboxRules}
                                className="p-1 rounded-md hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title={rule.is_active ? "Disable" : "Enable"}
                              >
                                {rule.is_active
                                  ? <ToggleRight className="w-4 h-4 text-info-text" />
                                  : <ToggleLeft className="w-4 h-4 text-foreground-muted" />}
                              </button>
                              <button
                                onClick={() => startEditRule(rule)}
                                disabled={!canManageInboxRules}
                                className="p-1 rounded-md text-foreground/50 hover:text-foreground/60 hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                disabled={!canManageInboxRules}
                                className="p-1 rounded-md text-foreground/50 hover:text-error-text hover:brightness-110 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteRuleConfirm && (
        <ConfirmActionModal
          open={!!deleteRuleConfirm}
          variant="danger"
          title="Delete Auto-Reply Rule"
          message="Delete this auto-reply rule?"
          confirmLabel="Delete"
          onConfirm={async () => {
            const { id } = deleteRuleConfirm;
            setDeleteRuleConfirm(null);
            try {
              await api.deleteInboxAutoReplyRule(id);
              setAutoReplyRules(prev => prev.filter(r => r.id !== id));
            } catch { /* silent */ }
          }}
          onCancel={() => setDeleteRuleConfirm(null)}
        />
      )}

      {showDeleteSelectedConfirm && (
        <ConfirmActionModal
          open={showDeleteSelectedConfirm}
          variant="danger"
          title="Delete Messages"
          message={`Delete ${checkedIds.size} message${checkedIds.size > 1 ? "s" : ""} from inbox? This cannot be undone.`}
          confirmLabel="Delete"
          loading={deleting}
          onConfirm={executeDeleteSelected}
          onCancel={() => setShowDeleteSelectedConfirm(false)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
