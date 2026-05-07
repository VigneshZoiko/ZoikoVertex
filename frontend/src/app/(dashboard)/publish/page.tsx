"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import NextImage from "next/image";
import { 
  Sparkles, Clock, CheckCircle2,
  Image as ImageIcon, Video, Send, Globe,
  XCircle, RefreshCcw, AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Custom Brand Icons
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

// Inner component that uses useSearchParams (must be wrapped in Suspense)
function PublishPageInner() {
  const searchParams = useSearchParams();

  const [topic, setTopic] = useState("");
  const [contentType] = useState("Entertainment");
  const [platforms, setPlatforms] = useState({ facebook: true, instagram: false, linkedin: false, twitter: false });
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const [aiTone, setAiTone] = useState("professional");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [generating, setGenerating] = useState(false);
  const [description, setDescription] = useState("");
  const [suggestedTimes, setSuggestedTimes] = useState<{time: string, label: string}[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('immediate');
  const [customTime, setCustomTime] = useState<string>("");
  const [showAIWriter, setShowAIWriter] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRevision = useCallback((rev: any) => {
    setDescription(rev.content);
    setActiveRevisionId(rev.id);
    setMediaPreview(rev.media_url);
    if (rev.platform) {
      const pList = rev.platform.split(', ');
      setPlatforms({
        facebook: pList.includes('facebook'),
        instagram: pList.includes('instagram'),
        linkedin: pList.includes('linkedin'),
        twitter: pList.includes('twitter')
      });
    }
    setMessage({ type: 'success', text: 'Revision loaded. Modify your content and resubmit.' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: member, error: mError } = await supabase
        .from('workspace_members')
        .select('role, workspace_id')
        .eq('user_id', user.id)
        .single();
      if (mError) console.error("Member Role Fetch Error:", mError);
      if (member) {
        setUserRole(member.role);
        const { data: revs, error: rError } = await supabase
          .from('publish_intents')
          .select('*')
          .eq('creator_id', user.id)
          .eq('status', 'RETURNED');
        if (rError) console.error("Revisions Error:", rError);
        if (revs) setRevisions(revs);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Load revision from URL param (navigated from /review page)
  useEffect(() => {
    const revisionId = searchParams.get('revisionId');
    if (revisionId && revisions.length > 0) {
      const rev = revisions.find(r => r.id === revisionId);
      if (rev) loadRevision(rev);
    }
  }, [searchParams, revisions, loadRevision]);

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
    const newHistory = history.slice(0, historyIndex + 1);
    try {
      const response = await fetch('http://localhost:5000/api/v1/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic, contentType,
          platforms: Object.entries(platforms).filter(([_, v]) => v).map(([k]) => k),
          tone: aiTone,
        })
      });
      const data = await response.json();
      if (response.ok) {
        setDescription(data.description);
        setSuggestedTimes(data.suggestedTimes || []);
        const updatedHistory = [...newHistory, data.description];
        setHistory(updatedHistory);
        setHistoryIndex(updatedHistory.length - 1);
      } else {
        setMessage({ type: 'error', text: data.error || 'AI Generation Failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Backend AI connection failed. Ensure server is running.' });
    }
    setGenerating(false);
  };

  const handleSubmitIntent = async () => {
    if (!description || (!media && !mediaPreview)) {
      setMessage({ type: 'error', text: 'Media and Description are required to submit.' });
      return;
    }
    if (selectedTime === 'custom' && !customTime) {
      setMessage({ type: 'error', text: 'Please select a custom date and time.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

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
      const { data: memberData } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single();
      const intentData = {
        workspace_id: memberData?.workspace_id,
        creator_id: user.id,
        content: description,
        platform: Object.entries(platforms).filter(([_, v]) => v).map(([k]) => k).join(', '),
        status: isAdmin ? 'APPROVED' : 'PENDING_ADMIN',
        scheduled_for: selectedTime === 'immediate'
          ? new Date().toISOString()
          : selectedTime === 'custom'
            ? new Date(customTime).toISOString()
            : selectedTime,
        media_url: publicUrl,
        feedback: null
      };

      let error;
      if (activeRevisionId) {
        const { error: updateError } = await supabase.from('publish_intents').update(intentData).eq('id', activeRevisionId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('publish_intents').insert(intentData);
        error = insertError;
      }
      if (error) throw error;

      setMessage({
        type: 'success',
        text: isAdmin ? 'Post successfully pre-approved and scheduled!' : 'Post successfully submitted to Admin for approval!'
      });
      if (activeRevisionId) {
        setRevisions(prev => prev.filter(r => r.id !== activeRevisionId));
      }
      setTopic(""); setDescription(""); setMedia(null); setMediaPreview(null);
      setSuggestedTimes([]); setActiveRevisionId(null);
      setPlatforms({ facebook: true, instagram: false, linkedin: false, twitter: false });
      setCustomTime(""); setSelectedTime("immediate");
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
    setSubmitting(false);
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
    <div className="max-w-6xl mx-auto pb-12">
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
      {revisions.length > 0 && (
        <div className="mb-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-black text-amber-500">
              {revisions.length} {revisions.length === 1 ? 'Post' : 'Posts'} Returned for Revision
            </p>
            <p className="text-xs text-zinc-500">Visit the Review &amp; Edit page to address manager feedback.</p>
          </div>
        </div>
      )}

      {/* Message Banner */}
      {message && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Composer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Composer */}
        <div className="lg:col-span-2 space-y-6">

          {/* Platform Selection */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-400" />
                Target Accounts
              </h2>
              <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-1 rounded font-bold uppercase tracking-wider">Multi-Select Enabled</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(platforms).map(([key, active]) => {
                const Icon = key === 'facebook' ? FacebookIcon : key === 'instagram' ? InstagramIcon : key === 'linkedin' ? LinkedinIcon : TwitterIcon;
                return (
                  <button
                    key={key}
                    onClick={() => setPlatforms({...platforms, [key]: !active})}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 relative group ${
                      active
                        ? 'bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/10'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      active
                        ? key === 'facebook' ? 'bg-blue-600 text-white' : key === 'instagram' ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white' : key === 'linkedin' ? 'bg-blue-700 text-white' : 'bg-white text-black'
                        : 'bg-zinc-800 text-zinc-600 group-hover:text-zinc-400'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-white' : ''}`}>{key}</span>
                    {active && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Media Upload */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Media Assets</h2>
            {!mediaPreview ? (
              <label className="w-full h-48 border-2 border-dashed border-zinc-800 hover:border-indigo-500 hover:bg-indigo-500/5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors">
                <div className="flex items-center gap-4 mb-2">
                  <ImageIcon className="w-6 h-6 text-zinc-500" />
                  <Video className="w-6 h-6 text-zinc-500" />
                </div>
                <span className="text-sm font-medium text-zinc-300">Click to upload Image or Video</span>
                <span className="text-xs text-zinc-500 mt-1">MP4, JPG, PNG (Max 50MB)</span>
                <input type="file" className="hidden" accept="image/*,video/*" onChange={handleMediaUpload} />
              </label>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-800">
                {media?.type.startsWith('video') ? (
                  <video src={mediaPreview} controls className="max-h-full max-w-full" />
                ) : (
                  <NextImage
                    src={mediaPreview!}
                    alt="Media preview"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                )}
                <button
                  onClick={() => { setMedia(null); setMediaPreview(null); }}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-rose-500 text-white p-1.5 rounded-lg backdrop-blur-md transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Content Composer */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Post Content</h2>
              {activeRevisionId && (
                <div className="mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-bold flex items-center gap-2">
                  <RefreshCcw className="w-3.5 h-3.5" />
                  Editing a returned revision — modify and resubmit.
                </div>
              )}
              <div className="relative bg-zinc-950/50 border border-zinc-800 rounded-2xl focus-within:border-indigo-500/50 transition-all duration-300">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write your caption here..."
                  className="w-full bg-transparent p-6 text-white text-base leading-relaxed placeholder:text-zinc-600 outline-none resize-none min-h-[220px]"
                />
                <div className="p-4 flex items-center justify-between border-t border-zinc-800/50 bg-zinc-900/30">
                  <button
                    onClick={() => setShowAIWriter(!showAIWriter)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${showAIWriter ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Writer
                  </button>
                  <span className="text-[10px] text-zinc-600">{description.length} characters</span>
                </div>
              </div>
            </div>

            {showAIWriter && (
              <div className="bg-zinc-950/80 border-t border-zinc-800 p-8 space-y-6 animate-in slide-in-from-top duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Topic</label>
                    <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Tone</label>
                    <select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500">
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="bold">Bold</option>
                      <option value="inspirational">Inspirational</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleGenerateAI}
                  disabled={generating || !topic}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Content
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Scheduling + Submit */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sticky top-8 shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Scheduling
            </h2>

            <div className="space-y-4">
              <label className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-colors ${selectedTime === 'immediate' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                <input type="radio" name="schedule" checked={selectedTime === 'immediate'} onChange={() => setSelectedTime('immediate')} className="hidden" />
                <div className="flex-1"><p className="text-sm font-bold text-white">Post Immediately</p></div>
                {selectedTime === 'immediate' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              </label>

              <div className={`p-4 rounded-2xl border transition-colors ${selectedTime === 'custom' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="schedule" checked={selectedTime === 'custom'} onChange={() => setSelectedTime('custom')} className="hidden" />
                  <div className="flex-1"><p className="text-sm font-bold text-white">Custom Time</p></div>
                  {selectedTime === 'custom' && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                </label>
                {selectedTime === 'custom' && (
                  <input type="datetime-local" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="mt-4 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-indigo-500" />
                )}
              </div>

              {suggestedTimes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">AI Predicted Peak Times</span>
                  </div>
                  {suggestedTimes.map((st) => (
                    <label key={st.time} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors ${selectedTime === st.time ? 'bg-indigo-500/10 border-indigo-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                      <input type="radio" name="schedule" checked={selectedTime === st.time} onChange={() => setSelectedTime(st.time)} className="hidden" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white">{st.label}</p>
                        <p className="text-[10px] text-zinc-500">{new Date(st.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                      </div>
                      {selectedTime === st.time && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSubmitIntent}
              disabled={submitting || !description}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
            >
              {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              {activeRevisionId ? 'Resubmit for Approval' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Exported page wraps inner component in Suspense (required for useSearchParams)
export default function PublishPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Loading Publisher...</p>
      </div>
    }>
      <PublishPageInner />
    </Suspense>
  );
}
