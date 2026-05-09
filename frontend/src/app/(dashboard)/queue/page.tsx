"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCcw, CheckSquare, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import IntentCard from "@/components/queue/IntentCard";
import { api } from "@/lib/api";

export default function ApprovalQueue() {
  const [intents, setIntents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<{[key: string]: string}>({});
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const fetchIntents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get('/api/v1/governance/queue');
      if (result.success) {
        setIntents(result.data || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch queue:", err);
      setMessage({ type: 'error', text: err.message });
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
        setUserRole(member.role);
        fetchIntents();
      }
    }
  }, [fetchIntents]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // FIX: Call backend governance transition instead of direct Supabase update
  const updateStatus = async (id: string, status: string, feedback?: string) => {
    setMessage(null);
    try {
      const result = await api.post('/api/v1/governance/transition', {
        intentId: id,
        newStatus: status,
        feedback: feedback || null,
        userRole: userRole
      });

      setIntents(prev => prev.filter(item => item.id !== id));
      setMessage({ type: 'success', text: `Intent successfully transitioned to ${status}.` });
    } catch (err: any) {
      console.error("Failed to update status:", err);
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            {userRole === 'MANAGER' ? 'Review & Edit' : 'Approval Queue'}
          </h1>
          <p className="text-zinc-400 text-sm font-medium">
            {userRole === 'MANAGER'
              ? 'Review posts submitted by creators. Approve, return for edits, or reject before escalating to Admin.'
              : 'Final approval gate. Approve or reject Manager-submitted posts before they go live.'}
          </p>
        </div>
        <button
          onClick={() => fetchIntents()}
          className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white hover:border-zinc-700 transition-all group"
          title="Refresh"
        >
          <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin text-indigo-500' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
          <AlertCircle className="w-4 h-4" />
          {message.text}
        </div>
      )}

      <div className="grid gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-4">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Scanning for pending intents...</p>
          </div>
        ) : intents.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-20 text-center shadow-2xl">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckSquare className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">
              {userRole === 'MANAGER' ? 'No Posts to Review' : 'Approval Queue is Clear'}
            </h3>
            <p className="text-zinc-500 max-w-xs mx-auto text-sm leading-relaxed">
              {userRole === 'MANAGER' 
                ? 'Everything is up to date. New posts from creators will appear here for your review.' 
                : 'There are no pending posts waiting for final approval. Great job!'}
            </p>
          </div>
        ) : (
          intents.map((intent) => (
            <IntentCard 
              key={intent.id}
              intent={intent}
              userRole={userRole}
              feedbackText={feedbackText[intent.id] || ""}
              onFeedbackChange={(val) => setFeedbackText({...feedbackText, [intent.id]: val})}
              onUpdateStatus={updateStatus}
            />
          ))
        )}
      </div>
    </div>
  );
}
