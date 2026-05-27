'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  ChevronRight, 
  Loader2, 
  Pause, 
  Play, 
  Trash2, 
  Search, 
  MoreHorizontal,
  Users,
  RotateCcw,
  Mail
} from 'lucide-react';
import { api } from '@/lib/api';

export default function PlatformAnalytics() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tabFilter, setTabFilter] = useState<'all' | 'active' | 'paused' | 'deleted'>('all');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const fetchData = async () => {
    setFetching(true);
    try {
      const result = await api.get('/api/v1/superadmin/analytics');
      if (result.success) {
        setOrganizations(result.data);
        setStats(result.stats);
      }
    } catch (err) {
      console.error("Failed to fetch superadmin data", err);
      setError("Failed to synchronize platform data. Check connectivity.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!success && !error) return;
    const timer = setTimeout(() => { setSuccess(null); setError(null); }, 2000);
    return () => clearTimeout(timer);
  }, [success, error]);

  const handlePause = async (orgId: string) => {
    if (!confirm("Are you sure you want to pause this organization? All associated workspaces will be restricted.")) return;
    setActionLoading(orgId);
    setOrganizations(current => current.map(o => o.id === orgId ? { ...o, status: 'SUSPENDED' } : o));
    try {
      await api.post(`/api/v1/superadmin/organizations/${orgId}/pause`, {});
      setSuccess("Organization paused. All workspaces restricted.");
    } catch (err) {
      setOrganizations(current => current.map(o => o.id === orgId ? { ...o, status: 'ACTIVE' } : o));
      setError("Failed to pause organization.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (orgId: string) => {
    setActionLoading(orgId);
    setOrganizations(current => current.map(o => o.id === orgId ? { ...o, status: 'ACTIVE' } : o));
    try {
      await api.post(`/api/v1/superadmin/organizations/${orgId}/resume`, {});
      setSuccess("Organization resumed. Normal operations restored.");
    } catch (err) {
      setOrganizations(current => current.map(o => o.id === orgId ? { ...o, status: 'SUSPENDED' } : o));
      setError("Failed to resume organization.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm("Are you absolutely sure? This will delete the organization and ALL associated workspace data across the entire platform.")) return;
    setActionLoading(orgId);
    setOrganizations(current => current.map(o => o.id === orgId ? { ...o, status: 'DELETED' } : o));
    try {
      await api.delete(`/api/v1/superadmin/organizations/${orgId}`);
      setSuccess("Organization and all metadata purged successfully.");
    } catch (err) {
      setOrganizations(current => current.map(o => o.id === orgId ? { ...o, status: 'ACTIVE' } : o));
      setError("Deletion failed. Organization may have active dependencies.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (orgId: string) => {
    setActionLoading(orgId);
    setOrganizations(current => current.map(o => o.id === orgId ? { ...o, status: 'ACTIVE' } : o));
    try {
      await api.post(`/api/v1/superadmin/organizations/${orgId}/restore`, {});
      setSuccess("Organization restored and reactivated.");
    } catch (err) {
      setOrganizations(current => current.map(o => o.id === orgId ? { ...o, status: 'DELETED' } : o));
      setError("Failed to restore organization.");
    } finally {
      setActionLoading(null);
    }
  };

  const activeOrgs = organizations.filter(o => o.status === 'ACTIVE');
  const pausedOrgs = organizations.filter(o => o.status === 'SUSPENDED');
  const deletedOrgs = organizations.filter(o => o.status === 'DELETED');

  const filteredOrgs = organizations.filter(org => {
    if (tabFilter === 'active') return org.status === 'ACTIVE';
    if (tabFilter === 'paused') return org.status === 'SUSPENDED';
    if (tabFilter === 'deleted') return org.status === 'DELETED';
    return org.status !== 'DELETED';
  }).filter(org => 
    org.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Platform Overview</h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-0.5">SuperAdmin console for organization management</p>
        </div>
        <div className="px-3 py-1 rounded text-xs font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)]">
          ADMIN
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3.5">
            <div className="text-xs text-[var(--foreground-muted)] mb-0.5">Organizations</div>
            <div className="text-xl font-semibold text-[var(--foreground)]">{organizations.length}</div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3.5">
            <div className="text-xs text-[var(--foreground-muted)] mb-0.5">Users</div>
            <div className="text-xl font-semibold text-[var(--foreground)]">{stats.totalUsers}</div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3.5">
            <div className="text-xs text-[var(--foreground-muted)] mb-0.5">Posts</div>
            <div className="text-xl font-semibold text-[var(--foreground)]">{stats.totalPosts}</div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3.5">
            <div className="text-xs text-[var(--foreground-muted)] mb-0.5">Storage</div>
            <div className="text-xl font-semibold text-emerald-500">Healthy</div>
          </div>
        </div>
      )}

      {/* Organization Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Organizations</h2>
            <div className="flex bg-[var(--background)] rounded-md p-0.5 border border-[var(--border)]">
              <button
                onClick={() => setTabFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  tabFilter === 'all'
                    ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
                    : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                All {organizations.filter(o => o.status !== 'DELETED').length}
              </button>
              <button
                onClick={() => setTabFilter('active')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  tabFilter === 'active'
                    ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
                    : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Active {activeOrgs.length}
              </button>
              <button
                onClick={() => setTabFilter('paused')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  tabFilter === 'paused'
                    ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
                    : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Paused {pausedOrgs.length}
              </button>
              <button
                onClick={() => setTabFilter('deleted')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  tabFilter === 'deleted'
                    ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
                    : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Deleted {deletedOrgs.length}
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--foreground-muted)]" />
            <input 
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)] rounded-md py-1.5 pl-8 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none w-full md:w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-5 py-3 text-xs font-medium text-[var(--foreground-muted)]">Organization</th>
                <th className="px-5 py-3 text-xs font-medium text-[var(--foreground-muted)]">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-[var(--foreground-muted)]">Members</th>
                <th className="px-5 py-3 text-xs font-medium text-[var(--foreground-muted)]">Plan</th>
                <th className="px-5 py-3 text-xs font-medium text-[var(--foreground-muted)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {fetching ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 text-[var(--foreground-muted)] animate-spin" />
                      <p className="text-sm text-[var(--foreground-muted)]">Loading...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredOrgs.length > 0 ? (
                filteredOrgs.map(org => (
                  <tr key={org.id} className={`hover:bg-[var(--background)] transition-colors ${selectedOrgId === org.id ? 'bg-[var(--background)]' : ''}`}>
                    <td className="px-5 py-3.5 align-top">
                      <div 
                        className="flex flex-col cursor-pointer"
                        onClick={() => setSelectedOrgId(selectedOrgId === org.id ? null : org.id)}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-[var(--foreground)]">{org.name}</span>
                          <ChevronRight className={`w-3 h-3 text-[var(--foreground-muted)] transition-transform ${selectedOrgId === org.id ? 'rotate-90' : ''}`} />
                        </div>
                        
                        {selectedOrgId === org.id && (
                          <div className="mt-2.5 pt-2.5 border-t border-[var(--border)] space-y-1.5">
                            {org.adminName && (
                              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                                <Mail className="w-3 h-3" />
                                <span>{org.adminName}{org.adminEmail ? ` — ${org.adminEmail}` : ''}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                              <Users className="w-3 h-3" />
                              <span>{org.memberCount} member{org.memberCount !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 align-top">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        org.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                          : org.status === 'SUSPENDED'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : org.status === 'DELETED'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                              : 'bg-[var(--surface)] text-[var(--foreground-muted)]'
                      }`}>
                        {org.status === 'SUSPENDED' ? 'Paused' : org.status.charAt(0) + org.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[var(--foreground-muted)] align-top">{org.memberCount}</td>
                    <td className="px-5 py-3.5 align-top">
                      <span className="text-xs text-[var(--foreground-muted)]">{org.plan_type || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right align-top">
                      <div className="flex items-center justify-end gap-1">
                        {org.status === 'DELETED' ? (
                          <button 
                            onClick={() => handleRestore(org.id)}
                            disabled={!!actionLoading}
                            className="px-2.5 py-1.5 bg-[var(--background)] hover:bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </button>
                        ) : (
                          <>
                            {org.status === 'ACTIVE' ? (
                              <button 
                                onClick={() => handlePause(org.id)}
                                disabled={!!actionLoading}
                                className="p-1.5 bg-[var(--background)] hover:bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded transition-colors"
                                title="Pause"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleResume(org.id)}
                                disabled={!!actionLoading}
                                className="p-1.5 bg-[var(--background)] hover:bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded transition-colors"
                                title="Resume"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDelete(org.id)}
                              disabled={!!actionLoading}
                              className="p-1.5 bg-[var(--background)] hover:bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-red-500 border border-[var(--border)] rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button className="p-1.5 bg-[var(--background)] hover:bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded transition-colors">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <p className="text-sm text-[var(--foreground-muted)]">
                      {tabFilter === 'paused'
                        ? 'No paused organizations.'
                        : tabFilter === 'active'
                          ? 'No active organizations.'
                          : tabFilter === 'deleted'
                            ? 'No deleted organizations.'
                            : `No results for "${searchTerm}"`
                      }
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between">
          <p className="text-xs text-[var(--foreground-muted)]">
            {filteredOrgs.length} of {organizations.filter(o => o.status !== 'DELETED').length}
          </p>
          <div className="flex gap-1">
            <button className="px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded text-xs text-[var(--foreground-muted)] disabled:opacity-40" disabled>Prev</button>
            <button className="px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded text-xs text-[var(--foreground-muted)] disabled:opacity-40" disabled>Next</button>
          </div>
        </div>
      </div>

      {/* Governance Note */}
      <div className="border border-[var(--border)] rounded-lg px-5 py-3.5">
        <div className="flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-[var(--foreground-muted)] mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
            SuperAdmin view. Individual content, media files, and private workspace activity are isolated from this console.
          </p>
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/80 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm pointer-events-auto border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm pointer-events-auto border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-2"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
