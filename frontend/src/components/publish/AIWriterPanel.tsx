import React from 'react';
import { Sparkles } from 'lucide-react';

interface AIWriterPanelProps {
  topic: string;
  onTopicChange: (val: string) => void;
  contentType: string;
  onContentTypeChange: (val: string) => void;
  aiLength: string;
  onAiLengthChange: (val: string) => void;
  aiTone: string;
  onAiToneChange: (val: string) => void;
  styleMode: string;
  onStyleModeChange: (val: string) => void;
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
  aiLength,
  onAiLengthChange,
  aiTone,
  onAiToneChange,
  styleMode,
  onStyleModeChange,
  audience,
  onAudienceChange,
  onGenerate,
  generating,
  hasImageAnalysis,
  isAnalyzing,
  onAddImageInsight
}) => {
  return (
    <div className="bg-[var(--card)]/80 border-t border-[var(--border)] p-8 space-y-8 animate-in slide-in-from-top duration-300">
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
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
          <div className="space-y-2">
            {/* We'll handle platform selection in the main page for better sync, but could add hints here */}
            <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">Intelligence Focus</label>
            <div className="text-[10px] text-[var(--foreground-muted)] font-bold uppercase tracking-widest bg-[var(--surface)]/50 p-3 rounded-xl border border-[var(--border)]/50">
              Cross-Platform Strategy Active
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">Style Mode</label>
          <select 
            value={styleMode} 
            onChange={(e) => onStyleModeChange(e.target.value)} 
            className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-foreground text-xs outline-none focus:border-info-border"
          >
            <option value="">Standard</option>
            <option value="MrBeast">MrBeast (Viral)</option>
            <option value="Alex Hormozi">Hormozi (Aggressive)</option>
            <option value="Apple">Apple (Premium)</option>
            <option value="Nike">Nike (Bold)</option>
            <option value="Startup Founder">Founder (Authentic)</option>
            <option value="Minimal Creator">Minimalist</option>
          </select>
        </div>
        
        <div className="space-y-2 col-span-2">
          <label className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)]">Brand Tone</label>
          <select 
            value={aiTone} 
            onChange={(e) => onAiToneChange(e.target.value)} 
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--foreground)] text-xs outline-none focus:border-info-border"
          >
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="excited">Excited</option>
            <option value="educational">Educational</option>
            <option value="bold">Bold</option>
            <option value="inspirational">Inspirational</option>
          </select>
        </div>

        <div>
          <button 
            onClick={onGenerate} disabled={generating || !topic}
            className="w-full py-2.5 bg-info-text hover:brightness-110 text-foreground font-bold rounded-xl transition-all shadow-lg shadow-info-text/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Magic
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIWriterPanel;
