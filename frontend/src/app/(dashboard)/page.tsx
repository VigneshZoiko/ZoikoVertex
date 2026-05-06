"use client";

import { Activity, TrendingUp, Users, AlertCircle, BarChart3, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [heights, setHeights] = useState<number[]>([]);

  useEffect(() => {
    setMounted(true);
    setHeights(Array.from({ length: 14 }).map(() => 30 + Math.random() * 60));
  }, []);
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Social Performance</h1>
        <p className="text-zinc-400 text-sm">Monitor your connected platform metrics and publishing queue.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Metric 1 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> +12%
            </span>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium mb-1">Total Reach</h3>
          <p className="text-3xl font-bold text-white">124.5K</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium mb-1">Published Posts</h3>
          <p className="text-3xl font-bold text-white">84</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium mb-1">Pending Approvals</h3>
          <p className="text-3xl font-bold text-white">12</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> +5.2%
            </span>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium mb-1">Audience Growth</h3>
          <p className="text-3xl font-bold text-white">3,240</p>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-lg font-bold text-white">Cross-Platform Engagement</h2>
            <p className="text-sm text-zinc-400 mt-1">Aggregated views and interactions across Meta and LinkedIn.</p>
          </div>
          <select className="bg-zinc-950 border border-zinc-800 text-sm text-white px-3 py-1.5 rounded-lg outline-none focus:border-indigo-500 transition-colors">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Year</option>
          </select>
        </div>
        
        {/* Mock Chart Visualization */}
        <div className="h-72 w-full flex items-end gap-2">
          {mounted && heights.map((height, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end group">
              <div className="w-full bg-zinc-800/50 hover:bg-indigo-500/50 rounded-t-sm transition-all duration-300 relative" style={{ height: `${height}%` }}>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {Math.floor(height * 12)}
                </div>
              </div>
            </div>
          ))}
          {!mounted && Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end">
              <div className="w-full bg-zinc-800/20 rounded-t-sm h-[50%]" />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4 text-xs text-zinc-500 font-medium border-t border-zinc-800/50 pt-4">
          <span>May 1</span>
          <span>May 7</span>
          <span>May 14</span>
        </div>
      </div>
    </div>
  );
}
