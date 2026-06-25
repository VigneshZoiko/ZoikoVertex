import React from 'react';
import { Sparkles } from 'lucide-react';

interface AIWriterPanelProps {
  topic: string;
  onTopicChange: (val: string) => void;
  contentType: string;
  onContentTypeChange: (val: string) => void;
  aiLength: string;
  onAiLengthChange: (val: string) => void;
  audience: string;
  onAudienceChange: (val: string) => void;
  onGenerate: () => void;
  generating: boolean;
  hasImageAnalysis: boolean;
  isAnalyzing: boolean;
  onAddImageInsight: () => void;
}

const AIWriterPanel: React.FC<AIWriterPanelProps> = ({
  topic,
  onTopicChange,
  contentType,
  onContentTypeChange,
  onGenerate,
  generating,
  hasImageAnalysis,
  isAnalyzing,
  onAddImageInsight
}) => {
  return (
    <div className="bg-[var(--card)]/80 border-t border-[var(--border)] p-4 sm:p-8 space-y-4 sm:space-y-8 animate-in slide-in-from-top duration-300">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">Post Topic / Story Detail</label>
            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)] animate-pulse">
                <div className="w-2 h-2 bg-info-text rounded-full animate-ping" />
                Analyzing Image...
              </div>
            ) : hasImageAnalysis && (
              <button
                type="button"
                onClick={onAddImageInsight}
                className="text-[10px] font-bold uppercase tracking-widest text-info-text hover:text-info-text transition-colors bg-info-bg px-3 py-1 rounded-full border border-info-border"
              >
                + Add AI Image Insight
              </button>
            )}
          </div>
          <textarea
            value={topic} onChange={(e) => onTopicChange(e.target.value)}
            placeholder="Describe your story in detail. Add up to 5+ lines for better AI context..."
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-4 text-[var(--foreground)] focus:outline-none focus:border-info-border text-sm min-h-[140px] resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">Content Category</label>
            <select
              value={contentType} onChange={(e) => onContentTypeChange(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] focus:outline-none focus:border-info-border text-sm outline-none"
            >
              <option value="Entertainment">Entertainment</option>
              <option value="Education">Education</option>
              <option value="Business">Business & Finance</option>
              <option value="Lifestyle">Lifestyle</option>
              <option value="Technology">Technology</option>
              <option value="Health">Health & Fitness</option>
              <option value="Marketing">Marketing</option>
              <option value="News">News</option>
              <option value="Personal Branding">Personal Branding</option>
              <option value="Product Launch">Product Launch</option>
            </select>
          </div>

          <div className="sm:shrink-0">
            <button
              onClick={onGenerate} disabled={generating || !topic}
              className="w-full sm:w-auto py-3 px-6 bg-info-text hover:brightness-110 text-foreground font-bold rounded-xl transition-all shadow-lg shadow-info-text/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
            >
              {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Magic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIWriterPanel;
