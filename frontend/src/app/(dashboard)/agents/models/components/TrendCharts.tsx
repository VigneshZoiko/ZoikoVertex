import React from 'react';
import { Activity } from 'lucide-react';

interface TrendPoint {
  timestamp: string;
  accuracy: number;
  driftSignal: number;
  humanOverride: number;
}

export default function TrendCharts({ data }: { data?: TrendPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 h-80 flex flex-col items-center justify-center">
        <Activity className="w-8 h-8 text-[var(--text-secondary)] animate-pulse mb-3" />
        <p className="text-[var(--text-secondary)]">Loading performance telemetry...</p>
      </div>
    );
  }

  // Very basic inline SVG chart since recharts isn't guaranteed
  const minVal = Math.min(...data.map(d => d.accuracy)) - 2;
  const maxVal = Math.max(...data.map(d => d.accuracy)) + 2;
  const range = maxVal - minVal;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.accuracy - minVal) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col h-full relative group">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Accuracy & Drift Analysis</h2>
          <p className="text-sm text-[var(--text-secondary)]">24-hour moving average tracking</p>
        </div>
        <div className="flex space-x-4 text-xs font-medium text-[var(--text-secondary)]">
          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" /> Accuracy</div>
        </div>
      </div>

      <div className="flex-1 w-full relative pt-4">
        {/* Y Axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-[var(--text-muted)]">
          <span>{maxVal.toFixed(1)}%</span>
          <span>{((maxVal + minVal)/2).toFixed(1)}%</span>
          <span>{minVal.toFixed(1)}%</span>
        </div>

        {/* Chart area */}
        <div className="ml-10 h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0,1,2].map(i => <div key={i} className="w-full border-t border-[var(--border)] opacity-50" />)}
          </div>

          {/* SVG Line */}
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
            {/* Gradient definition */}
            <defs>
              <linearGradient id="accGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {/* Area Fill */}
            <polygon 
              points={`0,100 ${points} 100,100`} 
              fill="url(#accGradient)" 
              className="opacity-50"
            />
            
            {/* Stroke Line */}
            <polyline 
              points={points} 
              fill="none" 
              stroke="rgb(16 185 129)" 
              strokeWidth="2" 
              vectorEffect="non-scaling-stroke"
              className="drop-shadow-md"
            />
          </svg>
        </div>
      </div>

      {/* X Axis labels */}
      <div className="ml-10 mt-3 flex justify-between text-xs text-[var(--text-muted)]">
        <span>-24h</span>
        <span>-12h</span>
        <span>Now</span>
      </div>
    </div>
  );
}
