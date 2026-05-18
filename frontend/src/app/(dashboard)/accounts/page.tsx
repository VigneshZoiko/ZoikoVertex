"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus, Trash2, AlertCircle, X, Shield,
  RefreshCw, Link2, CheckCircle2, Zap,
} from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface ConnectedAccount {
  id: string;
  platform: "facebook" | "instagram" | "linkedin" | "twitter" | "pinterest" | "threads" | "youtube";
  account_name: string;
  account_handle?: string;
  avatar_url?: string;
  status: string;
  expires_at?: string;
}

/* ─── Platform Config ────────────────────────────────────────────────────── */
const PLATFORMS = [
  {
    id: "facebook",
    name: "Facebook",
    description: "Pages, Groups & Ad Accounts",
    color: "#1877F2",
    lightBg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
    oauth: true,
    comingSoon: false,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Business & Creator Profiles (via Facebook OAuth)",
    color: "#E4405F",
    lightBg: "bg-pink-500/10",
    border: "border-pink-500/20",
    text: "text-pink-400",
    oauth: true,
    comingSoon: false,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Company Pages & Personal Profiles",
    color: "#0A66C2",
    lightBg: "bg-sky-500/10",
    border: "border-sky-500/20",
    text: "text-sky-400",
    oauth: true,
    comingSoon: false,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    id: "twitter",
    name: "X / Twitter",
    description: "Public Posts & Thread Campaigns",
    color: "#18181b",
    lightBg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
    text: "text-zinc-300",
    oauth: true,
    comingSoon: false,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    id: "pinterest",
    name: "Pinterest",
    description: "Boards, Pins & Visual Campaigns",
    color: "#BD081C",
    lightBg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-400",
    oauth: true,
    comingSoon: false,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    ),
  },
  {
    id: "threads",
    name: "Threads",
    description: "Text & Conversational Content",
    color: "#18181b",
    lightBg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
    text: "text-zinc-300",
    oauth: true,
    comingSoon: false,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.284-.883-2.292-.887h-.1c-.96 0-1.941.292-2.74 1.019l-1.378-1.487c1.171-1.081 2.641-1.616 4.2-1.616h.143c3.179.013 5.024 1.913 5.382 5.375.368.085.724.194 1.062.33 1.409.568 2.485 1.553 3.113 2.844.897 1.843.886 4.453-.984 6.274-1.978 1.935-4.355 2.77-7.534 2.793zm.058-9.013c-.042 0-.083 0-.124.002-1.19.066-2.087.425-2.604.957-.392.4-.565.922-.535 1.553.063 1.193 1.026 1.972 2.45 1.9 1.146-.063 1.984-.538 2.491-1.41.345-.586.544-1.362.596-2.352a11.546 11.546 0 0 0-2.274-.65z"/>
      </svg>
    ),
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Video Content & Shorts",
    color: "#FF0000",
    lightBg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-400",
    oauth: true,
    comingSoon: false,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Short-form Video & Trending Content",
    color: "#010101",
    lightBg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
    text: "text-zinc-300",
    oauth: true,
    comingSoon: false,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
  },
];

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function AccountsPage() {
  const [accounts, setAccounts]                         = useState<ConnectedAccount[]>([]);
  const [loading, setLoading]                           = useState(true);
  const [error, setError]                               = useState<string | null>(null);
  const [success, setSuccess]                           = useState<string | null>(null);
  const { role: userRole, isSuperAdmin, isLoading } = useRoles();
  const [isSubmitting, setIsSubmitting]                 = useState<string | null>(null);
  const [disconnecting, setDisconnecting]               = useState<string | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState<string | null>(null);
  const [liPageSession, setLiPageSession]               = useState<string | null>(null);
  const [liPages, setLiPages]                           = useState<{ id: string; name: string; urn: string }[]>([]);
  const [selectedPageIds, setSelectedPageIds]           = useState<Set<string>>(new Set());
  const [savingPages, setSavingPages]                   = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/api/v1/accounts");
      if (result.success) setAccounts(result.data || []);
    } catch {
      setError("Failed to load accounts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchAccounts();
    }
  }, [fetchAccounts, isLoading]);

  useEffect(() => {
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const reason = searchParams.get("reason");
    if (!status) return;

    if (status === "success" && platform) {
      setSuccess(`${platform.charAt(0).toUpperCase() + platform.slice(1)} account connected successfully!`);
      fetchAccounts();
    } else if (status === "linkedin_pages") {
      const session = searchParams.get("session");
      if (session) {
        router.replace("/accounts");
        api.get(`/api/v1/accounts/linkedin/pages?session=${session}`).then((res) => {
          if (res.success && res.data?.length > 0) {
            setLiPages(res.data);
            setSelectedPageIds(new Set(res.data.map((p: { id: string }) => p.id)));
            setLiPageSession(session);
          } else {
            setError("No LinkedIn pages found where you are an admin.");
          }
        });
        return;
      }
    } else if (status === "error") {
      setError(reason ? decodeURIComponent(reason) : "Failed to connect account. Please try again.");
    }
    router.replace("/accounts");
  }, [searchParams, router, fetchAccounts]);

  const saveSelectedPages = async () => {
    if (!liPageSession || selectedPageIds.size === 0) return;
    setSavingPages(true);
    try {
      const res = await api.post("/api/v1/accounts/linkedin/pages", {
        session: liPageSession,
        selectedPageIds: Array.from(selectedPageIds),
      });
      if (res.success) {
        setSuccess(`${res.data?.count || selectedPageIds.size} LinkedIn page(s) connected successfully!`);
        setLiPageSession(null);
        setLiPages([]);
        setSelectedPageIds(new Set());
        fetchAccounts();
      } else {
        setError(res.error?.message || "Failed to save pages.");
      }
    } catch {
      setError("Failed to save pages. Please try again.");
    } finally {
      setSavingPages(false);
    }
  };

  const disconnectAccount = async (id: string) => {
    setConfirmingDisconnect(null);
    setDisconnecting(id);
    try {
      await api.delete(`/api/v1/accounts/${id}`);
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch {
      setError("Failed to disconnect account. Please try again.");
    } finally {
      setDisconnecting(null);
    }
  };

  const handleConnect = async (platformId: string) => {
    setIsSubmitting(platformId);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found.");
      
      let workspaceId = '00000000-0000-0000-0000-000000000000'; // Default Dev Workspace
      const { data: member } = await supabase
        .from("workspace_members").select("workspace_id").eq("user_id", user.id).maybeSingle();
      
      if (member) workspaceId = member.workspace_id;

      const backendUrl =
        process.env.NEXT_PUBLIC_OAUTH_BACKEND_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:5005";

      if (platformId === "facebook" || platformId === "instagram") {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID || "989391590153112";
        const redirectUri = encodeURIComponent(`${backendUrl}/api/auth/facebook/callback`);
        const scope = ["public_profile","email","pages_show_list","pages_read_engagement","pages_manage_posts","instagram_basic","instagram_content_publish","business_management"].join(",");
        const state = encodeURIComponent(JSON.stringify({ workspaceId, platform: platformId }));
        window.location.assign(`https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&response_type=code`);
      } else if (platformId === "linkedin") {
        const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID || "";
        const redirectUri = encodeURIComponent(`${backendUrl}/api/auth/linkedin/callback`);
        const state = encodeURIComponent(JSON.stringify({ workspaceId, platform: "linkedin" }));
        const scope = encodeURIComponent("openid profile email w_member_social");
        window.location.assign(`https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`);
      } else if (platformId === "linkedin_page") {
        const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID || "";
        const redirectUri = encodeURIComponent(`${backendUrl}/api/auth/linkedin/callback`);
        const state = encodeURIComponent(JSON.stringify({ workspaceId, platform: "linkedin", flowType: "page" }));
        const scope = encodeURIComponent("openid profile email w_member_social r_organization_social w_organization_social");
        window.location.assign(`https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`);
      } else if (platformId === "pinterest") {
        const clientId = process.env.NEXT_PUBLIC_PINTEREST_APP_ID || "";
        if (!clientId) {
          setError("Pinterest integration is not yet configured. Please contact support.");
          setIsSubmitting(null);
          return;
        }
        const redirectUri = encodeURIComponent(`${backendUrl}/api/auth/pinterest/callback`);
        const state = encodeURIComponent(JSON.stringify({ workspaceId }));
        window.location.assign(`https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=boards:read,pins:read,pins:write&state=${state}`);
      } else if (platformId === "threads") {
        const appId = process.env.NEXT_PUBLIC_THREADS_APP_ID || "";
        if (!appId) {
          setError("Threads integration is not yet configured. Please contact support.");
          setIsSubmitting(null);
          return;
        }
        const redirectUri = encodeURIComponent(`${backendUrl}/api/auth/threads/callback`);
        const state = encodeURIComponent(JSON.stringify({ workspaceId }));
        window.location.assign(`https://threads.net/oauth/authorize?client_id=${appId}&redirect_uri=${redirectUri}&scope=threads_basic,threads_content_publish&state=${state}&response_type=code`);
      } else if (platformId === "twitter") {
        const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID || "ZGtmZHMxdUJWU3BMUS15VXpjVXk6MTpjaQ";
        const redirectUri = encodeURIComponent(`${backendUrl}/api/auth/twitter/callback`);
        const codeChallenge = "zoikovertex_twitter_oauth2_pkce_plain_challenge_string";
        const state = encodeURIComponent(workspaceId);
        const scope = encodeURIComponent("tweet.read tweet.write users.read offline.access");
        window.location.assign(`https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=plain`);
      } else if (platformId === "youtube") {
        const clientId = process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID || "";
        if (!clientId) {
          setError("YouTube integration is not yet configured. Please contact support.");
          setIsSubmitting(null);
          return;
        }
        const redirectUri = encodeURIComponent(`${backendUrl}/api/auth/youtube/callback`);
        const state = encodeURIComponent(workspaceId);
        const scope = encodeURIComponent("https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly");
        window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`);
      } else if (platformId === "tiktok") {
        const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || "";
        if (!clientKey) {
          setError("TikTok integration is not yet configured. Please contact support.");
          setIsSubmitting(null);
          return;
        }
        const redirectUri = encodeURIComponent(`${backendUrl}/api/auth/tiktok/callback`);
        const state = encodeURIComponent(workspaceId);
        const scope = encodeURIComponent("user.info.basic,video.upload,video.publish");
        window.location.assign(`https://www.tiktok.com/v2/auth/authorize?client_key=${clientKey}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`);
      } else {
        setError(`${platformId.charAt(0).toUpperCase() + platformId.slice(1)} integration is coming soon.`);
        setIsSubmitting(null);
      }
    } catch {
      setError("Failed to connect account. Please try again.");
      setIsSubmitting(null);
    }
  };

  const oauthPlatforms    = PLATFORMS.filter(p => p.oauth);
  const connectedPlatforms = oauthPlatforms.filter(p => accounts.some(a => a.platform === p.id)).length;
  const totalAccounts      = accounts.length;

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-56 skeleton-shimmer rounded-xl" />
          <div className="h-4 w-72 skeleton-shimmer rounded-lg" />
        </div>
        <div className="space-y-px">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-16 skeleton-shimmer rounded-2xl" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Platform Accounts</h1>
        <p className="text-[var(--foreground-muted)] text-sm mt-1">
          Connect and manage your social media accounts.
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Platforms Connected",   value: connectedPlatforms,                      icon: Link2,        color: "text-indigo-400",  bg: "bg-indigo-500/10"  },
          { label: "Total Accounts",         value: totalAccounts,                            icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Available",              value: oauthPlatforms.length - connectedPlatforms, icon: Zap,       color: "text-amber-400",   bg: "bg-amber-500/10"   },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-black text-[var(--foreground)] tabular-nums leading-none">{s.value}</p>
                <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Alerts ── */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="flex-1">{success}</p>
          <button onClick={() => setSuccess(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 flex items-center gap-3 text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Platform List ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
        {PLATFORMS.map((platform) => {
          const Icon = platform.Icon;
          const platformAccounts = accounts.filter(a => a.platform === platform.id);
          const isConnecting = isSubmitting === platform.id;

          return (
            <div key={platform.id}>

              {/* Platform row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm${platform.comingSoon ? " opacity-40" : ""}`}
                  style={{ backgroundColor: platform.color }}
                >
                  <Icon />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold text-sm${platform.comingSoon ? " text-[var(--foreground-muted)]" : " text-[var(--foreground)]"}`}>
                      {platform.name}
                    </p>
                    {platform.comingSoon && (
                      <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full">
                        Coming Soon
                      </span>
                    )}
                    {!platform.comingSoon && platformAccounts.length > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {platformAccounts.length} connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{platform.description}</p>
                </div>

                {!platform.comingSoon && (userRole !== "CREATOR" || isSuperAdmin) && (
                  <div className="flex items-center gap-2 shrink-0">
                    {platform.id === "linkedin" && (
                      <button
                        onClick={() => handleConnect("linkedin_page")}
                        disabled={isSubmitting === "linkedin_page"}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all duration-150 disabled:opacity-60 hover:opacity-90 active:scale-95 border"
                        style={{ color: platform.color, borderColor: platform.color + "55", backgroundColor: platform.color + "11" }}
                      >
                        {isSubmitting === "linkedin_page"
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Link2 className="w-3.5 h-3.5" />
                        }
                        Page
                      </button>
                    )}
                    <button
                      onClick={() => handleConnect(platform.id)}
                      disabled={isConnecting}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white rounded-lg transition-all duration-150 disabled:opacity-60 hover:opacity-90 active:scale-95"
                      style={{ backgroundColor: platform.color }}
                    >
                      {isConnecting
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <Plus className="w-3.5 h-3.5" />
                      }
                      Connect
                    </button>
                  </div>
                )}
              </div>

              {/* Connected accounts */}
              {!platform.comingSoon && platformAccounts.length > 0 && (
                <div className="bg-[var(--surface)] border-t border-[var(--border)] divide-y divide-[var(--border)]">
                  {platformAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 px-5 py-3 pl-[72px]"
                    >
                      {/* Avatar */}
                      {account.avatar_url ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--border)] shrink-0">
                          <Image
                            src={account.avatar_url}
                            alt={account.account_name}
                            width={32} height={32}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className={`w-8 h-8 rounded-full ${platform.lightBg} border ${platform.border} flex items-center justify-center shrink-0`}>
                          <span className={`text-xs font-bold ${platform.text}`}>
                            {account.account_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                          {account.account_name}
                        </p>
                        <p className="text-xs text-[var(--foreground-muted)] truncate">
                          {account.account_handle
                            ? `@${account.account_handle.replace(/^@/, "")}`
                            : `ID: ${account.id.substring(0, 12)}…`}
                        </p>
                      </div>

                      {/* Status + disconnect */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                        {(userRole !== "CREATOR" || isSuperAdmin) && (
                          confirmingDisconnect === account.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-[var(--foreground-muted)]">Remove?</span>
                              <button
                                onClick={() => disconnectAccount(account.id)}
                                disabled={disconnecting === account.id}
                                className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 text-[11px] font-semibold rounded-lg transition-all duration-150 disabled:opacity-50"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmingDisconnect(null)}
                                className="px-2.5 py-1.5 bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--foreground-muted)] text-[11px] font-semibold rounded-lg transition-all duration-150"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmingDisconnect(account.id)}
                              disabled={disconnecting === account.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[11px] font-semibold rounded-lg transition-all duration-150 disabled:opacity-50"
                            >
                              {disconnecting === account.id
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <Trash2 className="w-3 h-3" />
                              }
                              Remove
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* ── LinkedIn Page Picker Modal ── */}
      {liPageSession && liPages.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border)]">
              <div>
                <h2 className="text-sm font-bold text-[var(--foreground)]">Select LinkedIn Pages</h2>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Choose which pages to connect. You can select multiple.</p>
              </div>
              <button onClick={() => { setLiPageSession(null); setLiPages([]); setSelectedPageIds(new Set()); }} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-[var(--border)] max-h-72 overflow-y-auto">
              {liPages.map((page) => {
                const checked = selectedPageIds.has(page.id);
                return (
                  <label key={page.id} className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-[var(--surface)] transition-colors">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedPageIds(prev => {
                          const next = new Set(prev);
                          checked ? next.delete(page.id) : next.add(page.id);
                          return next;
                        });
                      }}
                      className="w-4 h-4 rounded accent-[#0A66C2]"
                    />
                    <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 border border-[#0A66C2]/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#0A66C2]">{page.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{page.name}</p>
                      <p className="text-[11px] text-[var(--foreground-muted)] truncate">{page.urn}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
              <span className="text-xs text-[var(--foreground-muted)]">{selectedPageIds.size} of {liPages.length} selected</span>
              <button
                onClick={saveSelectedPages}
                disabled={savingPages || selectedPageIds.size === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0A66C2] hover:bg-[#0A66C2]/90 rounded-lg transition-all disabled:opacity-50"
              >
                {savingPages ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Connect {selectedPageIds.size > 0 ? `${selectedPageIds.size} Page${selectedPageIds.size > 1 ? "s" : ""}` : "Pages"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Security note ── */}
      <div className="flex items-start gap-3 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
        <Shield className="w-4 h-4 text-[var(--foreground-muted)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
          ZoikoVertex uses enterprise-grade OAuth 2.0. Tokens are encrypted at rest and never stored in plaintext.
          You can revoke access at any time from your provider&apos;s security settings.
        </p>
      </div>

    </div>
  );
}
