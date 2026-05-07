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
  onGenerate: () => void;
  generating: boolean;
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
  onGenerate,
  generating
}) => {
  return (
    <div className="bg-zinc-950/80 border-t border-zinc-800 p-8 space-y-8 animate-in slide-in-from-top duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Post Topic</label>
          <input 
            type="text" value={topic} onChange={(e) => onTopicChange(e.target.value)}
            placeholder="e.g. New sneaker launch"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Content Category</label>
          <input 
            type="text" list="content-types" value={contentType} onChange={(e) => onContentTypeChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
          />
          <datalist id="content-types">
            <option value="Entertainment" /><option value="Music" /><option value="Technology" /><option value="Business" />
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
        <div className="md:col-span-1 space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Length</label>
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {['short', 'medium', 'long'].map((l) => (
              <button 
                key={l} 
                onClick={() => onAiLengthChange(l)} 
                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${aiLength === l ? 'bg-indigo-500 text-white' : 'text-zinc-500 hover:text-white'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-1 space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Brand Tone</label>
          <select 
            value={aiTone} 
            onChange={(e) => onAiToneChange(e.target.value)} 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-indigo-500"
          >
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="excited">Excited</option>
            <option value="educational">Educational</option>
          </select>
        </div>
        <div className="md:col-span-1">
          <button 
            onClick={onGenerate} disabled={generating || !topic}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
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
