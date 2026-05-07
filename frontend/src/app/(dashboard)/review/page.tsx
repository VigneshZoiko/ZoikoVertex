"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCcw, CheckCircle2, Clock, ArrowRight } from "lucide-react";
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

  // Declared with useCallback before useEffect to prevent hoisting issues
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
    // Pass revision ID via URL param — publish page picks it up
    router.push(`/publish?revisionId=${rev.id}`);
  };

  if (loading || userRole === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500 space-y-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Loading Revisions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <AlertCircle className="w-6 h-6 text-black" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Review &amp; Edit</h1>
          </div>
          <p className="text-zinc-500 text-xs font-medium tracking-wide pl-13">
            Posts returned by your Manager with feedback. Edit and resubmit for approval.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {revisions.length > 0 && (
            <span className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-black rounded-xl uppercase tracking-widest">
              {revisions.length} {revisions.length === 1 ? 'Post' : 'Posts'} Awaiting Action
            </span>
          )}
          <button
            onClick={fetchRevisions}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all"
            title="Refresh"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {revisions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/40" />
          </div>
          <h2 className="text-xl font-black text-white mb-2 tracking-tight">All Clear!</h2>
          <p className="text-sm text-zinc-500 max-w-[300px] leading-relaxed">
            No posts have been returned for revision. Keep up the great work!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {revisions.map(rev => (
            <div
              key={rev.id}
              className="group bg-zinc-900/60 border border-amber-500/20 hover:border-amber-500/50 rounded-[2rem] overflow-hidden flex flex-col transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/5"
            >
              {/* Card Header */}
              <div className="px-6 pt-6 pb-4 border-b border-zinc-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Action Required</span>
                </div>
                <div className="flex gap-1.5">
                  {rev.platform?.split(', ').map((p: string) => {
                    const Icon =
                      p.trim().toLowerCase() === 'facebook' ? FacebookIcon :
                      p.trim().toLowerCase() === 'instagram' ? InstagramIcon :
                      p.trim().toLowerCase() === 'linkedin' ? LinkedinIcon : TwitterIcon;
                    return (
                      <div key={p} className="w-6 h-6 bg-zinc-800 rounded-md flex items-center justify-center border border-zinc-700/50">
                        <Icon className="w-3 h-3 text-zinc-400" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Media Preview */}
              {rev.media_url && (
                <div className="mx-6 mt-5 aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-center">
                  <Image
                    src={rev.media_url}
                    alt="Post media"
                    width={600}
                    height={338}
                    className="object-contain max-h-full w-full"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-6 flex-1 space-y-4">
                {/* Governance Feedback Box */}
                <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-amber-400 mb-2 tracking-widest flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    Manager Feedback
                  </p>
                  <p className="text-xs text-zinc-300 italic leading-relaxed">
                    &ldquo;{rev.feedback || 'Please review and adjust your content.'}&rdquo;
                  </p>
                </div>

                {/* Original Caption Preview */}
                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Your Draft</p>
                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">{rev.content}</p>
                </div>

                {/* Timestamps */}
                <div className="flex items-center gap-1.5 text-zinc-600">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-medium">
                    Returned {new Date(rev.updated_at || rev.created_at).toLocaleDateString([], {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {/* CTA */}
              <div className="px-6 pb-6">
                <button
                  onClick={() => handleOpenInEditor(rev)}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black text-[11px] font-black rounded-2xl transition-all uppercase tracking-widest shadow-xl shadow-amber-500/15 flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Edit &amp; Resubmit
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
