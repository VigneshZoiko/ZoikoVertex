import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

interface SchedulingPanelProps {
  suggestedTimes: {time: string, label: string}[];
  selectedTime: string;
  onSelect: (time: string) => void;
  customTime: string;
  onCustomTimeChange: (val: string) => void;
  contentType: string;
}

const SchedulingPanel: React.FC<SchedulingPanelProps> = ({
  suggestedTimes,
  selectedTime,
  onSelect,
  customTime,
  onCustomTimeChange,
  contentType
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-amber-400" />
        Scheduling Logic
      </h2>

      {suggestedTimes.length > 0 ? (
        <div className="space-y-3 mb-6">
          <p className="text-xs text-zinc-400 mb-2">AI Suggested Peak Times for {contentType}:</p>
          {suggestedTimes.map((slot, i) => (
            <label key={i} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors ${selectedTime === slot.time ? 'bg-indigo-500/10 border-indigo-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
              <input 
                type="radio" name="schedule" 
                checked={selectedTime === slot.time}
                onChange={() => onSelect(slot.time)}
                className="hidden"
              />
              <div className="flex-1">
                <p className={`text-sm font-bold ${selectedTime === slot.time ? 'text-indigo-400' : 'text-white'}`}>{slot.time}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{slot.label}</p>
              </div>
              {selectedTime === slot.time && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
            </label>
          ))}
        </div>
      ) : (
        <div className="text-xs text-zinc-500 p-4 bg-zinc-950 rounded-xl border border-zinc-800 mb-6 text-center">
          Generate AI content to see calculated peak time slots.
        </div>
      )}

      <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors mb-3 ${selectedTime === 'immediate' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
        <input 
          type="radio" name="schedule" 
          checked={selectedTime === 'immediate'}
          onChange={() => onSelect('immediate')}
          className="hidden"
        />
        <div className="flex-1">
          <p className={`text-sm font-bold ${selectedTime === 'immediate' ? 'text-emerald-400' : 'text-white'}`}>Post Immediately</p>
          <p className="text-xs text-zinc-500 mt-0.5">Executes upon manager approval</p>
        </div>
        {selectedTime === 'immediate' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
      </label>

      <div className={`p-3 rounded-xl border transition-colors ${selectedTime === 'custom' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
        <label className="flex items-center cursor-pointer">
          <input 
            type="radio" name="schedule" 
            checked={selectedTime === 'custom'}
            onChange={() => onSelect('custom')}
            className="hidden"
          />
          <div className="flex-1">
            <p className={`text-sm font-bold ${selectedTime === 'custom' ? 'text-indigo-400' : 'text-white'}`}>Custom Schedule</p>
            <p className="text-xs text-zinc-500 mt-0.5">Pick your own specific time</p>
          </div>
          {selectedTime === 'custom' && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
        </label>
        
        {selectedTime === 'custom' && (
          <div className="mt-3 pt-3 border-t border-zinc-800/50">
            <input 
              type="datetime-local" 
              value={customTime}
              onChange={(e) => onCustomTimeChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulingPanel;
