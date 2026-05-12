"use client";

import { useState, useEffect } from "react";
import { 
  Search, Filter, Image as ImageIcon, Video as VideoIcon, 
  ExternalLink, Send, Trash2, Loader2, User, Calendar
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { api } from "@/lib/api";

interface LibraryAsset {
  id: string;
  title: string;
  url: string;         // first/primary URL (backward compat)
  urls: string[];      // all URLs in the pack
  file_type: string;
  uploader_id: string; // Used for ownership check
  uploader: {
    id: string;
    full_name: string;
    email: string;
  };
  created_at: string;
}

export default function MediaLibraryPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserContext = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      
      const { data } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (data) setUserRole(data.role);
    };
    fetchUserContext();
  }, []);

  const fetchLibrary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/api/v1/library?search=${encodeURIComponent(search)}&type=${filter}`);
      setAssets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to fetch library", err);
      setError(err.message || 'Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchLibrary, 300);
    return () => clearTimeout(timer);
  }, [search, filter]);

  const handleUseAsset = (asset: LibraryAsset) => {
    const allUrls = asset.urls?.length ? asset.urls : [asset.url];
    const params = new URLSearchParams({
      assetId: asset.id,
      assetUrls: JSON.stringify(allUrls),
      assetType: asset.file_type,
      assetTitle: asset.title
    });
    router.push(`/publish?${params.toString()}`);
  };

  const handleDeleteAsset = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;

    try {
      await api.delete(`/api/v1/library/${id}`);
      
      // Optimistic update
      setAssets(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Common Media Library</h1>
          <p className="text-[var(--foreground-muted)]">Browse and pick assets uploaded by Creators to start publishing.</p>
        </div>
        
        <button 
          onClick={() => router.push('/library/upload')}
          className="bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] px-6 py-3 rounded-2xl font-medium transition-all flex items-center gap-2"
        >
          <ImageIcon className="w-5 h-5" />
          Add New Media
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Search by title or creator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--foreground)] focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
        </div>
        
        <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-2xl p-1">
          {['all', 'image', 'video'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                filter === t ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}s
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium flex items-center gap-3">
          <span>⚠</span>
          <span>{error}</span>
          <button onClick={fetchLibrary} className="ml-auto text-rose-300 hover:text-white underline text-xs">Retry</button>
        </div>
      )}

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-[var(--foreground-muted)]">Loading your library...</p>
        </div>
      ) : assets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {assets.map((asset) => (
            <div key={asset.id} className="group relative bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10">
              {/* Media Preview — shows carousel thumbnail with pack badge */}
              <div className="aspect-square relative overflow-hidden bg-black">
                {(() => {
                  const allUrls = asset.urls?.length ? asset.urls : [asset.url];
                  const primary = allUrls[0];
                  return (
                    <>
                      {asset.file_type === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <VideoIcon className="w-12 h-12 text-[var(--foreground-muted)]" />
                          <video className="absolute inset-0 w-full h-full object-cover opacity-60">
                            <source src={primary} type="video/mp4" />
                          </video>
                        </div>
                      ) : (
                        <img src={primary} alt={asset.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      )}
                      {allUrls.length > 1 && (
                        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {allUrls.length}
                        </div>
                      )}

                      {/* Delete Action - Only for Admin or Owner */}
                      {(userRole === 'ADMIN' || currentUserId === asset.uploader_id) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id, asset.title); }}
                          className="absolute top-3 right-3 p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl backdrop-blur-md border border-rose-500/20 transition-all opacity-0 group-hover:opacity-100 z-10"
                          title="Delete Asset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  );
                })()}

                {/* Overlay on hover - Only for Admin/Manager */}
                {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                    <button
                      onClick={() => handleUseAsset(asset)}
                      className="w-full bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300"
                    >
                      <Send className="w-4 h-4" />
                      Pick &amp; Publish
                    </button>
                  </div>
                )}
              </div>

              {/* Asset Info */}
              <div className="p-4">
                <h3 className="text-[var(--foreground)] font-semibold truncate mb-1">{asset.title}</h3>
                <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{asset.uploader?.full_name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDateTime(asset.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-[var(--card)]/30 rounded-3xl border border-dashed border-[var(--border)]">
          <div className="w-20 h-20 bg-[var(--card)] rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Filter className="text-[var(--foreground-muted)] w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">No assets found</h3>
          <p className="text-[var(--foreground-muted)] max-w-sm mx-auto">Try adjusting your search or ask Creators to upload new content.</p>
        </div>
      )}
    </div>
  );
}
