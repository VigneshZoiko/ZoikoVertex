"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  FolderKanban,
  Briefcase,
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
import { useDraftGuard } from "@/lib/context/DraftGuardContext";
import { api } from "@/lib/api";

function PublishPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isDirty, setIsDirty } = useDraftGuard();

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

  // Governance State
  const [userRole, setUserRole] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  // Recent publish intents (for status diagnostics)
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const pollTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Scheduled Posts State
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [selectedScheduledPost, setSelectedScheduledPost] = useState<any>(null);
  const [showEditScheduledModal, setShowEditScheduledModal] = useState(false);
  const [userTimezone, setUserTimezone] = useState("UTC");

  // Campaign & Project linking
  const [publishCampaigns, setPublishCampaigns] = useState<{id: string; name: string}[]>([]);
  const [publishProjects,  setPublishProjects]  = useState<{id: string; name: string}[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedProjectId,  setSelectedProjectId]  = useState("");

  // AI Recommendations State
  const [suggestedTimes, setSuggestedTimes] = useState<any[]>([]);
  const [schedulerDate, setSchedulerDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );

  // Manual Scheduler State
  const [manualScheduleDate, setManualScheduleDate] = useState<string>('');
  const [manualScheduleTime, setManualScheduleTime] = useState<string>('');
  const assetUrls = searchParams.get('assetUrls');
  const assetUrl  = searchParams.get('assetUrl');
  const assetType = searchParams.get('assetType');
  const assetTitle = searchParams.get('assetTitle');

  useEffect(() => {
    const timers = pollTimers.current;
    return () => { timers.forEach(clearTimeout); };
  }, []);

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

  // Load campaigns for linking
  useEffect(() => {
    api.get("/api/v1/campaigns").then(r => setPublishCampaigns(r.data || [])).catch(() => {});
  }, []);

  // Load projects when campaign is selected
  useEffect(() => {
    if (!selectedCampaignId) { setPublishProjects([]); setSelectedProjectId(""); return; }
    api.get(`/api/v1/projects?campaign_id=${selectedCampaignId}`)
      .then(r => setPublishProjects(r.data || []))
      .catch(() => setPublishProjects([]));
    setSelectedProjectId("");
  }, [selectedCampaignId]);

  // Mark draft as dirty whenever meaningful content exists
  useEffect(() => {
    const hasDraft =
      topic.trim().length > 0 ||
      description.trim().length > 0 ||
      media !== null ||
      mediaUrls.length > 0;
    setIsDirty(hasDraft);
  }, [topic, description, media, mediaUrls, setIsDirty]);

  // Discard handler
  const handleDiscard = useCallback(() => {
    setTopic(""); setDescription(""); setMedia(null); setMediaPreview(null);
    setMediaUrls([]); setSelectedUrls([]); setCarouselIndex(0);
    setSuggestedTimes([]); setActiveRevisionId(null);
    setSelectedAccountIds([]); setPlatformCaptions({}); setPlatformPostTypes({}); setMediaMeta(null);
    setSelectedCampaignId(""); setSelectedProjectId("");
    setIsDirty(false);
    setMessage({
      type: "success",
      text: "Draft discarded. Start fresh anytime.",
    });
  }, [setIsDirty]);
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
            .select("*")
            .eq("workspace_id", member.workspace_id)
            .eq("status", "active"),
          supabase
            .from("publish_intents")
            .select("*")
            .eq("creator_id", user.id)
            .eq("status", "RETURNED"),
          member.role === "ADMIN" || member.role === "MANAGER"
            ? supabase
                .from("publish_intents")
                .select("*, users!publish_intents_creator_id_fkey(full_name)")
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
        .select("*")
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
      const objUrl = URL.createObjectURL(file);
      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      videoEl.src = objUrl;
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
        URL.revokeObjectURL(objUrl);
      };
      // Use object URL as preview for videos (efficient — no base64 for large files)
      setMediaPreview(objUrl);
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
        console.log("[VISION] Analysis Result:", data);
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
        setSuggestedTimes(data.suggestedTimes || []);
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
        const filePath = `${user.id}/${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, media);
        if (uploadError) throw uploadError;
        const {
          data: { publicUrl: newUrl },
        } = supabase.storage.from("media").getPublicUrl(filePath);
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
        campaign_id: selectedCampaignId || null,
        project_id:  selectedProjectId  || null,
      };

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
      setCustomTime(""); setSelectedTime("immediate");
      setSelectedCampaignId(""); setSelectedProjectId("");
      setIsDirty(false);
      fetchUserData();
      // Poll for publish result — backend needs a moment to process
      const t1 = setTimeout(() => fetchRecentPosts(), 3000);
      const t2 = setTimeout(() => fetchRecentPosts(), 8000);
      pollTimers.current.push(t1, t2);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: "Failed to publish. Please try again.",
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
        const filePath = `${user.id}/${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, media);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
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
            campaignId: selectedCampaignId || null,
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
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold uppercase tracking-widest animate-pulse">
          Syncing Environment...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 px-6">
      {/* Decent Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 border-b border-[var(--border)] pb-8">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <Image
              src="/images/logo-wordmark.svg"
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

        <div className="flex items-center gap-4">
          {/* Discard Draft button — only show when dirty and user is MANAGER */}
          {isDirty && userRole === "MANAGER" && (
            <button
              onClick={handleDiscard}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-bold transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Discard Draft
            </button>
          )}
          {revisions.length > 0 && userRole === "CREATOR" && (
            <button
              onClick={() => router.push("/review")}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs font-bold"
            >
              <AlertCircle className="w-4 h-4" />
              {revisions.length} Tasks Awaiting Review
            </button>
          )}
          <div className="px-4 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${userRole?.toUpperCase() === "ADMIN" ? "bg-rose-500" : "bg-emerald-500"}`}
            />
            <span className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">
              {userRole}
            </span>
          </div>
        </div>
      </div>

      {/* Revisions Banner */}
      {revisions.length > 0 && userRole === "CREATOR" && (
        <div className="mb-8 p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm font-black text-amber-500 uppercase tracking-tight">
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
                  className="w-full py-1.5 bg-amber-500/20 text-amber-500 text-[10px] font-bold rounded-lg uppercase hover:bg-amber-500/30 transition-all"
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
          className={`mb-8 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in duration-300 ${message.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"}`}
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
        <div className="lg:col-span-8 space-y-4">
          {/* Media Section */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                Media
              </h3>
              {mediaUrls.length > 1 && (
                <span className="text-xs text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg">
                  Pack · {mediaUrls.length} files
                </span>
              )}
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
                        className="w-full h-full object-contain pointer-events-none"
                      />
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
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-white rounded-full w-9 h-9 flex items-center justify-center transition-all z-10"
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-white rounded-full w-9 h-9 flex items-center justify-center transition-all z-10"
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
                    <div className="absolute top-3 right-3 bg-black/50 text-white text-[10px] px-2 py-1 rounded-lg font-medium opacity-60">
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
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 relative transition-all ${i === carouselIndex ? "border-indigo-500" : "border-transparent opacity-60 hover:opacity-100"}`}
                      >
                        <Image
                          src={url}
                          alt={`thumb ${i}`}
                          fill
                          sizes="64px"
                          className="object-cover"
                          draggable={false}
                        />
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
                    className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${isPlatformSpecific ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20" : "text-[var(--foreground-muted)] hover:text-[var(--foreground-muted)]"}`}
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
                      className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${activePlatformTab === p ? "bg-amber-500/10 border-amber-500 text-amber-500" : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--card-border)]"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative bg-[var(--surface)]/50 border border-[var(--border)] rounded-2xl transition-all focus-within:border-[var(--card-border)]">
                <textarea
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${showAIWriter ? "bg-indigo-600 text-white" : "bg-[var(--surface)] text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Studio
                    </button>
                    <button
                      onClick={() => setUseEmojis(!useEmojis)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all border ${useEmojis ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground-muted)]"}`}
                    >
                      😊
                    </button>
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest ${
                        isPlatformSpecific &&
                        (platformCaptions[activePlatformTab]?.length || 0) >
                          (PLATFORM_LIMITS[activePlatformTab] || 9999)
                          ? "text-rose-500"
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
                        <span className="text-[9px] text-rose-400 font-bold flex items-center gap-1 mt-1">
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
                aiTone={aiTone}
                onAiToneChange={setAiTone}
                styleMode={aiStyleMode}
                onStyleModeChange={setAiStyleMode}
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
                        className="h-full bg-indigo-500"
                        style={{ width: `${metrics.viral_score}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground-muted)] block mb-1">
                    Sentiment
                  </label>
                  <div className="text-xl font-bold text-emerald-400">
                    {metrics.sentiment_score && metrics.sentiment_score > 0.7
                      ? "Positive"
                      : "Balanced"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Platform Selection */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
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

          {/* Campaign & Project linking */}
          {publishCampaigns.length > 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
                <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
                Link to Campaign
              </h3>
              <select
                value={selectedCampaignId}
                onChange={e => setSelectedCampaignId(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">No campaign</option>
                {publishCampaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {selectedCampaignId && (
                <div>
                  <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2 mb-2">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                    Link to Project
                  </h3>
                  <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    disabled={publishProjects.length === 0}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                  >
                    <option value="">
                      {publishProjects.length === 0 ? "No projects in this campaign" : "No project"}
                    </option>
                    {publishProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Platform constraint warnings */}
          {(() => {
            const violations = getPlatformViolations();
            if (violations.length === 0) return null;
            const blocking = violations.filter((v) => {
              const type =
                assetType ||
                (media?.type?.startsWith("video")
                  ? "video"
                  : media
                    ? "image"
                    : "");
              const { blocked } = getCompatibility(
                v.platform,
                v.postType,
                selectedUrls.length || (media ? 1 : 0),
                type,
              );
              return blocked;
            });
            const warnings = violations.filter((v) => !blocking.includes(v));
            return (
              <div className="space-y-2">
                {blocking.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-rose-400 capitalize">
                        {v.platform} — blocked
                      </p>
                      <p className="text-[11px] text-rose-300 mt-0.5">
                        {v.message}
                      </p>
                    </div>
                  </div>
                ))}
                {warnings.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-400 capitalize">
                        {v.platform}
                      </p>
                      <p className="text-[11px] text-amber-300 mt-0.5">
                        {v.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Submit */}
          <button
            onClick={handleSubmitIntent}
            disabled={submitting}
            className="w-full py-4 font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitting
              ? "Publishing…"
              : activeRevisionId
                ? "Republish"
                : "Publish Now"}
          </button>
        </div>

        {/* Right Sidebar - All-in-One */}
        <div className="lg:col-span-4 space-y-4">
          {/* Week Calendar */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
                <Calendar className="w-3 h-3 text-indigo-400" />
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
                        className={`text-[10px] font-medium mb-1 ${isToday ? "text-indigo-400" : "text-[var(--foreground-muted)]"}`}
                      >
                        {day}
                      </div>
                      <div
                        className={`text-sm font-bold mb-2 ${isToday ? "text-indigo-400" : "text-[var(--foreground)]"}`}
                      >
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {posts.slice(0, 2).map((post) => (
                          <div
                            key={post.id}
                            className={`h-1.5 rounded-full ${post.status === "SCHEDULED" ? "bg-emerald-500" : post.status === "PUBLISHED" ? "bg-blue-500" : "bg-rose-500"}`}
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

          {/* Scheduled Posts */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
            <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2 mb-2">
              <Clock className="w-3 h-3 text-emerald-400" />
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
                      <span className="text-xs font-bold text-indigo-400">
                        {post.platform}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${post.status === "SCHEDULED" ? "bg-emerald-500/20 text-emerald-400" : "bg-[var(--surface-hover)] text-[var(--foreground-muted)]"}`}
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

          {/* Recent Posts — publish status diagnostics */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
                <ListTodo className="w-3 h-3 text-indigo-400" />
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
                  const isPending = post.status === "APPROVED";
                  return (
                    <div
                      key={post.id}
                      className="p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase">
                          {post.platform}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isPub
                              ? "bg-emerald-500/20 text-emerald-400"
                              : isFailed
                                ? "bg-rose-500/20 text-rose-400"
                                : isPending
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-[var(--surface-hover)] text-[var(--foreground-muted)]"
                          }`}
                        >
                          {isPub
                            ? "PUBLISHED"
                            : isFailed
                              ? "FAILED"
                              : isPending
                                ? "PROCESSING…"
                                : post.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--foreground-muted)] truncate mb-1">
                        {post.content}
                      </p>
                      {isFailed && post.feedback && (
                        <p className="text-[9px] text-rose-400 bg-rose-500/10 rounded px-1.5 py-1 mt-1 break-words">
                          {post.feedback}
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
              <Sparkles className="w-4 h-4 text-amber-400" />
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
                <div className="grid grid-cols-4 gap-1 mb-2">
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
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                            : 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-muted)] hover:border-amber-500/30 hover:text-[var(--foreground)]'
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
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-xs outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              <select
                value={audienceRegion}
                onChange={(e) => setAudienceRegion(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-xs outline-none focus:border-amber-500/50"
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
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-xs outline-none focus:border-amber-500/50"
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
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
                      <span className="text-lg font-black text-emerald-400 tabular-nums">
                        {rec.label}
                      </span>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
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
                          <span className="text-emerald-500 font-bold mt-0.5 shrink-0">·</span>
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
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400'
                      }`}
                    >
                      {selectedTime === rec.time ? '✓ Noted — see scheduler below' : 'Note this slot'}
                    </button>
                  </div>
                ))}
                <p className="text-[10px] text-[var(--foreground-muted)] text-center pt-1">
                  Publishing Hub posts immediately through governance. To schedule at a specific time, use the{' '}
                  <a href="/calendar" className="text-indigo-400 hover:text-indigo-300 underline">Calendar</a>.
                </p>
              </div>
            )}
          </div>
          {/* Manual Scheduler */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-indigo-400" />
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
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-2 text-[var(--foreground)] text-xs outline-none focus:border-indigo-500/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider block mb-1">Time</label>
                  <input
                    type="time"
                    value={manualScheduleTime}
                    onChange={e => setManualScheduleTime(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-2 text-[var(--foreground)] text-xs outline-none focus:border-indigo-500/60 transition-colors"
                  />
                </div>
              </div>

              {manualScheduleDate && manualScheduleTime && (
                <div className="bg-indigo-500/8 border border-indigo-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />
                  <p className="text-[10px] text-indigo-300 font-medium">
                    {new Date(`${manualScheduleDate}T${manualScheduleTime}:00`).toLocaleString('en', {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {selectedAccountIds.length === 0 && (
                <p className="text-[10px] text-amber-400/80 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  Select accounts in &quot;Post To&quot; first
                </p>
              )}

              <button
                onClick={handleManualSchedule}
                disabled={submitting || !manualScheduleDate || !manualScheduleTime || selectedAccountIds.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg">
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
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-sm outline-none focus:border-emerald-500 min-h-[100px]"
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
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-sm outline-none focus:border-emerald-500"
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
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Save Changes
                </button>
                <button
                  onClick={() =>
                    handleCancelScheduledPost(selectedScheduledPost.id)
                  }
                  className="px-6 py-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-bold rounded-xl transition-colors flex items-center gap-2"
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
  );
}

export default function PublishPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--foreground-muted)]">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
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
