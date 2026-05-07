import React from 'react';
import { RefreshCcw, CheckCircle2, XCircle, Send } from 'lucide-react';
import MediaPreview from '../ui/MediaPreview';

interface PendingPostItemProps {
  post: any;
  userRole: string | null;
  reviewComment: string;
  onReviewCommentChange: (val: string) => void;
  onAction: (action: string) => void;
}

const PendingPostItem: React.FC<PendingPostItemProps> = ({
  post,
  userRole,
  reviewComment,
  onReviewCommentChange,
  onAction
}) => {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-all group">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
            {post.users?.full_name?.charAt(0) || "U"}
          </div>
          <div>
            <p className="text-xs font-bold text-white tracking-tight">{post.users?.full_name || 'Unknown User'}</p>
            <p className="text-[9px] text-zinc-600 font-medium uppercase tracking-wider">
              {new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {post.platform?.split(', ').map((p: string) => (
            <span key={p} className="text-[8px] bg-zinc-900 text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">{p}</span>
          ))}
        </div>
      </div>
      
      {post.content.startsWith('{') ? (
        <div className="space-y-3 bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/50">
          {Object.entries(JSON.parse(post.content)).map(([platform, text]: [string, any]) => (
            <div key={platform}>
              <p className="text-[9px] font-black text-indigo-400/70 uppercase tracking-[0.1em]">{platform}</p>
              <p className="text-[11px] text-zinc-400 leading-tight italic line-clamp-2">&quot;{text}&quot;</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-300 line-clamp-3 italic bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/50">&quot;{post.content}&quot;</p>
      )}
      
      {post.media_url && (
        <div className="rounded-xl overflow-hidden border border-zinc-800">
          <MediaPreview url={post.media_url} />
        </div>
      )}

      <div className="pt-2 space-y-3">
        {userRole === 'ADMIN' ? (
          <>
            <textarea 
              placeholder="Feedback for Manager..."
              value={reviewComment}
              onChange={(e) => onReviewCommentChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500/50 min-h-[70px] placeholder:text-zinc-700 transition-all"
            />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onAction('APPROVED')} className="flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-xl uppercase tracking-wider transition-all">
                <CheckCircle2 className="w-3 h-3" />
                Approve
              </button>
              <button onClick={() => onAction('REJECTED')} className="flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-xl uppercase tracking-wider transition-all">
                <XCircle className="w-3 h-3" />
                Reject
              </button>
            </div>
            <button onClick={() => onAction('PENDING_MANAGER')} className="w-full py-2.5 bg-zinc-900 border border-amber-500/30 hover:bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2">
              <Send className="w-3 h-3" />
              Escalate to Manager
            </button>
          </>
        ) : userRole === 'MANAGER' ? (
          <>
            {post.feedback && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl mb-1">
                <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest mb-1">Admin Feedback:</p>
                <p className="text-[10px] text-zinc-400 italic font-medium leading-relaxed">&quot;{post.feedback}&quot;</p>
              </div>
            )}
            <textarea 
              placeholder="Feedback for Creator..."
              value={reviewComment}
              onChange={(e) => onReviewCommentChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500/50 min-h-[70px] placeholder:text-zinc-700 transition-all"
            />
            <button onClick={() => onAction('RETURNED')} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20">
              <RefreshCcw className="w-3.5 h-3.5" />
              Return for Revision
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PendingPostItem;
