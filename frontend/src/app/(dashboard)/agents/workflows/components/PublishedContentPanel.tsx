"use client";

import React from "react";
import { Send, Clock, Bot, ImageIcon, FileText, ShieldCheck, ShieldAlert, ShieldX, Trash2 } from "lucide-react";

export interface PublishCheck {
  verdict: "safe" | "review" | "block";
  severity: string;
  risk: number;
  flags: { category: string; text: string; severity: string }[];
}

export interface PublishedContentItem {
  id: string;
  source: "publish" | "schedule";
  platform: string | null;
  content: string;
  mediaUrl: string | null;
  status: string | null;
  createdAt: string | null;
  scheduledTime: string | null;
  agentName: string | null;
  check: PublishCheck | null;
}

const VERDICT_STYLES: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
  safe: { cls: "bg-success-text/10 text-success-text border-success-border/20", icon: <ShieldCheck className="w-3 h-3" />, label: "Safe" },
  review: { cls: "bg-warning-text/10 text-warning-text border-warning-border/20", icon: <ShieldAlert className="w-3 h-3" />, label: "Review" },
  block: { cls: "bg-error-text/10 text-error-text border-error-border/20", icon: <ShieldX className="w-3 h-3" />, label: "Blocked" },
};

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PublishedContentPanel({
  data,
  onDelete,
}: {
  data?: PublishedContentItem[];
  onDelete?: (item: PublishedContentItem) => void;
}) {
  if (!data) {
    return <div className="h-48 animate-pulse bg-[var(--surface)] rounded-2xl" />;
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-hover)]/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-info-text/10 rounded-xl">
            <Send className="w-5 h-5 text-info-text" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Published Content
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Posts published or scheduled from the Publish Hub — each linked to its agent
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-info-text/10 text-info-text border border-info-border/20">
          {data.length} items
        </span>
      </div>

      {data.length === 0 ? (
        <div className="p-10 text-center">
          <ImageIcon className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--text-muted)]">
            No published content yet. Publish or schedule a post from the Publish Hub and it will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-y-auto max-h-[420px] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((item) => (
            <div
              key={`${item.source}-${item.id}`}
              className="flex gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/20 hover:border-[var(--border-hover)] transition-colors"
            >
              {/* Media thumbnail */}
              <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center">
                {item.mediaUrl ? (
                  /\.(mp4|mov|webm|avi|mkv|m4v|ogv)(\?.*)?$/i.test(item.mediaUrl) ? (
                    <video
                      src={item.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      onError={(e) => {
                        const vid = e.currentTarget;
                        vid.style.display = "none";
                        const fallback = vid.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.mediaUrl}
                      alt="post media"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = "none";
                        const fallback = img.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  )
                ) : null}
                <span
                  className="w-full h-full items-center justify-center"
                  style={{ display: item.mediaUrl ? "none" : "flex" }}
                >
                  <FileText className="w-5 h-5 text-[var(--text-muted)]" />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  {item.platform && (
                    <span className="px-1.5 py-0.5 rounded-md bg-info-text/10 text-info-text border border-info-border/20 text-[9px] font-bold uppercase tracking-wide">
                      {item.platform}
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded-md bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)] text-[9px] font-semibold uppercase tracking-wide">
                    {item.source === "schedule" ? "Scheduled" : "Published"}
                  </span>
                  {item.check && VERDICT_STYLES[item.check.verdict] && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wide ${VERDICT_STYLES[item.check.verdict].cls}`}>
                      {VERDICT_STYLES[item.check.verdict].icon}
                      {VERDICT_STYLES[item.check.verdict].label}
                      {item.check.risk > 0 && <span className="opacity-70">· {item.check.risk}%</span>}
                    </span>
                  )}
                  {item.status && (
                    <span className="text-[9px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
                      {item.status}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--text-primary)] line-clamp-2 leading-snug">
                  {item.content || <span className="text-[var(--text-muted)] italic">No caption</span>}
                </p>

                {/* Agent check: flagged terms (offensive / banned / PII / etc.) */}
                {item.check && item.check.verdict !== "safe" && item.check.flags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.check.flags.slice(0, 6).map((f, i) => (
                      <span
                        key={`${f.category}-${i}`}
                        title={`${f.category} · ${f.severity}`}
                        className="px-1.5 py-0.5 rounded bg-error-text/10 text-error-text border border-error-border/20 text-[9px] font-medium"
                      >
                        {f.text || f.category}
                      </span>
                    ))}
                  </div>
                )}
                {item.check && item.check.verdict === "safe" && (
                  <p className="mt-1.5 text-[10px] text-success-text/80 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> No policy or safety issues detected
                  </p>
                )}

                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1 text-success-text">
                    <Bot className="w-3 h-3" />
                    {item.agentName || "Unassigned agent"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.source === "schedule" && item.scheduledTime
                      ? new Date(item.scheduledTime).toLocaleString()
                      : timeAgo(item.createdAt)}
                  </span>
                </div>
              </div>

              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item);
                  }}
                  title="Remove from view"
                  aria-label="Remove post from view"
                  className="shrink-0 self-start p-1 rounded-md text-[var(--text-muted)] hover:text-error-text hover:bg-error-text/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
