"use client";

import { useState, useEffect, useCallback } from "react";
import { Link as LinkIcon, Plus, Trash2, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

interface ConnectedAccount {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'pinterest' | 'threads';
  account_name: string;
  account_handle?: string;
  avatar_url?: string;
  status: string;
  expires_at?: string;
}

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: 'f', color: '#1877F2' },
  { id: 'instagram', name: 'Instagram', icon: 'i', color: '#E4405F' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: '#0A66C2' },
  { id: 'twitter', name: 'X / Twitter', icon: '𝕏', color: '#000000' },
  { id: 'pinterest', name: 'Pinterest', icon: 'P', color: '#BD081C' },
  { id: 'threads', name: 'Threads', icon: '@', color: '#000000' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedPlatforms, setExpandedPlatforms] = useState<string[]>(['facebook', 'instagram', 'linkedin', 'twitter', 'pinterest', 'threads']);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Form state for new account
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [accountHandle, setAccountHandle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .order('platform', { ascending: true });
      
      if (error) throw error;
      if (data) setAccounts(data);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("Failed to fetch accounts. Have you applied the SQL migration?");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (member) {
        setUserRole(member.role.toUpperCase());
      }
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchUserData();
  }, [fetchAccounts, fetchUserData]);

  const togglePlatform = (platformId: string) => {
    setExpandedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId) 
        : [...prev, platformId]
    );
  };

  const disconnectAccount = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this account?")) return;
    
    try {
      await api.delete(`/api/v1/accounts/${id}`);
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      setError("Failed to disconnect account: " + err.message);
    }
  };

  const handleAddAccount = async (platformId: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found.");

      const { data: member } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!member) throw new Error("Workspace context not found.");

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005';

      if (platformId === 'facebook' || platformId === 'instagram') {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID || '989391590153112';
        const redirectUri = encodeURIComponent(`${backendUrl}/api/auth/facebook/callback`);
        
        const scopeString = [
          'public_profile', 'email', 'pages_show_list',
          'pages_read_engagement', 'pages_manage_posts',
          'instagram_basic', 'instagram_content_publish'
        ].join(',');

        const state = encodeURIComponent(JSON.stringify({
          workspaceId: member.workspace_id,
          platform: platformId
        }));

        // eslint-disable-next-line react-hooks/immutability
        window.location.href = `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scopeString}&state=${state}&response_type=code`;
      } else if (platformId === 'linkedin') {
        // LinkedIn OAuth 2.0 Integration
        const clientId = '86ffpbixotzcst'; 
        const redirectUri = encodeURIComponent(`${backendUrl}/api/auth/linkedin/callback`);
        const state = encodeURIComponent(JSON.stringify({
          workspaceId: member.workspace_id,
          platform: 'linkedin'
        }));
        const scope = encodeURIComponent('openid profile email w_member_social');

        // eslint-disable-next-line react-hooks/immutability
        window.location.href = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;
      } else if (platformId === 'pinterest') {
        // Pinterest OAuth 2.0
        const clientId = process.env.NEXT_PUBLIC_PINTEREST_APP_ID || '';
        const redirectUri = encodeURIComponent(`${backendUrl}/api/auth/pinterest/callback`);
        const state = encodeURIComponent(JSON.stringify({ workspaceId: member.workspace_id }));
        const scope = 'boards:read,pins:read,pins:write';
        
        // eslint-disable-next-line react-hooks/immutability
        window.location.href = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
      } else if (platformId === 'threads') {
        // Threads OAuth (Via Meta)
        const appId = process.env.NEXT_PUBLIC_THREADS_APP_ID || '';
        const redirectUri = encodeURIComponent(`${backendUrl}/api/auth/threads/callback`);
        const state = encodeURIComponent(JSON.stringify({ workspaceId: member.workspace_id }));
        const scope = 'threads_basic,threads_content_publish';
        
        // eslint-disable-next-line react-hooks/immutability
        window.location.href = `https://www.threads.net/oauth/authorize?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&response_type=code`;
      } else {
        setError(`${platformId.charAt(0).toUpperCase() + platformId.slice(1)} integration is coming in the next update.`);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Connected Accounts</h1>
          <p className="text-zinc-400">Manage and sync your social media platform integrations.</p>
        </div>
        {userRole !== 'CREATOR' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-6 py-2.5 bg-white text-black hover:bg-zinc-200 text-sm font-bold rounded-xl transition-all shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Connect New Account
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center gap-3 text-rose-500 text-sm animate-in fade-in duration-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto hover:text-rose-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="w-10 h-10 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-zinc-500 text-[10px] font-black tracking-widest uppercase animate-pulse">Syncing Cloud Tokens...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 animate-in fade-in zoom-in-95 duration-700">
          <div className="relative mb-10">
            <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full animate-pulse" />
            <div className="relative w-28 h-28 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
              <LinkIcon className="w-12 h-12 text-zinc-700" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Plus className="w-5 h-5 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Expand your reach</h2>
          <p className="text-zinc-500 max-w-sm mx-auto mb-10 text-lg font-medium leading-relaxed">
            Connect your social media accounts to start scheduling, analyzing, and automating your content from a single dashboard.
          </p>
          {userRole !== 'CREATOR' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-10 py-4 bg-white text-black hover:bg-zinc-200 text-base font-black rounded-2xl transition-all shadow-2xl shadow-white/5 hover:scale-105 active:scale-95"
            >
              Add Your First Connection
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {PLATFORMS.map(platform => {
            const platformAccounts = accounts.filter(a => a.platform === platform.id);
            const isExpanded = expandedPlatforms.includes(platform.id);
            
            return (
              <div key={platform.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl overflow-hidden backdrop-blur-sm">
                <button 
                  onClick={() => togglePlatform(platform.id)}
                  className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/30 transition-colors group"
                >
                  <div className="flex items-center gap-5">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-2xl transition-transform group-hover:scale-110"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.icon}
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-bold text-lg">{platform.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${platformAccounts.length > 0 ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                        <p className="text-xs text-zinc-500 font-medium">
                          {platformAccounts.length} {platformAccounts.length === 1 ? 'connection' : 'connections'} active
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {platformAccounts.length === 0 && userRole !== 'CREATOR' && (
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2 opacity-0 group-hover:opacity-100 transition-opacity">Not Linked</span>
                    )}
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-zinc-800/30 animate-in fade-in slide-in-from-top-1 duration-300">
                    {platformAccounts.length > 0 ? (
                      <div className="divide-y divide-zinc-800/30">
                        {platformAccounts.map(account => (
                          <div key={account.id} className="flex items-center justify-between p-4 px-6 hover:bg-zinc-800/20 transition-colors group">
                            <div className="flex items-center gap-4 min-w-0">
                              {account.avatar_url ? (
                                <img src={account.avatar_url} alt={account.account_name} className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-800 shadow-sm" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-bold text-xs">
                                  {account.account_name.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-zinc-100 font-medium text-sm truncate">{account.account_name}</h4>
                                  <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                  <p className="text-[11px] text-zinc-500 font-medium truncate uppercase tracking-tight">
                                    {account.account_handle || `ID: ${account.id.substring(0, 8)}`}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <span className="hidden md:flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-400/60 border border-emerald-500/10">
                                Connected
                              </span>
                              {userRole !== 'CREATOR' && (
                                <button 
                                  onClick={() => disconnectAccount(account.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900/0 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/5 transition-all opacity-0 group-hover:opacity-100"
                                  title="Disconnect"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-10 flex flex-col items-center justify-center text-center">
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-4">No active connection</p>
                        {userRole !== 'CREATOR' && (
                          <button 
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-1.5 bg-zinc-900/50 hover:bg-white hover:text-black text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border border-zinc-800"
                          >
                            Add {platform.name}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ultra-Compact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/10 shrink-0">
              <h2 className="text-lg font-bold text-white tracking-tight">Add Connection</h2>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 text-zinc-500 hover:text-white transition-all border border-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-2 gap-3 mb-8">
                {PLATFORMS.map(platform => (
                  <button
                    key={platform.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAddAccount(platform.id)}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800 hover:border-zinc-500 hover:bg-zinc-800/50 transition-all text-left disabled:opacity-50 group"
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-xl group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-zinc-200 truncate">{platform.name}</h4>
                      <p className="text-[9px] text-zinc-500 font-black uppercase tracking-tight opacity-60">
                        {platform.id === 'facebook' || platform.id === 'instagram' ? 'OAuth' : 'Pending'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-5 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl flex items-start gap-4">
                <AlertCircle className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium uppercase tracking-tight">
                  ZoikoVertex uses enterprise-grade OAuth handshakes. Revoke access anytime from your provider settings.
                </p>
              </div>
            </div>
            
            <div className="p-6 bg-zinc-900/20 border-t border-zinc-900 flex justify-end shrink-0">
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2 text-zinc-500 hover:text-white text-[10px] font-black transition-colors uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
