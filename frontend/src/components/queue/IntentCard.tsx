import React from 'react';
import StatusBadge from '../ui/StatusBadge';
import MediaPreview from '../ui/MediaPreview';

interface IntentCardProps {
  intent: any;
  userRole: string | null;
  feedbackText: string;
  onFeedbackChange: (value: string) => void;
  onUpdateStatus: (id: string, status: string, feedback?: string) => void;
}

const IntentCard: React.FC<IntentCardProps> = ({ 
  intent, 
  userRole, 
  feedbackText, 
  onFeedbackChange, 
  onUpdateStatus 
}) => {
  return (
    <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all duration-300 group shadow-lg">
      <div className="p-6 flex flex-col md:flex-row gap-6">
        
        {/* Media Preview */}
        <div className="w-full md:w-48 shrink-0">
          <MediaPreview url={intent.media_url} className="md:aspect-square" />
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                {intent.platform?.split(', ').map((p: string) => (
                  <span key={p} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-white uppercase tracking-wider">
                    {p}
                  </span>
                ))}
              </div>
              <StatusBadge status={intent.status} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                 <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Scheduled For</span>
                 <span className="text-[10px] text-white font-medium">
                    {intent.scheduled_for ? new Date(intent.scheduled_for).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Immediate'}
                 </span>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 mb-4 flex-1">
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {intent.content}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-500/10">
                {intent.creator?.full_name?.charAt(0) || "U"}
              </div>
              <div className="text-xs">
                <p className="text-white font-bold">{intent.creator?.full_name || "Unknown Creator"}</p>
                <p className="text-zinc-500 font-medium text-[10px] uppercase tracking-wider">Submitted {new Date(intent.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {userRole === 'ADMIN' && intent.status === 'PENDING' && (
              <div className="flex flex-col gap-4 w-full md:w-auto">
                <textarea 
                  placeholder="Add feedback for revision..."
                  value={feedbackText}
                  onChange={(e) => onFeedbackChange(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500/50 min-h-[60px]"
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'REJECTED')}
                    className="px-5 py-2 bg-zinc-800 text-zinc-300 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold transition-all duration-300 border border-zinc-700"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'NEEDS_REVISION', feedbackText)}
                    className="px-5 py-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl text-xs font-bold transition-all duration-300 border border-amber-500/30"
                  >
                    Request Changes
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'APPROVED')}
                    className="px-5 py-2 bg-indigo-500 text-white hover:bg-indigo-400 rounded-xl text-xs font-bold transition-all duration-300 shadow-xl shadow-indigo-500/20"
                  >
                    Approve Post
                  </button>
                </div>
              </div>
            )}

            {userRole === 'MANAGER' && intent.status === 'NEEDS_REVISION' && (
              <div className="flex flex-col gap-4 w-full">
                {intent.feedback && (
                  <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg">
                    <p className="text-[10px] uppercase font-black text-amber-500 mb-1">Admin Feedback</p>
                    <p className="text-xs text-zinc-300 italic">&quot;{intent.feedback}&quot;</p>
                  </div>
                )}
                <div className="flex justify-end">
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'IN_REVISION')}
                    className="px-5 py-2 bg-indigo-500 text-white hover:bg-indigo-400 rounded-xl text-xs font-bold transition-all duration-300"
                  >
                    Send to Creator for Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default IntentCard;
