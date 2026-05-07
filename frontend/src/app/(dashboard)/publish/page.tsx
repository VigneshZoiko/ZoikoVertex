"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Send, Globe, CheckCircle2, AlertCircle, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Modular Components
import PlatformSelector from "@/components/publish/PlatformSelector";
import MediaUploader from "@/components/publish/MediaUploader";
import AIWriterPanel from "@/components/publish/AIWriterPanel";
import SchedulingPanel from "@/components/publish/SchedulingPanel";
import PendingPostItem from "@/components/publish/PendingPostItem";

export default function PublishPage() {
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState("Entertainment");
  
  // Teammate's Account Features
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [expandedPlatforms, setExpandedPlatforms] = useState<string[]>([]);
  
  // Teammate's Platform-Specific Caption Features
  const [isPlatformSpecific, setIsPlatformSpecific] = useState(false);
  const [platformCaptions, setPlatformCaptions] = useState<Record<string, string>>({});
  const [activePlatformTab, setActivePlatformTab] = useState<string>("");

  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  // AI Settings
  const [aiLength, setAiLength] = useState("medium");
  const [aiTone, setAiTone] = useState("professional");
  const [useEmojis, setUseEmojis] = useState(true);

  // AI State
  const [generating, setGenerating] = useState(false);
  const [description, setDescription] = useState("");
  const [suggestedTimes, setSuggestedTimes] = useState<{time: string, label: string}[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('immediate');
  const [customTime, setCustomTime] = useState<string>("");

  const [showAIWriter, setShowAIWriter] = useState(false);

  // Submit State
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);

  // Admin/Manager Workflow State
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [reviewComment, setReviewComment] = useState("");

  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
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

        // Admin/Manager Queues
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

        // Creator Revisions
        const { data: revs } = await supabase
          .from('publish_intents')
          .select('*')
          .eq('creator_id', user.id)
          .eq('status', 'NEEDS_REVISION');
        if (revs) setRevisions(revs);
      }
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

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
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
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
          topic,
          contentType,
          platforms: getSelectedPlatforms(),
          length: aiLength,
          tone: aiTone,
          useEmojis
        })
      });
      const data = await response.json();
      if (response.ok) {
        setDescription(data.description);
        setSuggestedTimes(data.suggestedTimes);
      } else {
        setMessage({ type: 'error', text: data.error || 'AI Generation Failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Backend AI connection failed.' });
    }
    setGenerating(false);
  };

  const handleSubmitIntent = async () => {
    if (!description || !media) {
      setMessage({ type: 'error', text: 'Media and Description are required.' });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = media.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      await supabase.storage.from('media').upload(filePath, media);
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

      const isAdmin = userRole === 'ADMIN';
      const intentData = {
        workspace_id: (await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()).data?.workspace_id,
        creator_id: user.id,
        content: isPlatformSpecific ? JSON.stringify(platformCaptions) : description,
        platform: getSelectedPlatforms().join(', '),
        target_account_ids: selectedAccountIds,
        status: isAdmin ? 'APPROVED' : 'PENDING_ADMIN',
        scheduled_for: selectedTime === 'immediate' ? new Date().toISOString() : selectedTime === 'custom' ? new Date(customTime).toISOString() : selectedTime,
        media_url: publicUrl,
        feedback: null
      };

      if (activeRevisionId) {
        await supabase.from('publish_intents').update(intentData).eq('id', activeRevisionId);
      } else {
        await supabase.from('publish_intents').insert(intentData);
      }

      setMessage({ type: 'success', text: isAdmin ? 'Post approved!' : 'Post submitted!' });
      setTopic(""); setDescription(""); setMedia(null); setMediaPreview(null); setActiveRevisionId(null);
      fetchUserData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
    setSubmitting(false);
  };

  const handleAdminAction = async (postId: string, action: string) => {
    try {
      await supabase.from('publish_intents').update({ status: action, feedback: action === 'PENDING_MANAGER' ? reviewComment : null }).eq('id', postId);
      setReviewComment(""); fetchUserData();
      setMessage({ type: 'success', text: `Action completed.` });
    } catch (err: any) { setMessage({ type: 'error', text: err.message }); }
  };

  const handleManagerAction = async (postId: string, action: string) => {
    try {
      await supabase.from('publish_intents').update({ status: action }).eq('id', postId);
      fetchUserData();
      setMessage({ type: 'success', text: 'Action completed.' });
    } catch (err: any) { setMessage({ type: 'error', text: err.message }); }
  };

  const loadRevision = (rev: any) => {
    setDescription(rev.content);
    setActiveRevisionId(rev.id);
    setMessage({ type: 'success', text: 'Revision loaded.' });
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Social Publisher</h1>
        <p className="text-zinc-400 text-sm">Draft, optimize with AI, and submit content for governance approval.</p>
      </div>

      {revisions.length > 0 && userRole === 'CREATOR' && (
        <div className="mb-8 space-y-4">
          <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Revisions Requested</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {revisions.map(rev => (
              <div key={rev.id} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <p className="text-xs text-zinc-400 mb-2 italic">"{rev.feedback || 'No feedback'}"</p>
                <button onClick={() => loadRevision(rev)} className="w-full py-1.5 bg-amber-500/20 text-amber-500 text-[10px] font-bold rounded-lg uppercase">Edit</button>
              </div>
            ))}
          </div>
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
          <MediaUploader mediaPreview={mediaPreview} mediaType={media?.type} onUpload={handleMediaUpload} onClear={() => {setMedia(null); setMediaPreview(null);}} />

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Post Content</h2>
                <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <button onClick={() => setIsPlatformSpecific(false)} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md ${!isPlatformSpecific ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Universal</button>
                  <button onClick={() => setIsPlatformSpecific(true)} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md ${isPlatformSpecific ? 'bg-indigo-600 text-white' : 'text-zinc-500'}`}>Specific</button>
                </div>
              </div>

              {isPlatformSpecific && getSelectedPlatforms().length > 0 && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                  {getSelectedPlatforms().map(p => (
                    <button key={p} onClick={() => setActivePlatformTab(p)} className={`px-4 py-2 rounded-xl border text-xs font-bold ${activePlatformTab === p ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                <textarea 
                  value={isPlatformSpecific ? (platformCaptions[activePlatformTab] || description) : description}
                  onChange={(e) => isPlatformSpecific ? setPlatformCaptions(prev => ({ ...prev, [activePlatformTab]: e.target.value })) : setDescription(e.target.value)}
                  placeholder="Write your caption here..."
                  className="w-full bg-transparent p-6 text-white text-base leading-relaxed outline-none resize-none min-h-[220px]"
                />
                <div className="p-4 flex items-center justify-between border-t border-zinc-800/50 bg-zinc-900/30">
                  <button onClick={() => setShowAIWriter(!showAIWriter)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${showAIWriter ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}><Sparkles className="w-3.5 h-3.5" /> AI Writer</button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setUseEmojis(!useEmojis)} className={`w-10 h-10 flex items-center justify-center rounded-xl ${useEmojis ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-800'}`}>😊</button>
                    <button onClick={() => setDescription(prev => prev + " #")} className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800">#</button>
                  </div>
                </div>
              </div>
            </div>

            {showAIWriter && (
              <AIWriterPanel 
                topic={topic} onTopicChange={setTopic} contentType={contentType} onContentTypeChange={setContentType}
                aiLength={aiLength} onAiLengthChange={setAiLength} aiTone={aiTone} onAiToneChange={setAiTone}
                onGenerate={handleGenerateAI} generating={generating}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <SchedulingPanel suggestedTimes={suggestedTimes} selectedTime={selectedTime} onSelect={setSelectedTime} customTime={customTime} onCustomTimeChange={setCustomTime} contentType={contentType} />
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">Governance</h2>
            {message && <div className={`mb-4 p-3 text-sm rounded-lg border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-rose-500/10 border-rose-500 text-rose-400'}`}>{message.text}</div>}
            <button onClick={handleSubmitIntent} disabled={submitting || !media || (!description && !isPlatformSpecific)} className={`w-full py-3 font-bold rounded-lg ${userRole === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-white text-black'}`}>
              {submitting ? "Processing..." : userRole === 'ADMIN' ? "Publish Directly" : "Submit to Admin"}
            </button>
          </div>

          {pendingPosts.length > 0 && (userRole === 'ADMIN' || userRole === 'MANAGER') && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-indigo-400" /> Review Queue ({pendingPosts.length})</h2>
              <div className="space-y-4">
                {pendingPosts.map(post => (
                  <PendingPostItem key={post.id} post={post} userRole={userRole} reviewComment={reviewComment} onReviewCommentChange={setReviewComment} onAdminAction={handleAdminAction} onManagerAction={handleManagerAction} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
