import React from 'react';
import { RefreshCcw } from 'lucide-react';
import MediaPreview from '../ui/MediaPreview';

interface PendingPostItemProps {
  post: any;
  userRole: string | null;
  reviewComment: string;
  onReviewCommentChange: (val: string) => void;
  onAdminAction: (id: string, action: 'APPROVED' | 'REJECTED' | 'PENDING_MANAGER') => void;
  onManagerAction: (id: string, action: 'NEEDS_REVISION' | 'PENDING_ADMIN') => void;
}

const PendingPostItem: React.FC<PendingPostItemProps> = ({
  post,
  userRole,
  reviewComment,
  onReviewCommentChange,
  onAdminAction,
  onManagerAction
}) => {
  return (
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
        <MediaPreview url={post.media_url} />
      )}

      {userRole === 'ADMIN' ? (
        <div className="space-y-3">
          <textarea 
            placeholder="Add a comment if requesting changes..."
            value={reviewComment}
            onChange={(e) => onReviewCommentChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onAdminAction(post.id, 'APPROVED')} className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">Approve</button>
            <button onClick={() => onAdminAction(post.id, 'REJECTED')} className="py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">Reject</button>
          </div>
          <button onClick={() => onAdminAction(post.id, 'PENDING_MANAGER')} className="w-full py-2 border border-amber-500/30 hover:bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-lg uppercase tracking-wider">Request Changes</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
            <p className="text-[10px] text-amber-500 font-bold uppercase mb-1">Admin Feedback:</p>
            <p className="text-[10px] text-zinc-400 italic">&quot;{post.feedback || 'No comments provided'}&quot;</p>
          </div>
          <button onClick={() => onManagerAction(post.id, 'NEEDS_REVISION')} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center justify-center gap-2">
            <RefreshCcw className="w-3 h-3" />
            Send to Creator
          </button>
        </div>
      )}
    </div>
  );
};

export default PendingPostItem;
