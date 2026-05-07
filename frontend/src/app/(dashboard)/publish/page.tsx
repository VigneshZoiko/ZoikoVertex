"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Sparkles, Send, Globe, CheckCircle2, AlertCircle, RefreshCcw, 
  XCircle, ChevronRight 
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

      // Fetch Creator Revisions (Returned from Manager)
      const { data: revs } = await supabase
        .from('publish_intents')
        .select('*')
        .eq('creator_id', user.id)
        .eq('status', 'NEEDS_REVISION');
      if (revs) setRevisions(revs);

      // Admin/Manager Queue Preview (if applicable)
      if (member.role === 'ADMIN') {
        const { data: queue } = await supabase
          .from('publish_intents')
          .select('*, users!publish_intents_creator_id_fkey(full_name)')
          .eq('status', 'PENDING_ADMIN');
        if (queue) setPendingPosts(queue);
      } else if (member.role === 'MANAGER') {
        const { data: queue } = await supabase
          .from('publish_intents')
          .select('*, users!publish_intents_creator_id_fkey(full_name)')
          .eq('status', 'PENDING_MANAGER');
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
        if (!platformCaptions[account.platform]) {
          setPlatformCaptions(pc => ({ ...pc, [account.platform]: description }));
        }
        if (!activePlatformTab) setActivePlatformTab(account.platform);
      }
      return newSelection;
    });
  };

  const getSelectedPlatforms = () => {
    const selectedPlatforms = new Set(
      connectedAccounts
        .filter(a => selectedAccountIds.includes(a.id))
        .map(a => a.platform)
    );
    return Array.from(selectedPlatforms);
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
      const response = await fetch('http://localhost:5000/api/v1/ai/generate', {
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
        const content = data.description;
        if (isPlatformSpecific && activePlatformTab) {
          setPlatformCaptions(prev => ({ ...prev, [activePlatformTab]: content }));
        } else {
          setDescription(content);
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
        const filePath = `${user.id}/${Math.random()}.${fileExt}`;
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
          : selectedTime === 'custom'
            ? new Date(customTime).toISOString()
            : selectedTime,
        media_url: publicUrl,
        feedback: null
      };

      if (activeRevisionId) {
        const { error: updateError } = await supabase.from('publish_intents').update(intentData).eq('id', activeRevisionId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('publish_intents').insert(intentData);
        if (insertError) throw insertError;
      }

      setMessage({
        type: 'success',
        text: isAdmin ? 'Post successfully pre-approved and scheduled!' : 'Post successfully submitted for approval!'
      });
      
      // Cleanup
      if (activeRevisionId) setRevisions(prev => prev.filter(r => r.id !== activeRevisionId));
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

  const handleAdminAction = async (postId: string, action: string) => {
    try {
      const { error } = await supabase
        .from('publish_intents')
        .update({ status: action, feedback: action === 'PENDING_MANAGER' ? reviewComment : null })
        .eq('id', postId);
      if (error) throw error;
      setReviewComment(""); 
      fetchUserData();
      setMessage({ type: 'success', text: `Action completed.` });
    } catch (err: any) { 
      setMessage({ type: 'error', text: err.message }); 
    }
  };

  const handleManagerAction = async (postId: string, action: string) => {
    try {
      const { error } = await supabase
        .from('publish_intents')
        .update({ status: action })
        .eq('id', postId);
      if (error) throw error;
      fetchUserData();
      setMessage({ type: 'success', text: 'Action completed.' });
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
          <p className="text-zinc-500 text-xs font-medium tracking-wide">
            Draft, optimize with AI, and submit content for governance approval.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${userRole?.toUpperCase() === 'ADMIN' ? 'bg-rose-500' : userRole?.toUpperCase() === 'MANAGER' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{userRole || 'Guest'}</span>
          </div>
        </div>
      </div>

      {/* Revisions Banner */}
      {revisions.length > 0 && userRole === 'CREATOR' && (
        <div className="mb-8 p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm font-black text-amber-500 uppercase tracking-tight">Revisions Requested: {revisions.length} Drafts</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {revisions.map(rev => (
              <div key={rev.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                <p className="text-[10px] text-zinc-500 line-clamp-2 italic">&quot;{rev.feedback || 'No feedback provided'}&quot;</p>
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
            onToggleAccount={toggleAccountSelection}
            expandedPlatforms={expandedPlatforms}
            onToggleExpansion={togglePlatformExpansion}
          />
          
          <MediaUploader 
            mediaPreview={mediaPreview} 
            mediaType={media?.type} 
            onUpload={handleMediaUpload} 
            onClear={() => {setMedia(null); setMediaPreview(null);}} 
          />

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Post Content</h2>
                <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <button 
                    onClick={() => setIsPlatformSpecific(false)} 
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${!isPlatformSpecific ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-400'}`}
                  >
                    Universal
                  </button>
                  <button 
                    onClick={() => setIsPlatformSpecific(true)} 
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${isPlatformSpecific ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-400'}`}
                  >
                    Platform-Specific
                  </button>
                </div>
              </div>

              {isPlatformSpecific && getSelectedPlatforms().length > 0 && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                  {getSelectedPlatforms().map(p => (
                    <button 
                      key={p} 
                      onClick={() => setActivePlatformTab(p)} 
                      className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${activePlatformTab === p ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative bg-zinc-950/50 border border-zinc-800 rounded-2xl">
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
                  className="w-full bg-transparent p-6 text-white text-base leading-relaxed placeholder:text-zinc-600 outline-none resize-none min-h-[220px]"
                />
                <div className="p-4 flex items-center justify-between border-t border-zinc-800/50 bg-zinc-900/30">
                  <button onClick={() => setShowAIWriter(!showAIWriter)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${showAIWriter ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Writer
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setUseEmojis(!useEmojis)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${useEmojis ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-800 text-zinc-500'}`}>😊</button>
                    <span className="text-[10px] text-zinc-600 ml-2">{(isPlatformSpecific ? platformCaptions[activePlatformTab]?.length || 0 : description.length)} chars</span>
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
                onGenerate={handleGenerateAI} generating={generating}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <SchedulingPanel 
            suggestedTimes={suggestedTimes} 
            selectedTime={selectedTime} 
            onSelect={setSelectedTime} 
            customTime={customTime} 
            onCustomTimeChange={setCustomTime} 
            contentType={contentType} 
          />
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white mb-2">Submission</h2>
            <button 
              onClick={handleSubmitIntent} 
              disabled={submitting} 
              className={`w-full py-4 font-black rounded-2xl transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs ${userRole === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-white text-black'}`}
            >
              {submitting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              {activeRevisionId ? 'Resubmit for Approval' : userRole === 'ADMIN' ? 'Publish Directly' : 'Submit for Approval'}
            </button>
          </div>

          {pendingPosts.length > 0 && (userRole === 'ADMIN' || userRole === 'MANAGER') && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> Review Queue ({pendingPosts.length})</h2>
              <div className="space-y-4">
                {pendingPosts.map(post => (
                  <PendingPostItem 
                    key={post.id} 
                    post={post} 
                    userRole={userRole} 
                    reviewComment={reviewComment} 
                    onReviewCommentChange={setReviewComment} 
                    onAdminAction={handleAdminAction} 
                    onManagerAction={handleManagerAction} 
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
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold uppercase tracking-widest">Warming Engine...</p>
      </div>
    }>
      <PublishPageInner />
    </Suspense>
  );
}
