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
  Mail,
  ArrowUpCircle
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
  const [tabFilter, setTabFilter] = useState<'all' | 'active' | 'paused' | 'restricted'>('all');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [openMenuOrgId, setOpenMenuOrgId] = useState<string | null>(null);
  const [upgradeOrgId, setUpgradeOrgId] = useState<string | null>(null);
  const [upgradePlanType, setUpgradePlanType] = useState<string>('GROWTH');
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'restrict' | 'delete' | 'pause';
    orgId: string;
    orgName: string;
  } | null>(null);
  const [dropdownUpward, setDropdownUpward] = useState(false);


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
    const org = organizations.find(o => o.id === orgId);
    setConfirmDialog({ type: 'pause', orgId, orgName: org?.name || 'Unknown' });
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

  const handleDelete = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    setConfirmDialog({ type: 'delete', orgId, orgName: org?.name || 'Unknown' });
  };

  const handleRestrict = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    setOpenMenuOrgId(null);
    setConfirmDialog({ type: 'restrict', orgId, orgName: org?.name || 'Unknown' });
  };

  const handleUpgradePlan = async () => {
    if (!upgradeOrgId) return;
    const orgName = organizations.find(o => o.id === upgradeOrgId)?.name || 'this organization';
    if (!confirm(`Upgrade ${orgName} to ${upgradePlanType} plan?`)) return;
    setActionLoading(upgradeOrgId);
    setUpgradeOrgId(null);
    setOrganizations(current => current.map(o =>
      o.id === upgradeOrgId ? { ...o, plan_type: upgradePlanType, status: 'ACTIVE' } : o
    ));
    try {
      await api.put(`/api/v1/superadmin/organizations/${upgradeOrgId}/plan`, { planType: upgradePlanType });
      setSuccess(`Organization upgraded to ${upgradePlanType}.`);
    } catch {
      setError("Failed to upgrade plan.");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (!openMenuOrgId) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-menu]')) {
        setOpenMenuOrgId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuOrgId]);

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

  const executeConfirmAction = async () => {
    if (!confirmDialog) return;
    const { type, orgId } = confirmDialog;
    setConfirmDialog(null);
    setActionLoading(orgId);
    if (type === 'delete') {
      setOrganizations(current => current.map(o => o.id === orgId ? { ...o, status: 'DELETED' } : o));
      try {
        await api.delete(`/api/v1/superadmin/organizations/${orgId}`);
        setSuccess("Organization permanently banned and all data purged.");
      } catch (err) {
        setOrganizations(current => current.map(o => o.id === orgId ? { ...o, status: 'ACTIVE' } : o));
        setError("Deletion failed. Organization may have active dependencies.");
      } finally {
        setActionLoading(null);
      }
    } else if (type === 'restrict') {
      setOrganizations(current => current.map(o => o.id === orgId ? { ...o, status: 'RESTRICTED' } : o));
      try {
        await api.post(`/api/v1/superadmin/organizations/${orgId}/restrict`, {});
        setSuccess("Organization temporarily banned.");
      } catch {
        setOrganizations(current => current.map(o => o.id === orgId ? { ...o, status: 'ACTIVE' } : o));
        setError("Failed to restrict organization.");
      } finally {
        setActionLoading(null);
      }
    } else if (type === 'pause') {
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
    }
  };

  const activeOrgs = organizations.filter(o => o.status === 'ACTIVE');
  const pausedOrgs = organizations.filter(o => o.status === 'SUSPENDED');
  const restrictedOrgs = organizations.filter(o => o.status === 'RESTRICTED');

  const filteredOrgs = organizations.filter(org => {
    if (tabFilter === 'active') return org.status === 'ACTIVE';
    if (tabFilter === 'paused') return org.status === 'SUSPENDED';
    if (tabFilter === 'restricted') return org.status === 'RESTRICTED';
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
            <div className="text-xl font-semibold text-[var(--foreground)]">{organizations.filter(o => o.status !== 'DELETED').length}</div>
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
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg">
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
                onClick={() => setTabFilter('restricted')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  tabFilter === 'restricted'
                    ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
                    : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Restricted {restrictedOrgs.length}
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

        <div className="overflow-x-auto overflow-y-visible relative z-10">
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
                            : org.status === 'RESTRICTED'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                              : org.status === 'DELETED'
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                : 'bg-[var(--surface)] text-[var(--foreground-muted)]'
                      }`}>
                        {org.status === 'SUSPENDED' ? 'Paused' : org.status === 'RESTRICTED' ? 'Restricted' : org.status.charAt(0) + org.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[var(--foreground-muted)] align-top">{org.memberCount}</td>
                    <td className="px-5 py-3.5 align-top">
                      <span className="text-xs text-[var(--foreground-muted)]">{org.plan_type || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right align-top">
                      <div className="flex items-center justify-end gap-1">
                        {org.status === 'ACTIVE' ? (
                          <button 
                            onClick={() => handlePause(org.id)}
                            disabled={!!actionLoading}
                            className="p-1.5 bg-[var(--background)] hover:bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded transition-colors"
                            title="Pause"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        ) : org.status === 'RESTRICTED' ? (
                          <button 
                            onClick={() => handleRestore(org.id)}
                            disabled={!!actionLoading}
                            className="px-2.5 py-1.5 bg-[var(--background)] hover:bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </button>
                        ) : org.status === 'SUSPENDED' ? (
                          <button 
                            onClick={() => handleResume(org.id)}
                            disabled={!!actionLoading}
                            className="p-1.5 bg-[var(--background)] hover:bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded transition-colors"
                            title="Resume"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                        {org.status !== 'DELETED' && (
                          <button
                            onClick={() => { setUpgradeOrgId(org.id); setUpgradePlanType(org.plan_type === 'ENTERPRISE' ? 'ENTERPRISE' : org.plan_type === 'GROWTH' ? 'ENTERPRISE' : 'GROWTH'); }}
                            disabled={!!actionLoading}
                            className="p-1.5 bg-[var(--background)] hover:bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-indigo-500 border border-[var(--border)] rounded transition-colors"
                            title="Upgrade Plan"
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {org.status !== 'DELETED' && (
                        <div className="relative" data-dropdown-menu>
                          <button
                            onClick={(e) => {
                              const willOpen = openMenuOrgId !== org.id;
                              if (willOpen) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDropdownUpward(window.innerHeight - rect.bottom < 180);
                              }
                              setOpenMenuOrgId(willOpen ? org.id : null);
                            }}
                            className="p-1.5 bg-[var(--background)] hover:bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded transition-colors"
                            title="More"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {openMenuOrgId === org.id && (
                            <div className={`absolute right-0 z-50 w-44 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl py-1 overflow-hidden ${
                              dropdownUpward ? 'bottom-full mb-1' : 'top-full mt-1'
                            }`}>
                              <button
                                onClick={() => { setOpenMenuOrgId(null); handleDelete(org.id); }}
                                disabled={!!actionLoading}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-left text-red-600 dark:text-red-400 hover:bg-[var(--surface-hover)] transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Organization
                              </button>
                              <button
                                onClick={() => handleRestrict(org.id)}
                                disabled={!!actionLoading}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-left text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                              >
                                <Shield className="w-3.5 h-3.5" />
                                Restrict Organization
                              </button>
                            </div>
                          )}
                        </div>
                      )}
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
                          : tabFilter === 'restricted'
                            ? 'No restricted organizations.'
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

      {/* Upgrade Plan Modal */}
      {upgradeOrgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setUpgradeOrgId(null)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Upgrade Plan</h3>
            <p className="text-xs text-[var(--foreground-muted)] mb-4">
              {organizations.find(o => o.id === upgradeOrgId)?.name}
            </p>
            <div className="flex flex-col gap-1.5 mb-4">
              {[
                { value: 'STARTER', label: 'Vertex Starter (FREE)' },
                { value: 'GROWTH', label: 'Vertex Growth ($399/mo)' },
                { value: 'ENTERPRISE', label: 'Vertex Enterprise ($999/mo)' },
              ].map(p => (
                <label
                  key={p.value}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    upgradePlanType === p.value
                      ? 'border-indigo-500 bg-indigo-500/10 text-[var(--foreground)]'
                      : 'border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="planType"
                    value={p.value}
                    checked={upgradePlanType === p.value}
                    onChange={() => setUpgradePlanType(p.value)}
                    className="accent-indigo-500"
                  />
                  <span className="text-xs font-medium">{p.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setUpgradeOrgId(null)}
                className="px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgradePlan}
                disabled={!!actionLoading}
                className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-foreground rounded text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmDialog(null)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
              confirmDialog.type === 'delete'
                ? 'bg-rose-500/10 text-rose-400 shadow-rose-500/10'
                : confirmDialog.type === 'pause'
                  ? 'bg-amber-500/10 text-amber-400 shadow-amber-500/10'
                  : 'bg-amber-500/10 text-amber-400 shadow-amber-500/10'
            }`}>
              {confirmDialog.type === 'delete' ? <Trash2 className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
            </div>
            <h3 className="text-sm font-semibold text-[var(--foreground)] text-center mb-2">
              {confirmDialog.type === 'delete' ? 'Permanent Ban' : confirmDialog.type === 'pause' ? 'Pause Organization' : 'Temporary Ban'}
            </h3>
            <p className="text-xs text-[var(--foreground-muted)] text-center mb-1">
              <span className="text-[var(--foreground)] font-semibold">{confirmDialog.orgName}</span>
            </p>
            <p className="text-xs text-[var(--foreground-muted)] text-center mb-5">
              {confirmDialog.type === 'delete'
                ? 'This is a permanent ban. The organization and ALL associated workspace data will be deleted across the entire platform. This action cannot be undone.'
                : confirmDialog.type === 'pause'
                  ? 'This will pause the organization and restrict all associated workspaces until resumed.'
                  : 'This is a temporary ban. The organization will lose all access until restored by an administrator.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmAction}
                disabled={!!actionLoading}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                  confirmDialog.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-500 text-foreground'
                    : 'bg-amber-600 hover:bg-amber-500 text-foreground'
                }`}
              >
                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {confirmDialog.type === 'delete' ? 'Permanently Delete' : confirmDialog.type === 'pause' ? 'Pause' : 'Temporarily Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

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
