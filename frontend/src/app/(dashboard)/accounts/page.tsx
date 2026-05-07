"use client";

import { useState, useEffect, useCallback } from "react";
import { Link as LinkIcon, Plus, Trash2, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ConnectedAccount {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter';
  account_name: string;
  account_handle?: string;
  avatar_url?: string;
  status: string;
  expires_at?: string;
}

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', color: '#1877F2', icon: 'F' },
  { id: 'instagram', name: 'Instagram', color: '#E4405F', icon: 'IG' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', icon: 'in' },
  { id: 'twitter', name: 'Twitter / X', color: '#000000', icon: 'X' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedPlatforms, setExpandedPlatforms] = useState<string[]>(['facebook', 'instagram', 'linkedin', 'twitter']);
  const [error, setError] = useState<string | null>(null);
  
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

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const togglePlatform = (platformId: string) => {
    setExpandedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId) 
        : [...prev, platformId]
    );
  };

  const disconnectAccount = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this account?")) return;
    
    const { error } = await supabase
      .from('connected_accounts')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setAccounts(prev => prev.filter(a => a.id !== id));
    } else {
      setError("Failed to disconnect account: " + error.message);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform || !accountName) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found. Please log in again.");

      // Get workspace ID
      const { data: member, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) throw new Error("Workspace membership not found.");

      const newAccount = {
        workspace_id: member.workspace_id,
        platform: selectedPlatform,
        account_name: accountName,
        account_handle: accountHandle,
        status: 'active'
      };

      const { error: insertError } = await supabase
        .from('connected_accounts')
        .insert(newAccount);
      
      if (insertError) throw insertError;

      await fetchAccounts();
      resetForm();
      setShowAddModal(false);
    } catch (err: any) {
      console.error("Add account error:", err);
      setError(err.message || "Failed to add account. Ensure the database table exists.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedPlatform(null);
    setAccountName("");
    setAccountHandle("");
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Connected Accounts</h1>
          <p className="text-zinc-400">Manage OAuth tokens and platform integrations for your workspace.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Connection
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center gap-3 text-rose-500 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto hover:text-rose-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm font-medium">Synchronizing tokens...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {PLATFORMS.map(platform => {
            const platformAccounts = accounts.filter(a => a.platform === platform.id);
            const isExpanded = expandedPlatforms.includes(platform.id);
            
            return (
              <div key={platform.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => togglePlatform(platform.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.icon}
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-bold">{platform.name}</h3>
                      <p className="text-xs text-zinc-500">{platformAccounts.length} Connected {platformAccounts.length === 1 ? 'Account' : 'Accounts'}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
                </button>

                {isExpanded && (
                  <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {platformAccounts.length > 0 ? (
                      platformAccounts.map(account => (
                        <div key={account.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between h-40 group">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {account.avatar_url ? (
                                <img src={account.avatar_url} alt={account.account_name} className="w-10 h-10 rounded-lg bg-zinc-800" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold">
                                  {account.account_name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <h4 className="text-white font-medium text-sm">{account.account_name}</h4>
                                <p className="text-xs text-zinc-500">{account.account_handle || 'Connected'}</p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              account.status === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {account.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between border-t border-zinc-800/50 pt-3 mt-auto">
                            <p className="text-[10px] text-zinc-600">ID: {account.id.substring(0, 8)}...</p>
                            <button 
                              onClick={() => disconnectAccount(account.id)}
                              className="text-zinc-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="md:col-span-2 border-2 border-dashed border-zinc-800/50 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-zinc-500 mb-3">No {platform.name} accounts connected yet.</p>
                        <button 
                          onClick={() => setShowAddModal(true)}
                          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          + Connect Account
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {selectedPlatform ? `Connect ${PLATFORMS.find(p => p.id === selectedPlatform)?.name}` : 'Connect Platform'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddAccount}>
              <div className="p-8 space-y-6">
                {!selectedPlatform ? (
                  <>
                    <p className="text-zinc-400 text-sm">Select a platform to initiate the OAuth 2.0 secure authorization flow.</p>
                    <div className="grid grid-cols-2 gap-4">
                      {PLATFORMS.map(platform => (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => setSelectedPlatform(platform.id)}
                          className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all group text-left"
                        >
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg transition-transform group-hover:scale-110"
                            style={{ backgroundColor: platform.color }}
                          >
                            {platform.icon}
                          </div>
                          <span className="text-xs font-bold text-white">{platform.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Account Name</label>
                      <input 
                        type="text" 
                        required
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm transition-colors"
                        placeholder="e.g. Zoiko Official"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Account Handle (Optional)</label>
                      <input 
                        type="text" 
                        value={accountHandle}
                        onChange={(e) => setAccountHandle(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm transition-colors"
                        placeholder="e.g. @zoiko_intl"
                      />
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        <span className="text-amber-500 font-bold">Note:</span> Since this is a demo, clicking &quot;Connect&quot; will simulate a successful OAuth callback and create the account entry.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex justify-between">
                {selectedPlatform ? (
                  <button 
                    type="button"
                    onClick={() => setSelectedPlatform(null)}
                    className="px-6 py-2 text-zinc-400 hover:text-white text-sm font-bold transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  {selectedPlatform && (
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                      {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                      Connect Account
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

