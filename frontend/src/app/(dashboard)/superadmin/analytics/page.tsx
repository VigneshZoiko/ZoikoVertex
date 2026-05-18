'use client';

import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Globe, 
  FileText, 
  Link2, 
  ShieldCheck,
  TrendingUp,
  Activity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Stats {
  organizations: number;
  totalUsers: number;
  totalPosts: number;
  totalAssets: number;
  socialConnections: number;
  platformStatus: string;
}

export default function PlatformAnalytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = '/login';
          return;
        }

        const res = await fetch('http://localhost:5006/api/v1/superadmin/stats', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        } else {
          setError(data.error || 'Failed to load platform statistics');
        }
      } catch (err) {
        setError('Network error: Could not reach the control plane.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-zinc-400 animate-pulse">Gathering platform intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center">
          <ShieldCheck className="w-8 h-8 text-red-400 mr-4" />
          <div>
            <h3 className="text-red-400 font-bold">Access or Connectivity Error</h3>
            <p className="text-red-400/70 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const metricCards = [
    { 
      label: 'Active Organizations', 
      value: stats?.organizations || 0, 
      icon: Globe, 
      color: 'text-blue-400', 
      bg: 'bg-blue-400/10',
      description: 'Verified workspaces currently active on the platform'
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center">
            <TrendingUp className="w-10 h-10 mr-4 text-indigo-500" />
            Platform Overview
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">
            High-level aggregation of ZoikoVertex scale and execution metrics.
          </p>
        </div>
        <div className="px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-500">
          SECURE ADMINISTRATIVE VIEW
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {metricCards.map((card, idx) => (
          <div 
            key={idx} 
            className="group p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${card.bg} blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 rounded-full -mr-16 -mt-16`} />
            
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-zinc-500 text-sm font-medium mb-1 uppercase tracking-wider">{card.label}</p>
                <h3 className="text-4xl font-black text-white">{card.value.toLocaleString()}</h3>
              </div>
              <div className={`p-3 rounded-2xl ${card.bg} ${card.color}`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
            
            <div className="mt-6 flex items-center text-xs text-zinc-500 relative z-10">
              <span className="flex-1 italic">{card.description}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Governance Standards Note */}
      <div className="bg-indigo-500/5 border border-indigo-500/10 p-8 rounded-3xl">
        <div className="flex items-start">
          <ShieldCheck className="w-10 h-10 text-indigo-400 mr-6 shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Privacy &amp; Compliance Protocol</h3>
            <p className="text-zinc-400 leading-relaxed max-w-3xl">
              As a SuperAdmin, you have visibility into global execution metrics to monitor platform scale and resource utilization. 
              In accordance with enterprise data standards, individual content, media files, and private workspace activity 
              are strictly isolated and inaccessible from this view. This ensures high-level governance without violating 
              the data privacy of individual organizations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
