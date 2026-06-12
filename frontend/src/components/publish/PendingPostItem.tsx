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
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4 hover:border-[var(--card-border)] transition-all group">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold text-[var(--foreground-muted)]">
            {post.users?.full_name?.charAt(0) || "U"}
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--foreground)] tracking-tight">{post.users?.full_name || 'Unknown User'}</p>
            <p className="text-[9px] text-[var(--foreground-muted)] font-medium uppercase tracking-wider">
              {new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {post.platform?.split(', ').map((p: string) => (
            <span key={p} className="text-[8px] bg-[var(--surface)] text-[var(--foreground-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded font-black uppercase tracking-widest">{p}</span>
          ))}
        </div>
      </div>
      
      {post.content.startsWith('{') ? (
        <div className="space-y-3 bg-[var(--card)]/30 p-3 rounded-xl border border-[var(--border)]/50">
          {Object.entries(JSON.parse(post.content)).map(([platform, text]: [string, any]) => (
            <div key={platform}>
              <p className="text-[9px] font-black text-info-text/70 uppercase tracking-[0.1em]">{platform}</p>
              <p className="text-[11px] text-[var(--foreground-muted)] leading-tight italic line-clamp-2">&quot;{text}&quot;</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--foreground)] line-clamp-3 italic bg-[var(--card)]/30 p-3 rounded-xl border border-[var(--border)]/50">&quot;{post.content}&quot;</p>
      )}
      
      {post.media_url && (
        <div className="rounded-xl overflow-hidden border border-[var(--border)]">
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
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--foreground)] outline-none focus:border-warning-border min-h-[70px] transition-all"
            />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onAction('APPROVED')} className="flex items-center justify-center gap-2 py-2.5 bg-success-text hover:brightness-110 text-foreground text-[10px] font-bold rounded-xl uppercase tracking-wider transition-all">
                <CheckCircle2 className="w-3 h-3" />
                Approve
              </button>
              <button onClick={() => onAction('REJECTED')} className="flex items-center justify-center gap-2 py-2.5 bg-error-text hover:brightness-110 text-foreground text-[10px] font-bold rounded-xl uppercase tracking-wider transition-all">
                <XCircle className="w-3 h-3" />
                Reject
              </button>
            </div>
            <button onClick={() => onAction('PENDING_MANAGER')} className="w-full py-2.5 bg-[var(--surface)] border border-warning-border hover:bg-warning-bg text-warning-text text-[10px] font-bold rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2">
              <Send className="w-3 h-3" />
              Escalate to Manager
            </button>
          </>
        ) : userRole === 'MANAGER' ? (
          <>
            {post.feedback && (
              <div className="p-3 bg-warning-bg border border-warning-border rounded-xl mb-1">
                <p className="text-[9px] text-warning-text font-black uppercase tracking-widest mb-1">Admin Feedback:</p>
                <p className="text-[10px] text-[var(--foreground-muted)] italic font-medium leading-relaxed">&quot;{post.feedback}&quot;</p>
              </div>
            )}
            <textarea 
              placeholder="Feedback for Creator..."
              value={reviewComment}
              onChange={(e) => onReviewCommentChange(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--foreground)] outline-none focus:border-info-border min-h-[70px] transition-all"
            />
            <button onClick={() => onAction('RETURNED')} className="w-full py-3 bg-info-text hover:brightness-110 text-foreground text-[10px] font-bold rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-info-text/20">
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
