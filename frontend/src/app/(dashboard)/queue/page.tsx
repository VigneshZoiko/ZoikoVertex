"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import IntentCard from "@/components/queue/IntentCard";

export default function ApprovalQueue() {
  const [intents, setIntents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<{[key: string]: string}>({});

  const fetchIntents = useCallback(async (role: string) => {
    setLoading(true);
    let query = supabase
      .from('publish_intents')
      .select(`
        *,
        creator:users!publish_intents_creator_id_fkey(full_name, email)
      `);
    
    if (role === 'ADMIN') {
      query = query.eq('status', 'PENDING');
    } else if (role === 'MANAGER') {
      query = query.eq('status', 'NEEDS_REVISION');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) setIntents(data);
    setLoading(false);
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
        fetchIntents(member.role);
      }
    }
  }, [fetchIntents]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const updateStatus = async (id: string, status: string, feedback?: string) => {
    const { error } = await supabase
      .from('publish_intents')
      .update({ status, feedback: feedback || null })
      .eq('id', id);

    if (!error) {
      setIntents(prev => prev.filter(item => item.id !== id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Approval Queue</h1>
        <p className="text-zinc-400 text-sm font-medium">Review and govern social media intents before they are published.</p>
      </div>

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
            <h3 className="text-white font-bold text-lg mb-2">Queue is Empty</h3>
            <p className="text-zinc-500 max-w-xs mx-auto text-sm">There are no pending posts waiting for approval at this time.</p>
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
