import React from 'react';
import { Eye, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import Image from 'next/image';
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
  const platforms = intent.platform?.split(', ') || [];

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
                {platforms.map((p: string) => (
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
            {intent.content.startsWith('{') ? (
              <div className="space-y-4">
                {Object.entries(JSON.parse(intent.content)).map(([platform, text]: [string, any]) => (
                  <div key={platform} className="border-l-2 border-indigo-500/30 pl-3">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{platform}</p>
                    <p className="text-xs text-zinc-300 leading-relaxed italic">&quot;{text}&quot;</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {intent.content}
              </p>
            )}
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

            {/* Admin Controls */}
            {userRole?.toUpperCase() === 'ADMIN' && intent.status === 'PENDING_ADMIN' && (
              <div className="flex flex-col gap-3 w-full md:w-auto ml-4">
                <textarea 
                  placeholder="Feedback for Manager..."
                  value={feedbackText}
                  onChange={(e) => onFeedbackChange(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500/50 min-h-[60px]"
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'REJECTED')}
                    className="px-4 py-1.5 bg-zinc-800 text-zinc-300 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-zinc-700 uppercase"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'PENDING_MANAGER', feedbackText)}
                    className="px-4 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-amber-500/30 uppercase"
                  >
                    Escalate
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'APPROVED')}
                    className="px-4 py-1.5 bg-indigo-500 text-white hover:bg-indigo-400 rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-indigo-500/20 uppercase"
                  >
                    Approve
                  </button>
                </div>
              </div>
            )}

            {/* Manager Controls */}
            {userRole?.toUpperCase() === 'MANAGER' && intent.status === 'PENDING_MANAGER' && (
              <div className="flex flex-col gap-3 w-full md:w-auto ml-4">
                {intent.feedback && (
                  <div className="bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg mb-1">
                    <p className="text-[9px] uppercase font-black text-amber-500">Admin Note: {intent.feedback}</p>
                  </div>
                )}
                <textarea 
                  placeholder="Feedback for Creator..."
                  value={feedbackText}
                  onChange={(e) => onFeedbackChange(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500/50 min-h-[60px]"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'NEEDS_REVISION', feedbackText)}
                    className="px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-[10px] font-bold transition-all uppercase"
                  >
                    Return to Creator
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
