"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { User, Bot, Server, HelpCircle } from "lucide-react";

// ─── In-memory cache for actor ID → display name lookups ──────────
const actorCache = new Map<string, { name: string; type: string }>();
let fetchPromise: Promise<void> | null = null;

async function warmActorCache() {
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    try {
      const res = await api.get("/api/identity-ledger/actors?limit=200");
      if (res.success && Array.isArray(res.data)) {
        for (const a of res.data) {
          actorCache.set(a.actor_id, {
            name: a.display_name || a.email || a.actor_id.substring(0, 8),
            type: a.actor_type || "human",
          });
        }
      }
    } catch {
      // Silent fail — cache stays empty, we'll use fallback display
    }
  })();
  return fetchPromise;
}

function lookupActor(id: string): { name: string; type: string } | null {
  return actorCache.get(id) || null;
}

// ─── Props ─────────────────────────────────────────────────────────
interface ActorDisplayProps {
  /** Display name from the API (e.g. "Sarah Chen", "ContentBot-v3") */
  name?: string | null;
  /** Actor type (human, ai_agent, system, service_account) */
  type?: string | null;
  /** Fallback actor/user ID used for cache lookup if name is not available */
  id?: string | null;
  /** Size variant */
  size?: "sm" | "md";
}

// ─── Component ─────────────────────────────────────────────────────
export default function ActorDisplay({ name, type, id, size = "sm" }: ActorDisplayProps) {
  const [resolved, setResolved] = useState<{ name: string; type: string } | null>(null);
  const fetchedRef = useRef(false);

  // If we have a name and type from props, use them directly
  const hasDirect = !!name && name.length > 0;

  // If only an ID is provided, try to resolve from cache or API
  useEffect(() => {
    if (hasDirect || !id || fetchedRef.current) return;
    fetchedRef.current = true;

    const cached = lookupActor(id);
    if (cached) {
      setResolved(cached);
      return;
    }

    // Warm cache and try again
    warmActorCache().then(() => {
      const cached2 = lookupActor(id!);
      if (cached2) setResolved(cached2);
      else {
        // Fallback: show truncated ID
        setResolved({
          name: id!.substring(0, 8) + "…",
          type: "unknown",
        });
      }
    });
  }, [hasDirect, id]);

  const displayName = hasDirect
    ? name!
    : resolved
      ? resolved.name
      : id
        ? id.substring(0, 8) + "…"
        : "Unknown";

  const displayType = hasDirect
    ? type || "unknown"
    : resolved
      ? resolved.type
      : "unknown";

  const isHuman = displayType === "human";
  const isAI = displayType === "ai_agent";
  const isSystem = displayType === "system" || displayType === "service_account";

  const icon = isHuman ? User : isAI ? Bot : isSystem ? Server : HelpCircle;
  const iconColor = isHuman ? "text-blue-400" : isAI ? "text-purple-400" : isSystem ? "text-cyan-400" : "text-foreground-muted";
  const badgeColor = isHuman ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
    : isAI ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
    : isSystem ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
    : "text-foreground-muted bg-surface-hover border-border";
  const badgeLabel = isHuman ? "Human" : isAI ? "AI" : isSystem ? "System" : displayType;

  const textSize = size === "sm" ? "text-[11px]" : "text-sm";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${iconSize} ${iconColor} shrink-0`}>
        {icon === User && <User className={iconSize} />}
        {icon === Bot && <Bot className={iconSize} />}
        {icon === Server && <Server className={iconSize} />}
        {icon === HelpCircle && <HelpCircle className={iconSize} />}
      </span>
      <span className={`${textSize} text-foreground font-medium`}>{displayName}</span>
      <span className={`text-[9px] px-1 py-0.5 rounded border ${badgeColor} leading-none`}>
        {badgeLabel}
      </span>
    </span>
  );
}

// ─── Simple "by X" label for use in context lines ────────────────────
export function ByActor({ name, type, id, size = "sm" }: ActorDisplayProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-foreground-muted">by </span>
      <ActorDisplay name={name} type={type} id={id} size={size} />
    </span>
  );
}
