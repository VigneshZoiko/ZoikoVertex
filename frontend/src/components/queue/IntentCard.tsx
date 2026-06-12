import React from 'react';
import { Eye, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import StatusBadge from '../ui/StatusBadge';
import MediaPreview from '../ui/MediaPreview';
import { formatDateTime } from '@/lib/utils';

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
    <div className="bg-[var(--card)]/50 backdrop-blur-md border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--card-border)] transition-all duration-300 group shadow-lg">
      <div className="p-6 flex flex-col md:flex-row gap-6">
        
        {/* Media Preview */}
        <div className="w-full md:w-48 shrink-0">
          <MediaPreview url={intent.urls || intent.media_url} className="md:aspect-square" />
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                {platforms.map((p: string) => (
                  <span key={p} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-[var(--foreground)] uppercase tracking-wider">
                    {p}
                  </span>
                ))}
              </div>
              <StatusBadge status={intent.status} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                 <span className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-tighter">Scheduled For</span>
                 <span className="text-[10px] text-[var(--foreground)] font-medium">
                    {intent.scheduled_for ? formatDateTime(intent.scheduled_for) : 'Immediate'}
                 </span>
              </div>
            </div>
          </div>
          
          <div className="bg-[var(--surface)]/50 border border-[var(--border)]/50 rounded-xl p-4 mb-4 flex-1">
            {intent.content.startsWith('{') ? (
              <div className="space-y-4">
                {Object.entries(JSON.parse(intent.content)).map(([platform, text]: [string, any]) => (
                  <div key={platform} className="border-l-2 border-info-border pl-3">
                    <p className="text-[10px] font-black text-info-text uppercase tracking-widest mb-1">{platform}</p>
                    <p className="text-xs text-[var(--foreground)] leading-relaxed italic">&quot;{text}&quot;</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                {intent.content}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-info-text to-info-text flex items-center justify-center text-xs font-bold text-foreground shadow-lg shadow-info-text/10">
                {intent.creator?.full_name?.charAt(0) || "U"}
              </div>
              <div className="text-xs">
                <p className="text-[var(--foreground)] font-bold">{intent.creator?.full_name || "Unknown Creator"}</p>
                <p className="text-[var(--foreground-muted)] font-medium text-[10px] uppercase tracking-wider">Submitted {formatDateTime(intent.created_at)}</p>
              </div>
            </div>

            {/* Admin Controls */}
            {userRole?.toUpperCase() === 'ADMIN' && intent.status === 'PENDING_ADMIN' && (
              <div className="flex flex-col gap-3 w-full md:w-auto ml-4">
                <textarea 
                  placeholder="Feedback for Manager..."
                  value={feedbackText}
                  onChange={(e) => onFeedbackChange(e.target.value)}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--foreground)] outline-none focus:border-warning-border min-h-[60px]"
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'REJECTED')}
                    className="px-4 py-1.5 bg-[var(--surface)] text-[var(--foreground)] hover:brightness-110 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-[var(--border)] uppercase"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'PENDING_MANAGER', feedbackText)}
                    className="px-4 py-1.5 bg-warning-bg text-warning-text hover:brightness-110 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-warning-border uppercase"
                  >
                    Escalate
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'APPROVED')}
                    className="px-4 py-1.5 bg-info-text text-foreground hover:brightness-110 rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-info-text/20 uppercase"
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
                  <div className="bg-warning-text/5 border border-warning-border/10 p-2 rounded-lg mb-1">
                    <p className="text-[9px] uppercase font-black text-warning-text">Admin Note: {intent.feedback}</p>
                  </div>
                )}
                <textarea 
                  placeholder="Review notes for Creator..."
                  value={feedbackText}
                  onChange={(e) => onFeedbackChange(e.target.value)}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--foreground)] outline-none focus:border-info-border min-h-[60px]"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'REJECTED', feedbackText)}
                    className="px-4 py-2 bg-[var(--surface)] text-[var(--foreground)] hover:brightness-110 hover:text-white rounded-xl text-[10px] font-bold transition-all border border-[var(--border)] uppercase"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'RETURNED', feedbackText)}
                    className="px-4 py-2 bg-warning-bg text-warning-text hover:brightness-110 hover:text-white rounded-xl text-[10px] font-bold transition-all border border-warning-border uppercase"
                  >
                    Return to Creator
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(intent.id, 'PENDING_ADMIN', feedbackText)}
                    className="px-5 py-2 bg-info-text text-foreground hover:brightness-110 rounded-xl text-[10px] font-bold transition-all shadow-lg shadow-info-text/20 uppercase"
                  >
                    Approve & Escalate
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
