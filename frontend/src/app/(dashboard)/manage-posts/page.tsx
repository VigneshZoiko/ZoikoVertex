"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  FileEdit, Trash2, Clock, CheckCircle2, 
  XCircle, Loader2, Image as ImageIcon, Send
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import { api } from "@/lib/api";

export default function ManagePostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const fetchMyPosts = async () => {
    setLoading(true);
    try {
      const result = await api.get('/api/v1/governance/intents');
      if (result.success) {
        setPosts(result.data || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch my posts:", err);
      setMessage({ type: 'error', text: 'Failed to load your posts. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchMyPosts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) return;
    
    try {
      await api.delete(`/api/v1/governance/intents/${id}`);

      setMessage({ type: 'success', text: 'Post deleted successfully.' });
      fetchMyPosts(); // Refresh list
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to delete post. Please try again.' });
    }
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'PENDING_ADMIN':
        return { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock, label: 'Awaiting Approval' };
      case 'APPROVED':
      case 'PUBLISHED':
        return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2, label: 'Published' };
      case 'RETURNED':
      case 'REJECTED':
        return { color: 'text-rose-500', bg: 'bg-rose-500/10', icon: XCircle, label: 'Returned for Revision' };
      default:
        return { color: 'text-[var(--foreground-muted)]', bg: 'bg-[var(--surface)]', icon: Clock, label: status };
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">My Posts</h1>
        <p className="text-[var(--foreground-muted)]">Manage, edit, or delete the content you have authored.</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
        }`}>
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-[var(--foreground-muted)]">Loading your posts...</p>
        </div>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => {
            const Status = getStatusConfig(post.status);
            return (
              <div key={post.id} className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden flex flex-col">
                {/* Media Preview */}
                {post.media_url ? (
                  <div className="aspect-video relative overflow-hidden bg-black">
                    <img src={post.media_url} alt="Post media" className="w-full h-full object-cover" />
                    <div className="absolute top-4 right-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-md ${Status.bg} ${Status.color}`}>
                        <Status.icon className="w-3 h-3" />
                        {Status.label}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-[var(--surface)] flex flex-col items-center justify-center relative">
                    <ImageIcon className="w-10 h-10 text-[var(--foreground-muted)] mb-2" />
                    <p className="text-[var(--foreground-muted)] text-sm">Text Only Post</p>
                    <div className="absolute top-4 right-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-md ${Status.bg} ${Status.color}`}>
                        <Status.icon className="w-3 h-3" />
                        {Status.label}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-[var(--foreground)] text-sm line-clamp-3 mb-4 flex-1">
                    {post.content || "No description provided."}
                  </p>

                  {/* Feedback Box (If Returned) */}
                  {post.status === 'RETURNED' && post.feedback && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                      <strong>Admin Feedback:</strong> {post.feedback}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border)]">
                    <div className="text-xs text-[var(--foreground-muted)]">
                      {formatDateTime(post.created_at)}
                    </div>
                    <div className="flex gap-2">
                      {(post.status === 'PENDING_ADMIN' || post.status === 'RETURNED') && (
                        <button 
                          onClick={() => router.push(`/publish?assetUrl=${encodeURIComponent(post.media_url || '')}`)} // Quick edit hack for now
                          className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--foreground-muted)] hover:text-indigo-400 transition-colors"
                          title="Edit Post"
                        >
                          <FileEdit className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(post.id)}
                        className="p-2 hover:bg-rose-500/10 rounded-lg text-[var(--foreground-muted)] hover:text-rose-500 transition-colors"
                        title="Delete Post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-dashed border-[var(--border)] rounded-3xl p-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[var(--surface)] rounded-full flex items-center justify-center mb-4">
            <Send className="w-8 h-8 text-[var(--foreground-muted)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">No Posts Yet</h2>
          <p className="text-[var(--foreground-muted)] max-w-sm mb-6">You haven&apos;t authored any posts. Head to the Media Library to pick an asset and start publishing!</p>
          <button 
            onClick={() => router.push('/library')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20"
          >
            Browse Library
          </button>
        </div>
      )}
    </div>
  );
}
