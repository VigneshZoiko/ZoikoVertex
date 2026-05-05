"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Eye, ShieldAlert, CheckSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ApprovalQueue() {
  const [intents, setIntents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntents();
  }, []);

  const fetchIntents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('publish_intents')
      .select(`
        *,
        creator:users!publish_intents_creator_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) setIntents(data);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const { error } = await supabase
      .from('publish_intents')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setIntents(prev => prev.map(item => item.id === id ? { ...item, status } : item));
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
            <div key={intent.id} className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all duration-300 group shadow-lg">
              <div className="p-6 flex flex-col md:flex-row gap-6">
                
                {/* Media Preview */}
                <div className="w-full md:w-48 aspect-video md:aspect-square bg-black rounded-xl border border-zinc-800 flex items-center justify-center relative group overflow-hidden shrink-0">
                  {intent.media_url ? (
                    intent.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video src={intent.media_url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={intent.media_url} alt="Content" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="text-xs text-zinc-600 font-medium text-center p-4">No Media Attached</div>
                  )}
                  <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-colors flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        {intent.platform?.split(', ').map((p: string) => (
                          <span key={p} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-white uppercase tracking-wider">
                            {p}
                          </span>
                        ))}
                      </div>
                      <div className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                        intent.status === 'PENDING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        intent.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                        'bg-rose-500/10 border-rose-500/20 text-rose-500'
                      }`}>
                        {intent.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                         <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Scheduled For</span>
                         <span className="text-[10px] text-white font-medium">
                            {intent.scheduled_for ? new Date(intent.scheduled_for).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Immediate'}
                         </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 mb-4 flex-1">
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {intent.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-500/10">
                        {intent.creator?.full_name?.charAt(0) || "U"}
                      </div>
                      <div className="text-xs">
                        <p className="text-white font-bold">{intent.creator?.full_name || "Unknown Creator"}</p>
                        <p className="text-zinc-500 font-medium text-[10px] uppercase tracking-wider">Submitted {new Date(intent.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {intent.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateStatus(intent.id, 'REJECTED')}
                          className="px-5 py-2 bg-zinc-800 text-zinc-300 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold transition-all duration-300 border border-zinc-700 hover:border-rose-400"
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => updateStatus(intent.id, 'APPROVED')}
                          className="px-5 py-2 bg-indigo-500 text-white hover:bg-indigo-400 rounded-xl text-xs font-bold transition-all duration-300 shadow-xl shadow-indigo-500/20 border border-indigo-400"
                        >
                          Approve Post
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
