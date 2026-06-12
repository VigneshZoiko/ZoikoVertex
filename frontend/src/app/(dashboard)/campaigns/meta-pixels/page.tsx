"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Zap, ExternalLink, Trash2, RefreshCw, AlertCircle,
  CheckCircle2, Clock, MoreHorizontal, Plus, Info,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface MetaPixel {
  id:              string;
  name:            string;
  creation_time:   string | null;
  last_fired_time: string | null;
}

function timeAgo(isoOrUnix: string | null): string {
  if (!isoOrUnix) return "Never";
  const ms = /^\d+$/.test(isoOrUnix)
    ? parseInt(isoOrUnix) * 1000
    : new Date(isoOrUnix).getTime();
  const diff = Date.now() - ms;
  if (diff < 60_000)   return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function pixelStatus(lastFired: string | null): { label: string; color: string } {
  if (!lastFired) return { label: "Waiting for activity", color: "text-zinc-400" };
  const ms   = /^\d+$/.test(lastFired) ? parseInt(lastFired) * 1000 : new Date(lastFired).getTime();
  const days = (Date.now() - ms) / 86_400_000;
  if (days < 1)  return { label: "Active",        color: "text-success-text" };
  if (days < 7)  return { label: "Active",        color: "text-success-text" };
  if (days < 30) return { label: "Issues found",  color: "text-warning-text"   };
  return              { label: "Inactive",         color: "text-zinc-400"    };
}

export default function MetaPixelsPage() {
  const [pixels,    setPixels]    = useState<MetaPixel[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [adAcctId,  setAdAcctId]  = useState<string | null>(null);
  const [openMenu,  setOpenMenu]  = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get("/api/v1/campaigns/meta/pixels");
      setPixels(r.data?.pixels  || []);
      setAdAcctId(r.data?.ad_account_id || null);
      if (r.data?.error) setError(r.data.error);
    } catch {
      setError("Failed to load pixels. Check your Meta account connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (pixelId: string) => {
    if (!confirm("Remove this pixel from your ad account? This cannot be undone.")) return;
    setDeleting(pixelId);
    setDeleteErr(null);
    try {
      await api.delete(`/api/v1/campaigns/meta/pixels/${pixelId}`);
      setPixels(p => p.filter(x => x.id !== pixelId));
    } catch {
      setDeleteErr("Failed to remove pixel. You may not have admin access.");
    } finally {
      setDeleting(null);
      setOpenMenu(null);
    }
  };

  const eventsManagerUrl = adAcctId
    ? `https://business.facebook.com/events_manager2/list/pixel/${adAcctId}`
    : "https://business.facebook.com/events_manager";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-blue-400" />
              <h1 className="text-2xl font-bold text-foreground">Meta Pixels</h1>
            </div>
            <p className="text-sm text-foreground-muted">
              Monitor the Meta Pixels connected to your ad account. Events may take up to 10 minutes to appear.{" "}
              <a href={eventsManagerUrl} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:underline">
                View event breakdown in Events Manager →
              </a>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={load} className="p-2 rounded-lg border border-border hover:bg-surface text-foreground-muted">
              <RefreshCw className="w-4 h-4" />
            </button>
            <a href={eventsManagerUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors">
              <Plus className="w-4 h-4" />
              Add Pixel
            </a>
          </div>
        </div>

        {/* CAPI info banner */}
        <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-300">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-blue-200">Conversions API (CAPI)</span>
            {" — "}Track server-side events for more accurate conversion data, even with ad blockers or iOS privacy restrictions.{" "}
            <a href="https://business.facebook.com/business/help/2041148702652490" target="_blank" rel="noopener noreferrer"
              className="underline hover:text-blue-200">
              Set up Conversions API directly in Meta Events Manager →
            </a>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-error-text/10 border border-error-border/20 rounded-xl text-sm text-error-text">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {deleteErr && (
          <div className="flex items-center gap-2 p-3 bg-error-text/10 border border-error-border/20 rounded-xl text-sm text-error-text">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {deleteErr}
          </div>
        )}

        {/* Pixels table */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-foreground-muted">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading pixels…</span>
            </div>
          ) : pixels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No pixels found</p>
                <p className="text-sm text-foreground-muted mt-1">
                  Create a Meta Pixel in Events Manager, then it will appear here.
                </p>
              </div>
              <a href={eventsManagerUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors">
                Open Events Manager
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-border bg-background/40">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground-muted">Meta Pixel</span>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground-muted">Last Active</span>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground-muted">Status</span>
                <span className="w-8" />
              </div>

              {/* Rows */}
              {pixels.map(pixel => {
                const status = pixelStatus(pixel.last_fired_time);
                return (
                  <div key={pixel.id}
                    className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center px-6 py-5 border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">

                    {/* Pixel name + ID */}
                    <div>
                      <p className="font-medium text-foreground text-sm">{pixel.name}</p>
                      <p className="text-xs text-foreground-muted mt-0.5">ID {pixel.id}</p>
                    </div>

                    {/* Last active */}
                    <div className="flex items-center gap-1.5 text-sm text-foreground-muted">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {timeAgo(pixel.last_fired_time)}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 text-sm">
                      {status.label === "Active" && <CheckCircle2 className="w-3.5 h-3.5 text-success-text shrink-0" />}
                      {status.label === "Issues found" && <AlertCircle className="w-3.5 h-3.5 text-warning-text shrink-0" />}
                      {(status.label === "Inactive" || status.label === "Waiting for activity") &&
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-600 shrink-0" />}
                      <span className={status.color}>{status.label}</span>
                    </div>

                    {/* Actions menu */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === pixel.id ? null : pixel.id)}
                        className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-white/5 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {openMenu === pixel.id && (
                        <div className="absolute right-0 top-8 z-30 w-52 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
                          <a
                            href={`https://business.facebook.com/events_manager2/list/pixel/${pixel.id}/overview`}
                            target="_blank" rel="noopener noreferrer"
                            onClick={() => setOpenMenu(null)}
                            className="flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-white/5 transition-colors">
                            <ExternalLink className="w-4 h-4 text-foreground-muted" />
                            Go to Events Manager
                          </a>
                          <Link
                            href={`/campaigns/new?objective=CONVERSIONS&pixel_id=${pixel.id}&pixel_name=${encodeURIComponent(pixel.name)}`}
                            onClick={() => setOpenMenu(null)}
                            className="flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-white/5 transition-colors border-t border-border">
                            <Zap className="w-4 h-4 text-foreground-muted" />
                            Use in Campaign
                          </Link>
                          <button
                            onClick={() => handleDelete(pixel.id)}
                            disabled={deleting === pixel.id}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-error-text hover:bg-error-text/10 transition-colors border-t border-border">
                            <Trash2 className="w-4 h-4" />
                            {deleting === pixel.id ? "Removing…" : "Delete Meta Pixel"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* How it works */}
        <div className="p-5 bg-surface border border-border rounded-2xl space-y-3">
          <h3 className="text-sm font-semibold text-foreground">How Meta Pixels work with your campaigns</h3>
          <div className="space-y-2 text-sm text-foreground-muted">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold mt-0.5">1</span>
              <span>Install your Meta Pixel on your website via the base code from Events Manager.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold mt-0.5">2</span>
              <span>Select your pixel when creating a <strong className="text-foreground">Sales &amp; Conversions</strong> campaign in the wizard.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold mt-0.5">3</span>
              <span>Meta optimises ad delivery towards people most likely to complete your chosen conversion event (Purchase, Lead, etc.).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold mt-0.5">4</span>
              <span>For server-side tracking accuracy, set up <strong className="text-foreground">Conversions API</strong> directly in Meta Events Manager.</span>
            </div>
          </div>
        </div>

      </div>

      {/* Click-away to close menu */}
      {openMenu && (
        <div className="fixed inset-0 z-20" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  );
}
