"use client";

import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import PerformanceOverviewCards from './components/PerformanceOverviewCards';
import TrendCharts from './components/TrendCharts';
import HallucinationTracker from './components/HallucinationTracker';
import AgentLeaderboard from './components/AgentLeaderboard';
import { RefreshCw, Download } from 'lucide-react';

export default function ModelPerformancePage() {
  const [summary, setSummary] = useState();
  const [trends, setTrends] = useState();
  const [hallucinations, setHallucinations] = useState();
  const [leaderboard, setLeaderboard] = useState();
  const [loading, setLoading] = useState(true);
  const initialLoad = useRef(true);

  const fetchData = async () => {
    if (initialLoad.current) setLoading(true);
    try {
      const [sumRes, trendRes, halRes, leadRes] = await Promise.all([
        api.get('/api/v1/monitoring/models/performance/summary'),
        api.get('/api/v1/monitoring/models/performance/trends'),
        api.get('/api/v1/monitoring/models/performance/hallucinations'),
        api.get('/api/v1/monitoring/models/performance/agents')
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (trendRes.success) setTrends(trendRes.data);
      if (halRes.success) setHallucinations(halRes.data);
      if (leadRes.success) setLeaderboard(leadRes.data);
    } catch (err) {
      console.error('Failed to fetch model performance metrics', err);
    } finally {
      if (initialLoad.current) {
        setLoading(false);
        initialLoad.current = false;
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    const safeFetch = () => { if (!cancelled && document.visibilityState === 'visible') fetchData(); };
    safeFetch();
    const interval = setInterval(safeFetch, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Model Performance</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Real-time analytics for agent accuracy, drift signals, and output quality
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)] transition-all"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <PerformanceOverviewCards data={summary} />

      {/* Grid Layout for Charts & Trackers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrendCharts data={trends} />
        </div>
        <div className="lg:col-span-1">
          <HallucinationTracker flags={hallucinations} />
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="mt-8">
        <AgentLeaderboard agents={leaderboard} />
      </div>
    </div>
  );
}
