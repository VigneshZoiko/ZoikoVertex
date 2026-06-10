import React from 'react';
import { Clock, CheckCircle2, Sparkles } from 'lucide-react';

interface SuggestedTime {
  time: string;
  label: string;
  reasoning?: string;
  confidence_score?: number;
}

interface SchedulingPanelProps {
  suggestedTimes: SuggestedTime[];
  selectedTime: string;
  onSelect: (time: string) => void;
  customTime: string;
  onCustomTimeChange: (val: string) => void;
  contentType: string;
  audienceRegion: string;
  setAudienceRegion: (val: string) => void;
  audienceAgeGroup: string;
  setAudienceAgeGroup: (val: string) => void;
  onMagicSchedule: () => void;
  isFetchingRecommendations: boolean;
}

const SchedulingPanel: React.FC<SchedulingPanelProps> = ({
  suggestedTimes,
  selectedTime,
  onSelect,
  customTime,
  onCustomTimeChange,
  contentType,
  audienceRegion,
  setAudienceRegion,
  audienceAgeGroup,
  setAudienceAgeGroup,
  onMagicSchedule,
  isFetchingRecommendations
}) => {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          Scheduling Logic
        </h2>
        <button
          onClick={onMagicSchedule}
          disabled={isFetchingRecommendations}
          className="bg-indigo-600 hover:bg-indigo-500 text-foreground text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
        >
          {isFetchingRecommendations ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Magic Schedule 🪄
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-bold text-[var(--foreground-muted)] mb-1">Target Region</label>
          <select 
            value={audienceRegion} 
            onChange={(e) => setAudienceRegion(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-xs outline-none focus:border-indigo-500"
          >
            <option value="Global">Global</option>
            <option value="US (EST)">US (EST)</option>
            <option value="US (PST)">US (PST)</option>
            <option value="UK / Europe">UK / Europe</option>
            <option value="Asia Pacific">Asia Pacific</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-[var(--foreground-muted)] mb-1">Target Age Group</label>
          <select 
            value={audienceAgeGroup} 
            onChange={(e) => setAudienceAgeGroup(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-xs outline-none focus:border-indigo-500"
          >
            <option value="All Ages">All Ages</option>
            <option value="18-24">18-24 (Gen Z)</option>
            <option value="25-34">25-34 (Millennials)</option>
            <option value="35-44">35-44</option>
            <option value="Professionals">Professionals</option>
          </select>
        </div>
      </div>

      {suggestedTimes.length > 0 ? (
        <div className="space-y-3 mb-6">
          <p className="text-xs text-[var(--foreground-muted)] mb-2">AI Suggested Peak Times for {contentType}:</p>
          {suggestedTimes.map((slot, i) => (
            <label key={i} className={`flex items-start p-3 rounded-xl border cursor-pointer transition-colors ${selectedTime === slot.time ? 'bg-indigo-500/10 border-indigo-500' : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--card-border)]'}`}>
              <input 
                type="radio" name="schedule" 
                checked={selectedTime === slot.time}
                onChange={() => onSelect(slot.time)}
                className="hidden"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-bold ${selectedTime === slot.time ? 'text-indigo-400' : 'text-[var(--foreground)]'}`}>
                    {new Date(slot.time).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {slot.confidence_score && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-mono">
                      {Math.round(slot.confidence_score * 100)}% Conf
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">{slot.label}</p>
                {slot.reasoning && (
                  <p className="text-xs text-indigo-400/80 mt-1.5 italic bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10">
                    &quot;{slot.reasoning}&quot;
                  </p>
                )}
              </div>
              {selectedTime === slot.time && <CheckCircle2 className="w-5 h-5 text-indigo-400 mt-1 ml-3 shrink-0" />}
            </label>
          ))}
        </div>
      ) : (
        <div className="text-xs text-[var(--foreground-muted)] p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] mb-6 text-center">
          Click &quot;Magic Schedule&quot; to calculate peak time slots based on your target audience.
        </div>
      )}

      <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors mb-3 ${selectedTime === 'immediate' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--card-border)]'}`}>
        <input 
          type="radio" name="schedule" 
          checked={selectedTime === 'immediate'}
          onChange={() => onSelect('immediate')}
          className="hidden"
        />
        <div className="flex-1">
          <p className={`text-sm font-bold ${selectedTime === 'immediate' ? 'text-emerald-400' : 'text-[var(--foreground)]'}`}>Post Immediately</p>
          <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Executes upon manager approval</p>
        </div>
        {selectedTime === 'immediate' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
      </label>

      <div className={`p-3 rounded-xl border transition-colors ${selectedTime === 'custom' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--card-border)]'}`}>
        <label className="flex items-center cursor-pointer">
          <input 
            type="radio" name="schedule" 
            checked={selectedTime === 'custom'}
            onChange={() => onSelect('custom')}
            className="hidden"
          />
          <div className="flex-1">
            <p className={`text-sm font-bold ${selectedTime === 'custom' ? 'text-indigo-400' : 'text-[var(--foreground)]'}`}>Custom Schedule</p>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Pick your own specific time</p>
          </div>
          {selectedTime === 'custom' && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
        </label>
        
        {selectedTime === 'custom' && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]/50">
            <input 
              type="datetime-local" 
              value={customTime}
              onChange={(e) => onCustomTimeChange(e.target.value)}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] text-xs outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulingPanel;
