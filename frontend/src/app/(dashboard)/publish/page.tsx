"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { 
  Upload, Sparkles, Clock, CheckCircle2, AlertCircle, 
  Image as ImageIcon, Video, Send, Globe, MessageSquare, 
  Camera, Briefcase, Hash, ChevronRight, XCircle, RefreshCcw
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Custom Brand Icons (since lucide-react version is missing them)
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

export default function PublishPage() {
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState("Entertainment");
  const [platforms, setPlatforms] = useState({ facebook: true, instagram: false, linkedin: false, twitter: false });
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  // AI Settings
  const [aiLength, setAiLength] = useState("medium");
  const [aiTone, setAiTone] = useState("professional");
  const [useEmojis, setUseEmojis] = useState(true);

  // History for Undo/Redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

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
      // Fetch Role
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role, workspace_id')
        .eq('user_id', user.id)
        .single();
      
      if (member) {
        setUserRole(member.role);
        
        // If Admin or Manager, fetch pending queue
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

        // Fetch Revisions if Creator
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

  const loadRevision = (rev: any) => {
    setDescription(rev.content);
    setActiveRevisionId(rev.id);
    setMessage({ type: 'success', text: 'Revision loaded. Make your changes and resubmit.' });
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
    
    // Hit our backend AI route
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory(newHistory);

    try {
      const response = await fetch('http://localhost:5000/api/v1/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          contentType,
          platforms: Object.entries(platforms).filter(([_, v]) => v).map(([k]) => k),
          length: aiLength,
          tone: aiTone,
          useEmojis
        })
      });
      const data = await response.json();
      
      if (response.ok) {
        setDescription(data.description);
        setSuggestedTimes(data.suggestedTimes);
        
        // Update history
        const updatedHistory = [...newHistory, data.description];
        setHistory(updatedHistory);
        setHistoryIndex(updatedHistory.length - 1);
      } else {
        setMessage({ type: 'error', text: data.error || 'AI Generation Failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Backend AI connection failed. Ensure server is running.' });
    }
    setGenerating(false);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = historyIndex - 1;
      setHistoryIndex(prev);
      setDescription(history[prev]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = historyIndex + 1;
      setHistoryIndex(next);
      setDescription(history[next]);
    }
  };

  const handleSubmitIntent = async () => {
    if (!description || !media) {
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

      // 1. Upload media to Supabase Storage
      const fileExt = media.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, media);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // 2. Insert or Update the intent
      const isAdmin = userRole === 'ADMIN';
      const intentData = {
        workspace_id: (await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()).data?.workspace_id,
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
        feedback: null // Clear feedback on resubmission
      };

      let error;
      if (activeRevisionId) {
        const { error: updateError } = await supabase
          .from('publish_intents')
          .update(intentData)
          .eq('id', activeRevisionId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('publish_intents')
          .insert(intentData);
        error = insertError;
      }

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: isAdmin 
          ? 'Post successfully pre-approved and scheduled!' 
          : 'Post successfully submitted to Admin for approval!' 
      });
      // Reset form
      setTopic(""); setDescription(""); setMedia(null); setMediaPreview(null); setSuggestedTimes([]); setActiveRevisionId(null);
      fetchUserData(); // Refresh lists
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
    
    setSubmitting(false);
  };

  const handleAdminAction = async (postId: string, action: 'APPROVED' | 'REJECTED' | 'PENDING_MANAGER') => {
    try {
      const { error } = await supabase
        .from('publish_intents')
        .update({ 
          status: action,
          feedback: action === 'PENDING_MANAGER' ? reviewComment : null
        })
        .eq('id', postId);

      if (error) throw error;
      setReviewComment("");
      fetchUserData();
      setMessage({ type: 'success', text: `Post ${action.replace('_', ' ')} successfully.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleManagerAction = async (postId: string, action: 'NEEDS_REVISION' | 'PENDING_ADMIN') => {
    try {
      const { error } = await supabase
        .from('publish_intents')
        .update({ status: action })
        .eq('id', postId);

      if (error) throw error;
      fetchUserData();
      setMessage({ type: 'success', text: action === 'NEEDS_REVISION' ? 'Post sent back to creator for changes.' : 'Post resubmitted to Admin.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Social Publisher</h1>
        <p className="text-zinc-400 text-sm">Draft, optimize with AI, and submit content for governance approval.</p>
      </div>

      {revisions.length > 0 && userRole === 'CREATOR' && (
        <div className="mb-8 space-y-4">
          <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Action Required: Revisions Requested
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {revisions.map(rev => (
              <div key={rev.id} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-zinc-400 mb-2 line-clamp-2 italic">&quot;{rev.feedback || 'No feedback provided'}&quot;</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Original: {rev.content.substring(0, 30)}...</p>
                </div>
                <button 
                  onClick={() => loadRevision(rev)}
                  className="mt-4 w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-[10px] font-bold rounded-lg transition-colors uppercase tracking-wider"
                >
                  Edit & Resubmit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Content Creation */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Account Selection */}
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
              
              <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-zinc-800 text-zinc-600 hover:border-indigo-500/50 hover:text-indigo-400 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center group-hover:bg-indigo-500/10">
                  <span className="text-xl">+</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tighter">Add New</span>
              </button>
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
                  <Image src={mediaPreview} alt="Media Preview" width={600} height={400} className="object-contain max-h-full" />
                )}
                <button 
                  onClick={() => { setMedia(null); setMediaPreview(null); }}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-rose-500 text-white p-1.5 rounded-lg backdrop-blur-md transition-colors"
                >
                  <AlertCircle className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Main Post Content Composer */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Post Content</h2>
              
              <div className="relative bg-zinc-950/50 border border-zinc-800 rounded-2xl focus-within:border-indigo-500/50 transition-all duration-300">
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write your caption here..."
                  className="w-full bg-transparent p-6 text-white text-base leading-relaxed placeholder:text-zinc-600 outline-none resize-none min-h-[220px]"
                />
                
                <div className="p-4 flex items-center justify-between border-t border-zinc-800/50 bg-zinc-900/30">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowAIWriter(!showAIWriter)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        showAIWriter ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Writer (Optional)
                    </button>

                    {history.length > 0 && (
                      <div className="flex gap-1 bg-zinc-800/50 p-1 rounded-lg">
                        <button onClick={handleUndo} disabled={historyIndex <= 0} className="px-2 py-1 text-[10px] text-zinc-500 hover:text-white disabled:opacity-30">Undo</button>
                        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="px-2 py-1 text-[10px] text-zinc-500 hover:text-white disabled:opacity-30">Redo</button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setUseEmojis(!useEmojis)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                        useEmojis ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-zinc-800 text-zinc-500 border border-transparent'
                      }`}
                      title="Toggle Emojis"
                    >
                      <span className="text-lg">😊</span>
                    </button>
                    <button 
                      onClick={() => setDescription(prev => prev + " #")}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-500 hover:text-white transition-all"
                      title="Add Hashtag"
                    >
                      <span className="text-lg font-bold">#</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable AI Control Panel */}
            {showAIWriter && (
              <div className="bg-zinc-950/80 border-t border-zinc-800 p-8 space-y-8 animate-in slide-in-from-top duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Post Topic</label>
                    <input 
                      type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. New sneaker launch"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Content Category</label>
                    <input 
                      type="text" list="content-types" value={contentType} onChange={(e) => setContentType(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    />
                    <datalist id="content-types">
                      <option value="Entertainment" /><option value="Music" /><option value="Technology" /><option value="Business" />
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                  <div className="md:col-span-1 space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Length</label>
                    <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                      {['short', 'medium', 'long'].map((l) => (
                        <button key={l} onClick={() => setAiLength(l)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${aiLength === l ? 'bg-indigo-500 text-white' : 'text-zinc-500 hover:text-white'}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-1 space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Brand Tone</label>
                    <select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-indigo-500">
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="excited">Excited</option>
                      <option value="educational">Educational</option>
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <button 
                      onClick={handleGenerateAI} disabled={generating || !topic}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                    >
                      {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Generate Magic
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scheduling & Action */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Scheduling Logic
            </h2>

            {suggestedTimes.length > 0 ? (
              <div className="space-y-3 mb-6">
                <p className="text-xs text-zinc-400 mb-2">AI Suggested Peak Times for {contentType}:</p>
                {suggestedTimes.map((slot, i) => (
                  <label key={i} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors ${selectedTime === slot.time ? 'bg-indigo-500/10 border-indigo-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                    <input 
                      type="radio" name="schedule" 
                      checked={selectedTime === slot.time}
                      onChange={() => setSelectedTime(slot.time)}
                      className="hidden"
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${selectedTime === slot.time ? 'text-indigo-400' : 'text-white'}`}>{slot.time}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{slot.label}</p>
                    </div>
                    {selectedTime === slot.time && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 p-4 bg-zinc-950 rounded-xl border border-zinc-800 mb-6 text-center">
                Generate AI content to see calculated peak time slots.
              </div>
            )}

            <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors mb-3 ${selectedTime === 'immediate' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
              <input 
                type="radio" name="schedule" 
                checked={selectedTime === 'immediate'}
                onChange={() => setSelectedTime('immediate')}
                className="hidden"
              />
              <div className="flex-1">
                <p className={`text-sm font-bold ${selectedTime === 'immediate' ? 'text-emerald-400' : 'text-white'}`}>Post Immediately</p>
                <p className="text-xs text-zinc-500 mt-0.5">Executes upon manager approval</p>
              </div>
              {selectedTime === 'immediate' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            </label>

            <div className={`p-3 rounded-xl border transition-colors ${selectedTime === 'custom' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
              <label className="flex items-center cursor-pointer">
                <input 
                  type="radio" name="schedule" 
                  checked={selectedTime === 'custom'}
                  onChange={() => setSelectedTime('custom')}
                  className="hidden"
                />
                <div className="flex-1">
                  <p className={`text-sm font-bold ${selectedTime === 'custom' ? 'text-indigo-400' : 'text-white'}`}>Custom Schedule</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Pick your own specific time</p>
                </div>
                {selectedTime === 'custom' && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
              </label>
              
              {selectedTime === 'custom' && (
                <div className="mt-3 pt-3 border-t border-zinc-800/50">
                  <input 
                    type="datetime-local" 
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">Governance</h2>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              All published content must pass through the Approval Queue. Immediate posts will execute the moment a Manager authorizes them.
            </p>

            {message && (
              <div className={`mb-4 p-3 text-sm rounded-lg border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                {message.text}
              </div>
            )}

            <button 
              onClick={handleSubmitIntent} disabled={submitting || !media || !description}
              className={`w-full flex items-center justify-center py-3 font-bold rounded-lg transition-colors text-sm disabled:opacity-50 ${
                userRole === 'ADMIN' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              {userRole === 'ADMIN' ? <Globe className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {submitting ? "Processing..." : userRole === 'ADMIN' ? "Publish Directly" : "Submit to Admin"}
            </button>
          </div>

          {/* Admin/Manager Review Queue */}
          {pendingPosts.length > 0 && (userRole === 'ADMIN' || userRole === 'MANAGER') && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                Review Queue ({pendingPosts.length})
              </h2>
              <div className="space-y-4">
                {pendingPosts.map(post => (
                  <div key={post.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-white">{post.users?.full_name || 'Unknown User'}</p>
                        <p className="text-[10px] text-zinc-500">{new Date(post.created_at).toLocaleString()}</p>
                      </div>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{post.platform}</span>
                    </div>
                    
                    <p className="text-xs text-zinc-300 line-clamp-3 italic">&quot;{post.content}&quot;</p>
                    
                    {post.media_url && (
                      <div className="aspect-video rounded-lg overflow-hidden border border-zinc-800 bg-black flex items-center justify-center">
                        <Image src={post.media_url} alt="Post Media" width={400} height={225} className="object-contain max-h-full" />
                      </div>
                    )}

                    {userRole === 'ADMIN' ? (
                      <div className="space-y-3">
                        <textarea 
                          placeholder="Add a comment if requesting changes..."
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleAdminAction(post.id, 'APPROVED')} className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">Approve</button>
                          <button onClick={() => handleAdminAction(post.id, 'REJECTED')} className="py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">Reject</button>
                        </div>
                        <button onClick={() => handleAdminAction(post.id, 'PENDING_MANAGER')} className="w-full py-2 border border-amber-500/30 hover:bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-lg uppercase tracking-wider">Request Changes</button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                          <p className="text-[10px] text-amber-500 font-bold uppercase mb-1">Admin Feedback:</p>
                          <p className="text-[10px] text-zinc-400 italic">&quot;{post.feedback || 'No comments provided'}&quot;</p>
                        </div>
                        <button onClick={() => handleManagerAction(post.id, 'NEEDS_REVISION')} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center justify-center gap-2">
                          <RefreshCcw className="w-3 h-3" />
                          Send to Creator
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
