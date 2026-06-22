"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Filter, Image as ImageIcon, Video as VideoIcon,
  ExternalLink, Send, Trash2, Loader2, User, Calendar, Eye, X
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { api } from "@/lib/api";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import { MediaPreview } from "@/components/MediaPreview";

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
  const [deleteAsset, setDeleteAsset] = useState<{id: string, title: string} | null>(null);
  const [previewAsset, setPreviewAsset] = useState<LibraryAsset | null>(null);

  useEffect(() => {
    const fetchUserContext = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      try {
        const result = await api.get('/api/v1/user/context');
        if (result.success && result.data?.role) {
          setUserRole(result.data.role);
          return;
        }
      } catch {
        // fall through to Supabase direct query
      }

      // Fallback: query workspace_members directly
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (member?.role) {
        setUserRole(member.role);
      } else {
        // Superadmin with no membership row still gets full access
        const { data: userData } = await supabase
          .from('users')
          .select('is_superadmin')
          .eq('id', user.id)
          .single();
        if (userData?.is_superadmin) setUserRole('ADMIN');
      }
    };
    fetchUserContext();
  }, []);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/api/v1/library?search=${encodeURIComponent(search)}&type=${filter}`);
      setAssets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to fetch library", err);
      setError('Failed to load library. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const timer = setTimeout(fetchLibrary, 300);
    return () => clearTimeout(timer);
  }, [search, filter, fetchLibrary]);

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
    setDeleteAsset({ id, title });
  };

  const confirmDeleteAsset = async () => {
    if (!deleteAsset) return;
    try {
      await api.delete(`/api/v1/library/${deleteAsset.id}`);
      setAssets(prev => prev.filter(a => a.id !== deleteAsset.id));
    } catch (err: any) {
      setError('Failed to delete asset. Please try again.');
    }
    finally { setDeleteAsset(null); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
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
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--foreground)] focus:ring-2 focus:ring-info-text transition-all outline-none"
          />
        </div>

        <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-2xl p-1">
          {['all', 'image', 'video'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${filter === t ? 'bg-info-text text-foreground shadow-lg shadow-info-text/20' : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}s
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-error-text/10 border border-error-border/20 text-error-text text-sm font-medium flex items-center gap-3">
          <span>⚠</span>
          <span>{error}</span>
          <button onClick={fetchLibrary} className="ml-auto text-error-text hover:text-white underline text-xs">Retry</button>
        </div>
      )}

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 text-info-text animate-spin" />
          <p className="text-[var(--foreground-muted)]">Loading your library...</p>
        </div>
      ) : assets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {assets.map((asset) => (
            <div key={asset.id} className="group relative bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden hover:border-info-border/50 transition-all hover:shadow-2xl hover:shadow-info-text/10">
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
                          <video className="absolute inset-0 w-full h-full object-cover opacity-60" onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = 'none'; }}>
                            <source src={primary} type="video/mp4" />
                          </video>
                        </div>
                      ) : (
                        <MediaPreview
                          src={primary}
                          alt={asset.title}
                          className="absolute inset-0 w-full h-full group-hover:scale-110 transition-transform duration-500"
                          fit="cover"
                        />
                      )}
                      {allUrls.length > 1 && (
                        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-foreground text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {allUrls.length}
                        </div>
                      )}

                      {/* Delete Action - Only for Admin or Owner */}
                      {(['ADMIN','WORKSPACE_OWNER'].includes(userRole ?? '') || currentUserId === asset.uploader_id) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id, asset.title); }}
                          className="absolute top-3 right-3 p-2 bg-error-text/10 hover:bg-error-text text-error-text hover:text-white rounded-xl backdrop-blur-md border border-error-border/20 transition-all opacity-0 group-hover:opacity-100 z-10"
                          title="Delete Asset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  );
                })()}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6 gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewAsset(asset); }}
                    className="w-full bg-black/60 backdrop-blur-sm text-white border border-white/20 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-black/80 hover:border-white/40 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  {userRole !== 'VIEWER' && (
                    <button
                      onClick={() => handleUseAsset(asset)}
                      className="w-full bg-white text-black py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-info-text hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300 delay-75"
                    >
                      <Send className="w-4 h-4" />
                      {['ADMIN', 'MANAGER', 'WORKSPACE_OWNER', 'CAMPAIGN_MANAGER', 'PUBLISHER'].includes(userRole ?? '')
                        ? 'Pick & Publish'
                        : 'Use in Post'}
                    </button>
                  )}
                </div>
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
      {/* Preview Modal */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/95 backdrop-blur-md" onClick={() => setPreviewAsset(null)}>
          <div className="relative w-full max-w-5xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="w-full flex justify-end mb-4">
              <button 
                onClick={() => setPreviewAsset(null)}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden flex items-center justify-center w-full bg-black/40 border border-white/10 shadow-2xl min-h-[200px]">
              <MediaPreview
                src={previewAsset.url}
                alt={previewAsset.title}
                type={previewAsset.file_type === 'video' ? 'video' : 'image'}
                className="max-w-full max-h-[65vh] w-full"
                fit="contain"
                controls={previewAsset.file_type === 'video'}
                autoPlay={previewAsset.file_type === 'video'}
              />
            </div>
            <div className="w-full mt-4 flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center text-white bg-[#111] p-5 rounded-2xl border border-white/10 shadow-xl">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-xl font-bold truncate">{previewAsset.title}</h2>
                <p className="text-xs text-[#888] mt-1.5 truncate">
                   {previewAsset.file_type.toUpperCase()} • Uploaded by {previewAsset.uploader?.full_name || 'Unknown'}
                </p>
              </div>
              {userRole !== 'VIEWER' && (
                <button
                  onClick={() => handleUseAsset(previewAsset)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap"
                >
                  <Send className="w-4 h-4" /> Pick & Publish
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={!!deleteAsset}
        variant="danger"
        title="Delete asset?"
        message={deleteAsset ? `Are you sure you want to delete "${deleteAsset.title}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={confirmDeleteAsset}
        onCancel={() => setDeleteAsset(null)}
      />
    </div>
  );
}
