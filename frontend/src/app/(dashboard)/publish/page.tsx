"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Sparkles, Send, CheckCircle2, AlertCircle, RefreshCcw, 
  XCircle, ListTodo, Calendar, Clock, Edit3, Trash2, ChevronLeft, ChevronRight
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
  const [useEmojis, setUseEmojis] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAIWriter, setShowAIWriter] = useState(false);

  // Platform Specific State
  const [isPlatformSpecific, setIsPlatformSpecific] = useState(false);
  const [platformCaptions, setPlatformCaptions] = useState<Record<string, string>>({});
  const [activePlatformTab, setActivePlatformTab] = useState<string>("");
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [expandedPlatforms, setExpandedPlatforms] = useState<string[]>([]);

  // Governance State
  const [userRole, setUserRole] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  
  // Scheduled Posts State
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [selectedScheduledPost, setSelectedScheduledPost] = useState<any>(null);
  const [showEditScheduledModal, setShowEditScheduledModal] = useState(false);
  const [userTimezone, setUserTimezone] = useState("UTC");
  
  // AI Recommendations State
  const [suggestedTimes, setSuggestedTimes] = useState<any[]>([]);
  const [isFetchingRecommendations, setIsFetchingRecommendations] = useState(false);
  
  // Scheduling State
  const [selectedTime, setSelectedTime] = useState<string>('immediate');
  const [customTime, setCustomTime] = useState<string>("");
  const [audienceRegion, setAudienceRegion] = useState("Global");
  const [audienceAgeGroup, setAudienceAgeGroup] = useState("All Ages");
  
  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

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
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(tz);
  }, []);

  const fetchScheduledPosts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const response = await fetch('/api/v1/scheduler/posts?limit=50', {
        headers: { 'x-user-id': user.id }
      });
      const result = await response.json();
      if (result.success && result.posts) {
        setScheduledPosts(result.posts);
      }
    } catch (err) {
      console.error("Failed to fetch scheduled posts:", err);
    }
  }, []);

  useEffect(() => {
    fetchScheduledPosts();
  }, [fetchScheduledPosts]);

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

  const getSelectedPlatforms = () => {
    return Array.from(new Set(
      connectedAccounts
        .filter(a => selectedAccountIds.includes(a.id))
        .map(a => a.platform)
    ));
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMedia(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleGenerateAI = async () => {
    if (!topic) return;
    setGenerating(true);
    try {
      const response = await fetch('/api/v1/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic, contentType,
          platforms: getSelectedPlatforms(),
          length: aiLength,
          tone: aiTone,
          useEmojis
        })
      });
      const data = await response.json();
      if (response.ok) {
        if (isPlatformSpecific && activePlatformTab) {
          setPlatformCaptions(prev => ({ ...prev, [activePlatformTab]: data.description }));
        } else {
          setDescription(data.description);
        }
        setSuggestedTimes(data.suggestedTimes || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'AI Generation Failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'AI generation failed. Please check your topic and try again.' });
    }
    setGenerating(false);
  };

  const handleSubmitIntent = async () => {
    const activeDescription = isPlatformSpecific ? platformCaptions[activePlatformTab] : description;
    if (!activeDescription || (!media && !mediaPreview)) {
      setMessage({ type: 'error', text: 'Media and Description are required to submit.' });
      return;
    }
    if (selectedAccountIds.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one target account.' });
      return;
    }
    
    setSubmitting(true);
    setMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: member } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single();

      let publicUrl = mediaPreview;
      if (media) {
        const fileExt = media.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, media);
        if (uploadError) throw uploadError;
        const { data: { publicUrl: newUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
        publicUrl = newUrl;
      }

      const isAdmin = userRole?.toUpperCase() === 'ADMIN';
      const intentData = {
        workspace_id: member?.workspace_id,
        creator_id: user.id,
        content: isPlatformSpecific ? JSON.stringify(platformCaptions) : description,
        platform: getSelectedPlatforms().join(', '),
        target_account_ids: selectedAccountIds,
        status: isAdmin ? 'APPROVED' : 'PENDING_ADMIN',
        scheduled_for: selectedTime === 'immediate'
          ? new Date().toISOString()
          : new Date(customTime || selectedTime).toISOString(),
        media_url: publicUrl,
        feedback: null
      };

      const { data: savedIntent, error } = activeRevisionId 
        ? await supabase.from('publish_intents').update(intentData).eq('id', activeRevisionId).select().single()
        : await supabase.from('publish_intents').insert(intentData).select().single();

      if (error) throw error;

      // If Admin published directly, trigger the backend execution engine immediately
      if (isAdmin && savedIntent) {
        console.log("[PUBLISHER] Admin direct publish detected. Triggering backend execution...");
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/v1/governance/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intentId: savedIntent.id,
            newStatus: 'APPROVED',
            userId: user.id,
            userRole: userRole
          })
        }).catch(err => console.error("[PUBLISHER] Failed to trigger execution:", err));
      }

      setMessage({
        type: 'success',
        text: isAdmin ? 'Post successfully published to selected accounts!' : 'Post successfully submitted for approval!'
      });
      
      if (activeRevisionId) setRevisions(prev => prev.filter(r => r.id !== activeRevisionId));
      setTopic(""); setDescription(""); setMedia(null); setMediaPreview(null);
      setSuggestedTimes([]); setActiveRevisionId(null);
      setSelectedAccountIds([]); setPlatformCaptions({});
      setCustomTime(""); setSelectedTime("immediate");
      fetchUserData();
      router.replace('/publish');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
    setSubmitting(false);
  };

  const handleGovernanceAction = async (postId: string, action: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const response = await fetch('/api/v1/governance/transition', {
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
      const response = await fetch('/api/v1/scheduler/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platforms[0],
          niche: topic,
          audienceRegion: audienceRegion,
          audienceAgeGroup: audienceAgeGroup,
          userTimezone
        })
      });
      const data = await response.json();
      if (response.ok && data.recommendations) {
        const today = new Date().toISOString().split('T')[0];
        const formattedSlots = data.recommendations.map((rec: any) => ({
          time: `${today}T${rec.best_start_time}`,
          label: `${rec.best_start_time} - ${rec.best_end_time} (Confidence: ${Math.round(rec.confidence_score * 100)}%)`,
          reasoning: rec.reasoning,
          confidence_score: rec.confidence_score,
          user_local_time_start: rec.user_local_time_start,
          user_local_time_end: rec.user_local_time_end,
          audience_timezone: rec.audience_timezone
        }));
        setSuggestedTimes(formattedSlots);
        setMessage({ type: 'success', text: 'AI analyzed demographics and generated peak time slots!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'AI Scheduling failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not fetch scheduling recommendations. Try again later.' });
    }
    setIsFetchingRecommendations(false);
  };

  const handleEditScheduledPost = async (postId: string, newContent: string, newTime: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const response = await fetch(`/api/v1/scheduler/posts/${postId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({
          content: newContent,
          scheduledTime: newTime
        })
      });
      const result = await response.json();
      if (result.success) {
        setScheduledPosts(prev => prev.map(p => p.id === postId ? { ...p, content: newContent, scheduled_time: newTime } : p));
        setShowEditScheduledModal(false);
        setSelectedScheduledPost(null);
        setMessage({ type: 'success', text: 'Post updated successfully!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update post' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update post' });
    }
  };

  const handleCancelScheduledPost = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const response = await fetch(`/api/v1/scheduler/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' }
      });
      const result = await response.json();
      if (result.success) {
        setScheduledPosts(prev => prev.filter(p => p.id !== postId));
        setSelectedScheduledPost(null);
        setMessage({ type: 'success', text: 'Post cancelled successfully!' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to cancel post' });
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
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getPostsForDay = (day: number) => {
    const dateStr = `${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return scheduledPosts.filter(p => p.scheduled_time.startsWith(dateStr));
  };

  const navigateMonth = (direction: number) => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + direction, 1));
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Composer - Left Side */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Media Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Media</h3>
            <MediaUploader 
              mediaPreview={mediaPreview} 
              mediaType={media?.type} 
              onUpload={handleMediaUpload} 
              onClear={() => {setMedia(null); setMediaPreview(null);}} 
            />
          </div>

          {/* Content Composer */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Caption</h3>
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg">
                <button 
                  onClick={() => setIsPlatformSpecific(false)} 
                  className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${!isPlatformSpecific ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                >
                  Universal
                </button>
                <button 
                  onClick={() => {
                    setIsPlatformSpecific(true);
                    const currentPlatforms = getSelectedPlatforms();
                    setPlatformCaptions(prev => {
                      const next = { ...prev };
                      currentPlatforms.forEach(p => { if (!next[p]) next[p] = description; });
                      return next;
                    });
                    if (!activePlatformTab && currentPlatforms.length > 0) setActivePlatformTab(currentPlatforms[0]);
                  }} 
                  className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${isPlatformSpecific ? 'bg-indigo-600 text-white' : 'text-zinc-500'}`}
                >
                  Per Platform
                </button>
              </div>
            </div>

            {isPlatformSpecific && getSelectedPlatforms().length > 0 && (
              <div className="flex gap-2 p-4 border-b border-zinc-800 overflow-x-auto">
                {getSelectedPlatforms().map(p => (
                  <button 
                    key={p} 
                    onClick={() => setActivePlatformTab(p)} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activePlatformTab === p ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500' : 'bg-zinc-950 text-zinc-500 border border-zinc-800'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div className="p-4">
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
                placeholder={isPlatformSpecific ? `Write for ${activePlatformTab}...` : "Write your caption..."}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-sm leading-relaxed placeholder:text-zinc-600 outline-none focus:border-zinc-700 min-h-[180px] resize-none"
              />
            </div>

            <div className="px-4 pb-4 flex items-center justify-between">
              <button 
                onClick={() => setShowAIWriter(!showAIWriter)} 
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${showAIWriter ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              >
                <Sparkles className="w-4 h-4" />
                AI Generate
              </button>
              <span className="text-xs text-zinc-600">
                {isPlatformSpecific ? platformCaptions[activePlatformTab]?.length || 0 : description.length} chars
              </span>
            </div>

            {showAIWriter && (
              <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
                <AIWriterPanel 
                  topic={topic} onTopicChange={setTopic} 
                  contentType={contentType} onContentTypeChange={setContentType}
                  aiLength={aiLength} onAiLengthChange={setAiLength} 
                  aiTone={aiTone} onAiToneChange={setAiTone}
                  onGenerate={handleGenerateAI} generating={generating}
                />
              </div>
            )}
          </div>

          {/* Platform Selection */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Post To</h3>
            <PlatformSelector 
              connectedAccounts={connectedAccounts}
              selectedAccountIds={selectedAccountIds}
              onToggleAccount={toggleAccountSelection}
              expandedPlatforms={expandedPlatforms}
              onToggleExpansion={togglePlatformExpansion}
              userRole={userRole}
            />
          </div>

          {/* Submit */}
          <button 
            onClick={handleSubmitIntent} 
            disabled={submitting} 
            className={`w-full py-4 font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${userRole === 'ADMIN' ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-white text-black hover:bg-zinc-200'}`}
          >
            {submitting ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            {activeRevisionId ? 'Resubmit' : userRole === 'ADMIN' ? 'Publish Now' : 'Submit for Review'}
          </button>
        </div>

        {/* Right Sidebar - All-in-One */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Week Calendar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Calendar className="w-3 h-3 text-indigo-400" />
                This Week
              </h3>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                const date = new Date();
                date.setDate(date.getDate() - date.getDay() + i);
                const dateStr = date.toISOString().split('T')[0];
                const posts = scheduledPosts.filter(p => p.scheduled_time.startsWith(dateStr));
                const isToday = new Date().toDateString() === date.toDateString();
                return (
                  <div key={day} className="text-center">
                    <div className={`text-[10px] font-medium mb-1 ${isToday ? 'text-indigo-400' : 'text-zinc-500'}`}>{day}</div>
                    <div className={`text-sm font-bold mb-2 ${isToday ? 'text-indigo-400' : 'text-white'}`}>{date.getDate()}</div>
                    <div className="space-y-1">
                      {posts.slice(0, 2).map(post => (
                        <div key={post.id} className={`h-1.5 rounded-full ${post.status === 'SCHEDULED' ? 'bg-emerald-500' : post.status === 'PUBLISHED' ? 'bg-blue-500' : 'bg-rose-500'}`} />
                      ))}
                      {posts.length > 2 && <div className="text-[8px] text-zinc-600">+{posts.length - 2}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scheduled Posts */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
              <Clock className="w-3 h-3 text-emerald-400" />
              Scheduled ({scheduledPosts.length})
            </h3>
            {scheduledPosts.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">No posts scheduled</p>
            ) : (
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {scheduledPosts.slice(0, 5).map(post => (
                  <button
                    key={post.id}
                    onClick={() => { setSelectedScheduledPost(post); setShowEditScheduledModal(true); }}
                    className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-indigo-400">{post.platform}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${post.status === 'SCHEDULED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>{post.status}</span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate mb-1">{post.content}</p>
                    <p className="text-[10px] text-zinc-600">{new Date(post.scheduled_time).toLocaleDateString()} at {new Date(post.scheduled_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Scheduler */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-amber-400" />
              AI Scheduler
            </h3>
            <div className="space-y-3">
              <select
                value={audienceRegion}
                onChange={(e) => setAudienceRegion(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs outline-none"
              >
                <option value="Global">Global Audience</option>
                <option value="US (EST)">US (EST)</option>
                <option value="US (PST)">US (PST)</option>
                <option value="UK / Europe">UK / Europe</option>
                <option value="Asia Pacific">Asia Pacific</option>
              </select>
              <select
                value={audienceAgeGroup}
                onChange={(e) => setAudienceAgeGroup(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs outline-none"
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
              <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                {suggestedTimes.slice(0, 2).map((rec, i) => (
                  <div key={i} className="p-3 bg-zinc-950 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-emerald-400">{rec.user_local_time_start} - {rec.user_local_time_end}</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">{Math.round(rec.confidence_score * 100)}%</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">{rec.audience_timezone}: {rec.best_start_time} - {rec.best_end_time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Queue - Only for Admin/Manager - Horizontal Compact */}
      {pendingPosts.length > 0 && (userRole === 'ADMIN' || userRole === 'MANAGER') && (
        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-indigo-400" />
              Approval Queue ({pendingPosts.length})
            </h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
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
      {/* Edit Scheduled Post Modal */}
                      {/* Edit Scheduled Post Modal */}
      {showEditScheduledModal && selectedScheduledPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Edit Scheduled Post</h3>
              <button onClick={() => { setShowEditScheduledModal(false); setSelectedScheduledPost(null); }} className="text-zinc-500 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-zinc-400 mb-1">Platform</div>
                <p className="text-white font-medium">{selectedScheduledPost.platform}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Content</label>
                <textarea
                  defaultValue={selectedScheduledPost.content}
                  id="editContent"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 min-h-[100px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Scheduled Time</label>
                <input
                  type="datetime-local"
                  defaultValue={selectedScheduledPost.scheduled_time.slice(0, 16)}
                  id="editTime"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    const newContent = (document.getElementById('editContent') as HTMLTextAreaElement).value;
                    const newTime = (document.getElementById('editTime') as HTMLInputElement).value;
                    handleEditScheduledPost(selectedScheduledPost.id, newContent, new Date(newTime).toISOString());
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Save Changes
                </button>
                <button
                  onClick={() => handleCancelScheduledPost(selectedScheduledPost.id)}
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] text-zinc-500 animate-pulse">Warming Engine...</div>}>
      <PublishPageInner />
    </Suspense>
  );
}
