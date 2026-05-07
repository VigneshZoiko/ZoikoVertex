"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Sparkles, Clock, CheckCircle2,
  Image as ImageIcon, Video, Send, Globe,
  XCircle, RefreshCcw
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
  const [loading, setLoading] = useState(true);

  // Admin/Manager Workflow State
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);




  const searchParams = useSearchParams();

  useEffect(() => {
    fetchUserData();
  }, []);

  // Auto-load a revision if navigated from /review with ?revisionId=
  useEffect(() => {
    const revisionId = searchParams.get('revisionId');
    if (revisionId && revisions.length > 0) {
      const rev = revisions.find((r: any) => r.id === revisionId);
      if (rev) loadRevision(rev);
    }
  }, [revisions, searchParams]);

  const fetchUserData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Fetch Role
      const { data: member, error: mError } = await supabase
        .from('workspace_members')
        .select('role, workspace_id')
        .eq('user_id', user.id)
        .single();
      
      if (mError) console.error("Member Role Fetch Error:", mError);
      
      if (member) {
        setUserRole(member.role);
        
        // If Admin or Manager, fetch pending queue
        const normalizedRole = member.role.toString().toUpperCase();
        if (normalizedRole === 'ADMIN' || normalizedRole === 'MANAGER') {
          const targetStatus = normalizedRole === 'ADMIN' ? 'PENDING_ADMIN' : 'PENDING_MANAGER';
          
          const { data: queue, error: qError } = await supabase
            .from('publish_intents')
            .select(`
              *,
              creator:users!publish_intents_creator_id_fkey (
                full_name,
                email
              )
            `)
            .eq('status', targetStatus)
            .order('created_at', { ascending: false });
          
          if (qError) {
            console.error(`${normalizedRole} Queue Fetch Error:`, qError);
            // Fallback: try fetching without join if join fails
            const { data: fallbackQueue } = await supabase
              .from('publish_intents')
              .select('*')
              .eq('status', targetStatus)
              .order('created_at', { ascending: false });
            setPendingPosts(fallbackQueue || []);
          } else {
            setPendingPosts(queue || []);
          }
        }

        // Fetch Revisions if Creator
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
  };

  const loadRevision = (rev: any) => {
    setDescription(rev.content);
    setActiveRevisionId(rev.id);
    setMediaPreview(rev.media_url);
    
    // Restore platforms
    if (rev.platform) {
      const pList = rev.platform.split(', ');
      setPlatforms({
        facebook: pList.includes('facebook'),
        instagram: pList.includes('instagram'),
        linkedin: pList.includes('linkedin'),
        twitter: pList.includes('twitter')
      });
    }

    setMessage({ type: 'success', text: 'Revision loaded. Modify your content, media, or settings and resubmit.' });
    // Scroll to composer
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

      // 1. Handle Media
      let publicUrl = mediaPreview;

      if (media) {
        const fileExt = media.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, media);

        if (uploadError) throw uploadError;

        const { data: { publicUrl: newUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);
        
        publicUrl = newUrl;
      }

      // 2. Insert or Update the intent
      const isAdmin = userRole?.toUpperCase() === 'ADMIN';
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
      // 3. Optimistic UI Update: Remove from revisions list immediately
      if (activeRevisionId) {
        setRevisions(prev => prev.filter(r => r.id !== activeRevisionId));
      }

      // Reset form
      setTopic(""); 
      setDescription(""); 
      setMedia(null); 
      setMediaPreview(null); 
      setSuggestedTimes([]); 
      setActiveRevisionId(null);
      setPlatforms({ facebook: true, instagram: false, linkedin: false, twitter: false });
      setCustomTime("");
      setSelectedTime("immediate");

      fetchUserData(); // Refresh lists in background
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
    
    setSubmitting(false);
  };

  const handleGovernance = async (id: string, newStatus: string) => {
    const feedbackText = prompt(`Enter feedback for this ${newStatus === 'RETURNED' ? 'return' : 'transition'}:`, 
      newStatus === 'RETURNED' ? 'Please adjust the description and media as requested.' : 'Checked. Passing to Manager for final verification.');
    
    if (newStatus === 'RETURNED' && !feedbackText) {
      setMessage({ type: 'error', text: 'Feedback is mandatory when returning a post to the creator.' });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required for governance.");

      const response = await fetch('http://localhost:5000/api/v1/governance/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId: id,
          newStatus: newStatus,
          feedback: feedbackText || null,
          userId: user.id,
          userRole: userRole
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Transition failed');

      setMessage({ 
        type: 'success', 
        text: newStatus === 'APPROVED' 
          ? 'Post APPROVED. Execution engine scheduled for publication.' 
          : `Post status updated to ${newStatus.replace('_', ' ')}.` 
      });
      fetchUserData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
    setLoading(false);
  };

  // Block render until both loading is done AND role is determined.
  // This prevents the flash where null role briefly shows wrong UI.
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




      {/* Header section with role indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">
            {activeTab === 'publisher' ? 'Social Publisher' : 'Approval Queue'}
          </h1>
          <p className="text-zinc-500 text-xs font-medium tracking-wide">
            {activeTab === 'publisher' 
              ? 'Draft, optimize with AI, and submit content for governance approval.' 
              : 'Review and manage outgoing content requests for quality assurance.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${userRole?.toUpperCase() === 'ADMIN' ? 'bg-rose-500' : userRole?.toUpperCase() === 'MANAGER' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{userRole || 'Guest'}</span>
          </div>
        </div>
      </div>

      {/* Global Message for all roles */}
      {message && (
        <div className={`mb-8 p-4 text-sm rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Tab Content: Approval Queue */}
      {activeTab === 'queue' && (userRole?.toUpperCase() === 'ADMIN' || userRole?.toUpperCase() === 'MANAGER') && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-indigo-400" />
                Review Pipeline
              </h2>
              <p className="text-xs text-zinc-500">Manage incoming content requests and enforce workspace quality standards.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={fetchUserData}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all"
                title="Refresh Queue"
              >
                <RefreshCcw className="w-4 h-4" />
              </button>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg font-black uppercase tracking-wider border border-indigo-500/20">
                {userRole} Mode
              </span>
            </div>
          </div>
          
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-sm text-zinc-500 animate-pulse font-medium">Syncing database...</p>
            </div>
          ) : pendingPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pendingPosts.map(post => (
              <div key={post.id} className="group bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col hover:border-indigo-500/50 transition-all duration-500 shadow-2xl hover:shadow-indigo-500/10 relative">
                {/* Header: User Info */}
                <div className="p-5 bg-zinc-900/50 border-b border-zinc-800 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-base shrink-0 shadow-xl border border-white/10">
                    {(post.creator?.full_name || post.users?.full_name || '??').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate leading-none mb-1">{post.creator?.full_name || post.users?.full_name || 'Unknown User'}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{post.creator?.email || post.users?.email || 'No email provided'}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {post.platform.split(', ').map((p: string) => {
                      const Icon = p.trim().toLowerCase() === 'facebook' ? FacebookIcon : p.trim().toLowerCase() === 'instagram' ? InstagramIcon : p.trim().toLowerCase() === 'linkedin' ? LinkedinIcon : TwitterIcon;
                      return (
                        <div key={p} className="w-7 h-7 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700/50">
                          <Icon className="w-3.5 h-3.5 text-zinc-300" />
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Content Section */}
                <div className="p-6 flex-1 space-y-6">
                  {post.media_url && (
                    <div className="aspect-[16/10] rounded-2xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-center relative group/media shadow-inner">
                      <img src={post.media_url} className="object-contain max-h-full transition-transform duration-700 group-hover/media:scale-110" />
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-300 line-clamp-4 leading-relaxed italic font-medium">"{post.content}"</p>
                    
                    <div className="pt-4 grid grid-cols-2 gap-6 border-t border-zinc-800/50">
                      <div>
                        <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-1">Creation Date</p>
                        <p className="text-xs text-zinc-400 font-bold">{new Date(post.created_at).toLocaleDateString()} {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1">Execution</p>
                        <p className="text-xs text-indigo-400 font-bold">
                          {post.scheduled_for === 'immediate' 
                            ? 'Immediate' 
                            : `${new Date(post.scheduled_for).toLocaleDateString()} ${new Date(post.scheduled_for).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer: Actions */}
                <div className="p-6 bg-zinc-900/30 border-t border-zinc-800 space-y-4">
                  {userRole?.toUpperCase() === 'ADMIN' ? (
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => handleGovernance(post.id, 'APPROVED')}
                        className="w-full py-2 bg-emerald-500 text-black text-[10px] font-black rounded-xl hover:bg-emerald-400 transition-all uppercase tracking-widest"
                      >
                        Approve Now
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => handleGovernance(post.id, 'PENDING_MANAGER')}
                          className="py-2 bg-indigo-500 text-white text-[10px] font-black rounded-xl hover:bg-indigo-400 transition-all uppercase tracking-widest"
                        >
                          Pass to Manager
                        </button>
                        <button 
                          onClick={() => handleGovernance(post.id, 'REJECTED')}
                          className="py-2 bg-zinc-800 text-zinc-400 text-[10px] font-black rounded-xl hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl mb-4">
                        <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1">Admin Instructions</p>
                        <p className="text-[11px] text-zinc-400 italic font-medium">"{post.feedback || 'Review and pass to Admin.'}"</p>
                      </div>
                      
                      {userRole?.toUpperCase() === 'MANAGER' && (
                        <button 
                          onClick={() => handleGovernance(post.id, 'RETURNED')}
                          className="w-full py-3 bg-amber-500 text-black text-[10px] font-black rounded-xl hover:bg-amber-400 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <RefreshCcw className="w-3 h-3" />
                          Return to Creator
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              ))}
            </div>
          ) : (
            <div className="py-32 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-zinc-950 rounded-[2rem] flex items-center justify-center mb-6 border border-zinc-800 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-zinc-800" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Queue is Empty</h3>
              <p className="text-sm text-zinc-500 max-w-[280px]">No pending posts requiring your review at this moment.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Social Publisher */}
      {activeTab === 'publisher' && (
        <div className={`grid grid-cols-1 ${userRole?.toUpperCase() === 'ADMIN' ? '' : 'lg:grid-cols-3'} gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
          
          {/* Left Column: Composer (Shown for Creators & Managers) */}
          {userRole?.toUpperCase() !== 'ADMIN' && (
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
                    <input type="file" className="hidden" accept="image/*,video/*" onChange={handleMediaUpload} />
                  </label>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-800">
                    {media?.type.startsWith('video') ? <video src={mediaPreview} controls className="max-h-full max-w-full" /> : <img src={mediaPreview} className="object-contain max-h-full" />}
                    <button onClick={() => { setMedia(null); setMediaPreview(null); }} className="absolute top-2 right-2 bg-black/70 hover:bg-rose-500 text-white p-1.5 rounded-lg backdrop-blur-md transition-colors"><XCircle className="w-4 h-4" /></button>
                  </div>
                )}
              </div>

              {/* Content Composer */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Post Content</h2>
                  <div className="relative bg-zinc-950/50 border border-zinc-800 rounded-2xl focus-within:border-indigo-500/50 transition-all duration-300">
                    <textarea 
                      value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="Write your caption here..."
                      className="w-full bg-transparent p-6 text-white text-base leading-relaxed placeholder:text-zinc-600 outline-none resize-none min-h-[220px]"
                    />
                    <div className="p-4 flex items-center justify-between border-t border-zinc-800/50 bg-zinc-900/30">
                      <button onClick={() => setShowAIWriter(!showAIWriter)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${showAIWriter ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Writer
                      </button>
                    </div>
                  </div>
                </div>

                {showAIWriter && (
                  <div className="bg-zinc-950/80 border-t border-zinc-800 p-8 space-y-6 animate-in slide-in-from-top duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Topic</label>
                        <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Tone</label>
                        <select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm">
                          <option value="professional">Professional</option>
                          <option value="casual">Casual</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={handleGenerateAI} disabled={generating || !topic} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                      {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Generate content
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Column: Scheduling (Shown for Creators & Managers) */}
          {userRole?.toUpperCase() !== 'ADMIN' && (
            <div className="lg:col-span-1">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sticky top-8 shadow-2xl">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
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
                    {selectedTime === 'custom' && <input type="datetime-local" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="mt-4 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-indigo-500" />}
                  </div>

                  {/* AI Suggested Times */}
                  {suggestedTimes.length > 0 && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-500">
                      <div className="flex items-center gap-2 px-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">AI Predicted Peak Times</span>
                      </div>
                      {suggestedTimes.map((st, i) => (
                        <label key={i} className={`flex flex-col p-3 rounded-2xl border cursor-pointer transition-all ${selectedTime === st.time ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                          <input type="radio" name="schedule" checked={selectedTime === st.time} onChange={() => setSelectedTime(st.time)} className="hidden" />
                          <p className={`text-[11px] font-black ${selectedTime === st.time ? 'text-white' : 'text-zinc-300'}`}>{st.label}</p>
                          <p className={`text-[10px] font-medium ${selectedTime === st.time ? 'text-indigo-100' : 'text-zinc-500'}`}>
                            {new Date(st.time).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleSubmitIntent} disabled={submitting || !description || !mediaPreview}
                  className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                  {activeRevisionId ? 'Resubmit' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
