"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Sparkles, Send, CheckCircle2, AlertCircle, RefreshCcw, 
  XCircle, ListTodo, AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Modular Components
import PlatformSelector from "@/components/publish/PlatformSelector";
import MediaUploader from "@/components/publish/MediaUploader";
import AIWriterPanel from "@/components/publish/AIWriterPanel";
import SchedulingPanel from "@/components/publish/SchedulingPanel";
import PendingPostItem from "@/components/publish/PendingPostItem";

function PublishPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Basic Content State
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState("Entertainment");
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  // AI & Formatting State
  const [aiTone, setAiTone] = useState("professional");
  const [aiLength, setAiLength] = useState("medium");
  const [aiStyleMode, setAiStyleMode] = useState("");
  const [aiAudience, setAiAudience] = useState("General");
  const [useEmojis, setUseEmojis] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAIWriter, setShowAIWriter] = useState(false);
  const [metrics, setMetrics] = useState<{viral_score?: number, sentiment_score?: number} | null>(null);

  // Platform Specific State
  const [isPlatformSpecific, setIsPlatformSpecific] = useState(false);
  const [platformCaptions, setPlatformCaptions] = useState<Record<string, string>>({});
  const [activePlatformTab, setActivePlatformTab] = useState<string>("");
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [expandedPlatforms, setExpandedPlatforms] = useState<string[]>([]);

  const PLATFORM_LIMITS: Record<string, number> = {
    "Instagram": 2200,
    "Facebook": 5000,
    "X": 280,
    "LinkedIn": 3000,
    "Threads": 500,
    "Pinterest": 500
  };

  // Governance State
  const [userRole, setUserRole] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const loadRevision = useCallback((rev: any) => {
    try {
      const parsedContent = JSON.parse(rev.content);
      if (typeof parsedContent === 'object' && !Array.isArray(parsedContent) && parsedContent !== null) {
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
    setMessage({ type: 'success', text: 'Revision loaded. Modify your content and resubmit.' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: member } = await supabase
      .from('workspace_members')
      .select('role, workspace_id')
      .eq('user_id', user.id)
      .single();

    if (member) {
      setUserRole(member.role);
      
      const { data: accounts } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('workspace_id', member.workspace_id)
        .eq('status', 'active');
      if (accounts) {
        setConnectedAccounts(accounts);
        const platformsWithAccounts = Array.from(new Set(accounts.map((a: any) => a.platform)));
        setExpandedPlatforms(platformsWithAccounts as string[]);
      }

      // Fetch Creator Revisions - Note: Teammate use 'RETURNED' status
      const { data: revs } = await supabase
        .from('publish_intents')
        .select('*')
        .eq('creator_id', user.id)
        .eq('status', 'RETURNED');
      if (revs) setRevisions(revs);

      // Fetch Admin/Manager Queue
      if (member.role === 'ADMIN' || member.role === 'MANAGER') {
        const statusToFetch = member.role === 'ADMIN' ? 'PENDING_ADMIN' : 'PENDING_MANAGER';
        const { data: queue } = await supabase
          .from('publish_intents')
          .select('*, users!publish_intents_creator_id_fkey(full_name)')
          .eq('status', statusToFetch);
        if (queue) setPendingPosts(queue);
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    const revisionId = searchParams.get('revisionId');
    if (revisionId) {
      const fetchSpecificRevision = async () => {
        const { data, error } = await supabase
          .from('publish_intents')
          .select('*')
          .eq('id', revisionId)
          .single();
        if (!error && data) {
          loadRevision(data);
        }
      };
      fetchSpecificRevision();
    }
  }, [searchParams, loadRevision]);

  const togglePlatformExpansion = (platform: string) => {
    setExpandedPlatforms(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds(prev => {
      const isSelected = prev.includes(accountId);
      const newSelection = isSelected ? prev.filter(id => id !== accountId) : [...prev, accountId];
      
      const account = connectedAccounts.find(a => a.id === accountId);
      if (account && !isSelected) {
        const currentDesc = isPlatformSpecific ? platformCaptions[activePlatformTab] : description;
        if (!platformCaptions[account.platform]) {
          setPlatformCaptions(pc => ({ ...pc, [account.platform]: currentDesc || description }));
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
    "Pinterest": true
  });

  const getSelectedPlatforms = useCallback(() => {
    return Object.keys(platforms).filter(p => platforms[p as keyof typeof platforms]);
  }, [platforms]);

  const [hasImageAnalysis, setHasImageAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Check if there's already an analysis in the session
    const existing = sessionStorage.getItem('lastImageAnalysis');
    if (existing) setHasImageAnalysis(true);
  }, []);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHasImageAnalysis(false); 
      setIsAnalyzing(true);
      setMedia(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        setMediaPreview(rawBase64);
        
        try {
          // Resize for AI processing to avoid payload limits
          const img = document.createElement('img');
          img.src = rawBase64;
          await new Promise(r => img.onload = r);
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 1024 / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.8);

          const response = await fetch('http://localhost:5000/api/v1/ai/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: optimizedBase64 })
          });
          const data = await response.json();
          console.log("[VISION] Analysis Result:", data);
          if (data.success && data.analysis) {
            sessionStorage.setItem('lastImageAnalysis', data.analysis);
            setHasImageAnalysis(true);
            setShowAIWriter(true); 
          } else {
            const errorMsg = data.error?.message || data.error || 'Vision analysis returned no data';
            const errorDetails = data.error?.details || '';
            console.error("[VISION] Failed:", errorMsg, errorDetails);
            setMessage({ type: 'error', text: `AI Vision: ${errorMsg}. ${errorDetails}` });
          }
        } catch (err: any) {
          console.error("[VISION] Network Error:", err);
          setMessage({ type: 'error', text: `Connection Error: Could not reach AI server at http://localhost:5000` });
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddImageInsight = () => {
    const analysis = sessionStorage.getItem('lastImageAnalysis');
    console.log("[VISION] Adding insight to topic:", analysis);
    if (analysis) {
      setTopic(prev => {
        const cleaned = prev.trim();
        return cleaned ? `${cleaned}\n\n[AI Image Insight]: ${analysis}` : analysis;
      });
      // Optionally clear it so they don't add it twice
      // sessionStorage.removeItem('lastImageAnalysis');
      // setHasImageAnalysis(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!topic) return;
    setGenerating(true);
    setMetrics(null);
    try {
      let imageBase64 = null;
      if (mediaPreview) {
        imageBase64 = mediaPreview;
      }

      const response = await fetch('http://localhost:5000/api/v1/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic, contentType,
          platforms: ["Instagram", "Facebook", "X", "LinkedIn", "Threads", "Pinterest"],
          length: aiLength,
          tone: aiTone,
          useEmojis,
          styleMode: aiStyleMode,
          imageBase64
        })
      });
      const data = await response.json();
      if (response.ok) {
        // 1. Update Universal Description
        setDescription(data.description);

        // 2. Update Platform Specific Captions
        if (data.platform_content) {
          const newCaptions = { ...platformCaptions };
          Object.keys(data.platform_content).forEach(p => {
            const content = data.platform_content[p];
            newCaptions[p] = content.caption + '\n\n' + content.hashtags.join(' ');
          });
          setPlatformCaptions(newCaptions);
          
          // If the user hasn't selected a tab yet, set it to the first platform returned
          if (!activePlatformTab && Object.keys(data.platform_content).length > 0) {
            setActivePlatformTab(Object.keys(data.platform_content)[0]);
          }
        }
        
        if (data.metadata) {
          setMetrics({
            viral_score: data.metadata.viral_score,
            sentiment_score: data.metadata.sentiment_score
          });
        }
        setSuggestedTimes(data.suggestedTimes || []);
      } else {
        const errorMsg = typeof data.error === 'object' ? data.error.message : data.error;
        setMessage({ type: 'error', text: errorMsg || 'AI Generation Failed' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'AI generation failed. Please check your topic and try again.' });
    }
    setGenerating(false);
  };

  const [suggestedTimes, setSuggestedTimes] = useState<{time: string, label: string, reasoning?: string, confidence_score?: number}[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('immediate');
  const [customTime, setCustomTime] = useState<string>("");
  
  // Magic Schedule State
  const [audienceRegion, setAudienceRegion] = useState("Global");
  const [audienceAgeGroup, setAudienceAgeGroup] = useState("All Ages");
  const [isFetchingRecommendations, setIsFetchingRecommendations] = useState(false);

  const handleMagicSchedule = async () => {
    if (!topic) {
      setMessage({ type: 'error', text: 'Please enter a Topic so the AI knows your niche!' });
      return;
    }
    const platforms = getSelectedPlatforms();
    if (platforms.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one platform.' });
      return;
    }

    setIsFetchingRecommendations(true);
    try {
      const response = await fetch('http://localhost:5000/api/v1/scheduler/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platforms[0], // Ask for the first platform as primary
          niche: topic,
          audienceRegion,
          audienceAgeGroup
        })
      });
      const data = await response.json();
      if (response.ok && data.recommendations) {
        const today = new Date().toISOString().split('T')[0];
        const formattedSlots = data.recommendations.map((rec: any) => ({
          time: `${today}T${rec.best_start_time}`, // Combining today's date with the recommended time slot
          label: `${rec.best_start_time} - ${rec.best_end_time} (Confidence: ${Math.round(rec.confidence_score * 100)}%)`,
          reasoning: rec.reasoning,
          confidence_score: rec.confidence_score
        }));
        setSuggestedTimes(formattedSlots);
        setMessage({ type: 'success', text: 'AI analyzed demographics and generated peak time slots!' });
      } else {
        const errorMsg = typeof data.error === 'object' ? data.error.message : data.error;
        setMessage({ type: 'error', text: errorMsg || 'AI Scheduling failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not fetch scheduling recommendations. Try again later.' });
    }
    setIsFetchingRecommendations(false);
  };

  const handleSubmitIntent = async () => {
    if (selectedAccountIds.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one target account in the sidebar.' });
      return;
    }
    
    setSubmitting(true);
    setMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Handle Media Upload to Supabase Storage
      let publicUrl = mediaPreview;
      if (media) {
        const fileExt = media.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, media);
        if (uploadError) throw uploadError;
        const { data: { publicUrl: newUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
        publicUrl = newUrl;
      }

      // 2. Submit to Governance Engine
      const payload = {
        topic,
        content: {
          universal: description,
          platforms: platformCaptions
        },
        mediaUrl: publicUrl,
        targetAccountIds: selectedAccountIds,
        userId: user.id
      };

      const res = await fetch('http://localhost:5000/api/v1/governance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Submission failed');

      setMessage({
        type: 'success',
        text: `Successfully submitted ${result.count} platform-optimized posts for review!`
      });
      
      // Cleanup State
      setTopic(""); setDescription(""); setMedia(null); setMediaPreview(null);
      setSuggestedTimes([]); setActiveRevisionId(null);
      setSelectedAccountIds([]); setPlatformCaptions({});
      setCustomTime(""); setSelectedTime("immediate");
      fetchUserData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
    setSubmitting(false);
  };

  const handleGovernanceAction = async (postId: string, action: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const response = await fetch('http://localhost:5000/api/v1/governance/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId: postId,
          newStatus: action,
          feedback: action === 'RETURNED' ? reviewComment : null,
          userId: user?.id,
          userRole
        })
      });
      
      if (!response.ok) throw new Error('Action failed');
      
      setReviewComment(""); 
      fetchUserData();
      setMessage({ type: 'success', text: `Action completed.` });
    } catch (err: any) { 
      setMessage({ type: 'error', text: err.message }); 
    }
  };

  if (loading || userRole === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Syncing Environment...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 px-6">
      {/* Decent Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 border-b border-zinc-800 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Social Publisher</h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Compose and schedule your cross-platform content.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {revisions.length > 0 && userRole === 'CREATOR' && (
            <button 
              onClick={() => router.push('/review')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs font-bold"
            >
              <AlertCircle className="w-4 h-4" />
              {revisions.length} Tasks Awaiting Review
            </button>
          )}
          <div className="px-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${userRole?.toUpperCase() === 'ADMIN' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{userRole}</span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in duration-300 ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Workspace Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Media Section (Instagram-style: Top) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white px-1">Attachment</h3>
            <MediaUploader 
              mediaPreview={mediaPreview} 
              mediaType={media?.type} 
              onUpload={handleMediaUpload} 
              onClear={() => {setMedia(null); setMediaPreview(null);}} 
            />
          </div>

          {/* Content Area (Instagram-style: Bottom) */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold text-white leading-none">Draft Composer</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] font-black uppercase tracking-widest rounded-md border border-zinc-700/50">{contentType}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <button 
                    onClick={() => setIsPlatformSpecific(false)} 
                    className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${!isPlatformSpecific ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}
                  >
                    Universal
                  </button>
                  <button 
                    onClick={() => {
                      setIsPlatformSpecific(true);
                      if (!activePlatformTab) setActivePlatformTab("Instagram");
                    }} 
                    className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${isPlatformSpecific ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' : 'text-zinc-500 hover:text-zinc-400'}`}
                  >
                    Platform-Specific
                  </button>
                </div>
              </div>

              {isPlatformSpecific && (
                <div className="flex flex-wrap gap-2 mb-6 p-2 bg-zinc-950/50 border border-zinc-800/50 rounded-2xl overflow-x-auto scrollbar-hide">
                  {Object.keys(platforms).map(p => (
                    <button 
                      key={p} 
                      onClick={() => {
                        setActivePlatformTab(p);
                        // Ensure it's selected for generation
                        setPlatforms(prev => ({ ...prev, [p]: true }));
                        // Copy description if empty
                        if (!platformCaptions[p]) {
                          setPlatformCaptions(prev => ({ ...prev, [p]: description }));
                        }
                      }} 
                      className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${activePlatformTab === p ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative bg-zinc-950/50 border border-zinc-800 rounded-2xl transition-all focus-within:border-zinc-700">
                <textarea 
                  value={isPlatformSpecific ? (platformCaptions[activePlatformTab] || "") : description}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isPlatformSpecific) {
                      setPlatformCaptions(prev => ({ ...prev, [activePlatformTab]: val }));
                    } else {
                      setDescription(val);
                    }
                  }}
                  placeholder={isPlatformSpecific ? `Write custom caption for ${activePlatformTab}...` : "Write your universal caption here..."}
                  className="w-full bg-transparent p-6 text-white text-base leading-relaxed placeholder:text-zinc-700 outline-none resize-none min-h-[250px]"
                />
                
                <div className="p-4 flex items-center justify-between border-t border-zinc-800/50 bg-zinc-900/30">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowAIWriter(!showAIWriter)} 
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${showAIWriter ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Studio
                    </button>
                    <button onClick={() => setUseEmojis(!useEmojis)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all border ${useEmojis ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-zinc-900 border-zinc-800 text-zinc-700'}`}>
                      😊
                    </button>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                      isPlatformSpecific && (platformCaptions[activePlatformTab]?.length || 0) > (PLATFORM_LIMITS[activePlatformTab] || 9999)
                        ? 'text-rose-500' 
                        : 'text-zinc-600'
                    }`}>
                      {(isPlatformSpecific ? platformCaptions[activePlatformTab]?.length || 0 : description.length)} / {isPlatformSpecific ? PLATFORM_LIMITS[activePlatformTab] || '∞' : '∞'} Characters
                    </span>
                    {isPlatformSpecific && (platformCaptions[activePlatformTab]?.length || 0) > (PLATFORM_LIMITS[activePlatformTab] || 9999) && (
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
                topic={topic} onTopicChange={setTopic} 
                contentType={contentType} onContentTypeChange={setContentType}
                aiLength={aiLength} onAiLengthChange={setAiLength} 
                aiTone={aiTone} onAiToneChange={setAiTone}
                styleMode={aiStyleMode} onStyleModeChange={setAiStyleMode}
                audience={aiAudience} onAudienceChange={setAiAudience}
                onGenerate={handleGenerateAI} generating={generating}
                hasImageAnalysis={hasImageAnalysis}
                isAnalyzing={isAnalyzing}
                onAddImageInsight={handleAddImageInsight}
              />
            )}

            {metrics && (
              <div className="p-6 border-t border-zinc-800 bg-zinc-900/20 flex gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Viral Score</label>
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-bold text-white">{metrics.viral_score}/100</div>
                    <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${metrics.viral_score}%` }} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Sentiment</label>
                  <div className="text-xl font-bold text-emerald-400">
                    {metrics.sentiment_score && metrics.sentiment_score > 0.7 ? 'Positive' : 'Balanced'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Target Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white px-1">Target Platforms</h3>
            <PlatformSelector 
              connectedAccounts={connectedAccounts}
              selectedAccountIds={selectedAccountIds}
              onToggleAccount={toggleAccountSelection}
              expandedPlatforms={expandedPlatforms}
              onToggleExpansion={togglePlatformExpansion}
              userRole={userRole}
            />
          </div>

          {/* Scheduling */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white px-1">Execution</h3>
            <SchedulingPanel 
              suggestedTimes={suggestedTimes} 
              selectedTime={selectedTime} 
              onSelect={setSelectedTime} 
              customTime={customTime} 
              onCustomTimeChange={setCustomTime} 
              contentType={contentType} 
              audienceRegion={audienceRegion}
              setAudienceRegion={setAudienceRegion}
              audienceAgeGroup={audienceAgeGroup}
              setAudienceAgeGroup={setAudienceAgeGroup}
              onMagicSchedule={handleMagicSchedule}
              isFetchingRecommendations={isFetchingRecommendations}
            />
          </div>

          {/* Final Action */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
            <button 
              onClick={handleSubmitIntent} 
              disabled={submitting} 
              className={`w-full py-4 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-[11px] ${userRole === 'ADMIN' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white text-black hover:bg-zinc-200'}`}
            >
              {submitting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              {activeRevisionId ? 'Resubmit Draft' : userRole === 'ADMIN' ? 'Publish Directly' : 'Submit for Review'}
            </button>
            <p className="text-[10px] text-zinc-500 text-center italic">
              {userRole === 'ADMIN' ? "Your post will be scheduled immediately." : "This will be sent to your manager for final approval."}
            </p>
          </div>

          {/* Review Queue Preview */}
          {pendingPosts.length > 0 && (userRole === 'ADMIN' || userRole === 'MANAGER') && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white px-1 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-indigo-400" />
                Active Queue ({pendingPosts.length})
              </h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-hide">
                {pendingPosts.map(post => (
                  <PendingPostItem 
                    key={post.id} 
                    post={post} 
                    userRole={userRole} 
                    reviewComment={reviewComment} 
                    onReviewCommentChange={setReviewComment} 
                    onAction={(action) => handleGovernanceAction(post.id, action)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PublishPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] text-zinc-500 animate-pulse">Warming Engine...</div>}>
      <PublishPageInner />
    </Suspense>
  );
}
