"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCcw, CheckCircle2, Clock, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

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

export default function ReviewPage() {
  const router = useRouter();
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchRevisions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (member) setUserRole(member.role);

      // Fetch posts returned for revision
      const { data: revs, error } = await supabase
        .from('publish_intents')
        .select('*')
        .eq('creator_id', user.id)
        .eq('status', 'RETURNED')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Revisions fetch error:", error);
        setRevisions([]);
      } else {
        setRevisions(revs || []);
      }
    } catch (err) {
      console.error("Unexpected error in fetchRevisions:", err);
      setRevisions([]);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  const handleOpenInEditor = (rev: any) => {
    router.push(`/publish?revisionId=${rev.id}`);
  };

  if (loading || userRole === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500 space-y-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Scanning Governance History...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-20 px-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/20">
              <ShieldCheck className="w-7 h-7 text-black" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">Review &amp; Refine</h1>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Governance Feedback Loop</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {revisions.length > 0 && (
            <div className="px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-black rounded-2xl uppercase tracking-widest shadow-lg">
              {revisions.length} {revisions.length === 1 ? 'Action' : 'Actions'} Required
            </div>
          )}
          <button
            onClick={fetchRevisions}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-white hover:border-zinc-700 transition-all group"
            title="Refresh"
          >
            <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* Grid Flow */}
      {revisions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in zoom-in duration-700">
          <div className="w-32 h-32 bg-zinc-900/50 border border-zinc-800 rounded-[3rem] flex items-center justify-center mb-8 shadow-inner group">
            <CheckCircle2 className="w-16 h-16 text-emerald-500/20 group-hover:text-emerald-500/50 transition-colors duration-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3 tracking-tighter uppercase italic">Perfect Alignment</h2>
          <p className="text-sm text-zinc-600 max-w-[340px] leading-relaxed font-medium">
            Your content strategy is fully approved. No drafts currently require revision.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {revisions.map(rev => (
            <div
              key={rev.id}
              className="group bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 hover:border-amber-500/40 rounded-[2.5rem] overflow-hidden flex flex-col transition-all duration-500 hover:shadow-[0_20px_50px_rgba(245,158,11,0.1)]"
            >
              {/* Header Context */}
              <div className="p-6 pb-4 border-b border-zinc-800/50 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Revision Needed</span>
                </div>
                <div className="flex -space-x-1">
                  {rev.platform?.split(', ').map((p: string) => {
                    const Icon =
                      p.trim().toLowerCase() === 'facebook' ? FacebookIcon :
                      p.trim().toLowerCase() === 'instagram' ? InstagramIcon :
                      p.trim().toLowerCase() === 'linkedin' ? LinkedinIcon : TwitterIcon;
                    return (
                      <div key={p} className="w-8 h-8 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                        <Icon className="w-4 h-4 text-zinc-400" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Media Segment */}
              {rev.media_url && (
                <div className="mx-6 mt-6 aspect-[16/10] rounded-[2rem] overflow-hidden border border-zinc-800 bg-black flex items-center justify-center relative group-hover:border-zinc-700 transition-all">
                  <Image
                    src={rev.media_url}
                    alt="Review content"
                    width={800}
                    height={500}
                    className="object-cover w-full h-full opacity-60 group-hover:opacity-100 transition-opacity duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                </div>
              )}

              {/* Information Body */}
              <div className="p-8 flex-1 space-y-6">
                {/* Governance Insight */}
                <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-[2rem] relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Sparkles className="w-12 h-12 text-amber-500" />
                  </div>
                  <p className="text-[10px] font-black uppercase text-amber-500/80 mb-3 tracking-widest flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Actionable Feedback
                  </p>
                  <p className="text-sm text-zinc-200 italic leading-relaxed font-medium">
                    &ldquo;{rev.feedback || 'Adjust creative assets and refine copy for better engagement.'}&rdquo;
                  </p>
                </div>

                {/* Draft Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Original Draft</p>
                    <div className="flex items-center gap-1.5 text-zinc-600">
                      <Clock className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase">
                        {new Date(rev.updated_at || rev.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed font-medium bg-black/20 p-4 rounded-2xl border border-zinc-800/30 italic">
                    {rev.content.startsWith('{') ? "Multi-Platform Configuration" : rev.content}
                  </p>
                </div>
              </div>

              {/* Action Strip */}
              <div className="p-6 pt-0">
                <button
                  onClick={() => handleOpenInEditor(rev)}
                  className="w-full py-4.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black text-[11px] font-black rounded-3xl transition-all uppercase tracking-[0.2em] shadow-2xl shadow-amber-500/20 flex items-center justify-center gap-3 group/btn"
                >
                  <RefreshCcw className="w-4 h-4 group-hover/btn:rotate-180 transition-transform duration-700" />
                  Enter Workspace
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
