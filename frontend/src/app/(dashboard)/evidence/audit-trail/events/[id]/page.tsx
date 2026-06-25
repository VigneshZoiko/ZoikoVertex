"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, ShieldAlert, Clock } from "lucide-react";

interface AuditEvent {
  id: string;
  event_title: string;
  event_summary: string;
  event_type: string;
  timestamp_utc: string;
  actor: { actor_name?: string; actor_type: string; actor_id: string };
  object: { object_type: string; object_name?: string };
  risk_level: string;
  status: string;
}

const STATUS_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  success: { icon: <CheckCircle2 className="w-5 h-5" />, label: "Completed", color: "text-green-400" },
  failed: { icon: <XCircle className="w-5 h-5" />, label: "Failed", color: "text-red-400" },
  blocked: { icon: <ShieldAlert className="w-5 h-5" />, label: "Blocked", color: "text-orange-400" },
  pending: { icon: <Clock className="w-5 h-5" />, label: "Pending", color: "text-yellow-400" },
};

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

function timeAgo(ts: string) {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} minutes ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hours ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  } catch { return "—"; }
}

function buildStory(event: AuditEvent): string {
  if (event.event_summary) return event.event_summary;
  if (event.event_title) return event.event_title;
  const actor = event.actor?.actor_name || event.actor?.actor_type || "System";
  const what = event.event_type?.replace(/_/g, " ") || "did something";
  const target = event.object?.object_name || event.object?.object_type?.replace(/_/g, " ") || "";
  return `${actor} ${what}${target ? ` on ${target}` : ""}`;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<AuditEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/api/audit-events/${params.id}`);
        if (res.success) setEvent(res.data);
      } catch (err: any) { setError(err?.message || "Failed to load"); }
      finally { setLoading(false); }
    }
    if (params.id) load();
  }, [params.id]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 text-foreground-muted text-sm">Loading…</div>;
  if (error) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
        <button onClick={() => router.back()} className="mt-3 text-xs text-foreground-muted hover:text-foreground">← Back</button>
      </div>
    </div>
  );
  if (!event) return <div className="max-w-3xl mx-auto px-4 py-8 text-foreground-muted">Event not found.</div>;

  const statusMeta = STATUS_META[event.status] || { icon: null, label: event.status, color: "text-foreground-muted" };
  const story = buildStory(event);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Main Card */}
      <div className="bg-surface border border-border rounded-xl p-6">
        {/* Title */}
        <h1 className="text-lg font-bold text-foreground mb-3">
          {event.event_title?.replace(/_/g, " ") || "Action recorded"}
        </h1>

        {/* Story */}
        <p className="text-sm leading-relaxed text-foreground">{story}</p>

        {/* Result */}
        <div className={`mt-5 flex items-center gap-2 text-sm ${statusMeta.color}`}>
          {statusMeta.icon}
          <span className="font-medium">{statusMeta.label}</span>
        </div>
      </div>

      {/* Who + When */}
      <div className="bg-surface border border-border rounded-xl p-4 mt-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-foreground-muted">By</span>
            <p className="text-sm text-foreground mt-0.5">
              {event.actor?.actor_name || event.actor?.actor_type || "System"}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-foreground-muted">When</span>
            <p className="text-sm text-foreground mt-0.5">{fmt(event.timestamp_utc)}</p>
            <p className="text-[11px] text-foreground-muted">{timeAgo(event.timestamp_utc)}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border text-xs text-foreground-muted">
          {event.event_type?.replace(/_/g, " ")}
          {event.object?.object_type && <> · Target: {event.object.object_type.replace(/_/g, " ")}{event.object?.object_name ? `: ${event.object.object_name}` : ""}</>}
        </div>
      </div>
    </div>
  );
}
