"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  CheckCircle2, AlertCircle, XCircle 
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

  const loadRevision = useCallback((rev: any) => {
    try {
      const parsedContent = JSON.parse(rev.content);
      if (typeof parsedContent === 'object' && !Array.isArray(parsedContent)) {
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
      
      // Fetch Connected Accounts
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

      // Fetch Creator Revisions
      const { data: revs } = await supabase
        .from('publish_intents')
        .select('*')
        .eq('creator_id', user.id)
        .eq('status', 'RETURNED'); // Adjusted to match teammate's new status
      if (revs) setRevisions(revs);

      // Admin/Manager Queue Preview
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
    if (revisionId && revisions.length > 0) {
      const rev = revisions.find(r => r.id === revisionId);
      if (rev) loadRevision(rev);
    }
  }, [searchParams, revisions, loadRevision]);

  const getSelectedPlatforms = () => {
    return Array.from(new Set(
      connectedAccounts
        .filter(a => selectedAccountIds.includes(a.id))
        .map(a => a.platform)
    ));
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
      setMessage({ type: 'error', text: 'Backend AI connection failed.' });
    }
    setGenerating(false);
  };

  // Scheduling state
  const [suggestedTimes, setSuggestedTimes] = useState<{time: string, label: string}[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('immediate');
  const [customTime, setCustomTime] = useState<string>("");

  const handleSubmitIntent = async () => {
    const activeDescription = isPlatformSpecific ? platformCaptions[activePlatformTab] : description;
    if (!activeDescription || (!media && !mediaPreview)) {
      setMessage({ type: 'error', text: 'Media and Description are required to submit.' });
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
        scheduled_for: selectedTime === 'immediate' ? new Date().toISOString() : new Date(customTime || selectedTime).toISOString(),
        media_url: publicUrl
      };

      const { error } = activeRevisionId 
        ? await supabase.from('publish_intents').update(intentData).eq('id', activeRevisionId)
        : await supabase.from('publish_intents').insert(intentData);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: isAdmin ? 'Post successfully scheduled!' : 'Post submitted for approval!'
      });
      
      // Cleanup
      setTopic(""); setDescription(""); setMedia(null); setMediaPreview(null);
      setSuggestedTimes([]); setActiveRevisionId(null); setSelectedAccountIds([]);
      fetchUserData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
    setSubmitting(false);
  };

  const handleGovernanceAction = async (postId: string, action: string) => {
    try {
      const response = await fetch('/api/v1/governance/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId: postId,
          newStatus: action,
          feedback: action === 'RETURNED' ? reviewComment : null,
          userId: (await supabase.auth.getUser()).data.user?.id,
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
        <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Syncing Workspace...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Social Publisher</h1>
          <p className="text-zinc-500 text-xs font-medium tracking-wide">Draft and schedule high-end social content.</p>
        </div>
        <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${userRole === 'ADMIN' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">{userRole}</span>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <PlatformSelector 
            connectedAccounts={connectedAccounts}
            selectedAccountIds={selectedAccountIds}
            onToggleAccount={(id) => setSelectedAccountIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])}
            expandedPlatforms={expandedPlatforms}
            onToggleExpansion={(p) => setExpandedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
            userRole={userRole}
          />
          
          <MediaUploader 
            mediaPreview={mediaPreview} 
            onUpload={(e) => {
              const file = e.target.files?.[0];
              if (file) { setMedia(file); setMediaPreview(URL.createObjectURL(file)); }
            }} 
            onClear={() => {setMedia(null); setMediaPreview(null);}} 
          />

          <AIWriterPanel 
            topic={topic} onTopicChange={setTopic} 
            contentType={contentType} onContentTypeChange={setContentType}
            aiLength={aiLength} onAiLengthChange={setAiLength} 
            aiTone={aiTone} onAiToneChange={setAiTone}
            onGenerate={handleGenerateAI} generating={generating}
            useEmojis={useEmojis} onToggleEmojis={() => setUseEmojis(!useEmojis)}
            description={isPlatformSpecific ? platformCaptions[activePlatformTab] : description}
            onDescriptionChange={(val) => isPlatformSpecific ? setPlatformCaptions(p => ({...p, [activePlatformTab]: val})) : setDescription(val)}
            isPlatformSpecific={isPlatformSpecific} onTogglePlatformSpecific={() => setIsPlatformSpecific(!isPlatformSpecific)}
            platformTabs={getSelectedPlatforms()}
            activePlatformTab={activePlatformTab} onPlatformTabChange={setActivePlatformTab}
          />
        </div>

        <div className="lg:col-span-1 space-y-6">
          <SchedulingPanel 
            suggestedTimes={suggestedTimes} 
            selectedTime={selectedTime} 
            onSelect={setSelectedTime} 
            customTime={customTime} 
            onCustomTimeChange={setCustomTime} 
          />
          
          <button onClick={handleSubmitIntent} disabled={submitting} className="w-full py-4 bg-white text-black font-black rounded-2xl transition-all uppercase tracking-widest text-xs disabled:opacity-50">
            {submitting ? "Submitting..." : activeRevisionId ? 'Resubmit Draft' : 'Submit for Approval'}
          </button>

          {pendingPosts.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">Review Queue ({pendingPosts.length})</h2>
              <div className="space-y-4">
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
