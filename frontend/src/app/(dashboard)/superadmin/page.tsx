"use client";

import { useState } from "react";
import { Plus, Shield, Building2, UserPlus, Mail, AlertCircle, CheckCircle2, X, ChevronRight, Globe, Lock } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { api } from "@/lib/api";

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    adminName: '',
    adminEmail: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Frontend validation for gmail
    if (formData.adminEmail.toLowerCase().endsWith('@gmail.com')) {
      setError("Gmail accounts are restricted. Please use a professional company domain.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/v1/superadmin/organizations', formData);
      setSuccess(`Organization "${formData.name}" has been successfully provisioned.`);
      setFormData({ name: '', adminName: '', adminEmail: '', password: '' });
    } catch (err: any) {
      setError(err.message || "Failed to create organization. Verify SuperAdmin privileges.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500">SuperAdmin Control Plane</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Platform Governance</h1>
          <p className="text-zinc-500 mt-2 text-lg font-medium">Manage enterprise organizations and secure access tiers across {BRAND.name}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-2xl">
            <div className="p-8 border-b border-zinc-800/50 bg-zinc-900/20">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Plus className="w-5 h-5 text-indigo-500" />
                Provision New Organization
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="space-y-6">
                {/* Org Name */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Organization Details</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      required
                      type="text"
                      placeholder="e.g. Acme Corporation"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Admin Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Master Admin Name</label>
                    <div className="relative group">
                      <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-500 transition-colors" />
                      <input 
                        required
                        type="text"
                        placeholder="Full Name"
                        value={formData.adminName}
                        onChange={(e) => setFormData({...formData, adminName: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Corporate Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-500 transition-colors" />
                      <input 
                        required
                        type="email"
                        placeholder="admin@company.com"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2 pt-4">
                  <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Initial Admin Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      required
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3 text-rose-500 animate-in fade-in duration-300">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                  <button type="button" onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4"/></button>
                </div>
              )}

              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-400 animate-in fade-in duration-300">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{success}</p>
                  <button type="button" onClick={() => setSuccess(null)} className="ml-auto"><X className="w-4 h-4"/></button>
                </div>
              )}

              <div className="pt-4">
                <button 
                  disabled={loading}
                  className="w-full md:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Globe className="w-5 h-5" />}
                  Deploy Organization
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-8 space-y-4">
            <h3 className="text-lg font-bold text-white">Security Protocol</h3>
            <p className="text-indigo-400/80 text-sm leading-relaxed">
              Provisioning an organization creates an isolated workspace with a dedicated RBAC hierarchy.
            </p>
            <ul className="space-y-3 pt-2">
              {[
                "Restricted to corporate domains",
                "Automatic Admin role assignment",
                "Encrypted workspace isolation"
              ].map(text => (
                <li key={text} className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                  <ChevronRight className="w-3 h-3 text-indigo-500" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8">
            <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-6">Recent Deployments</h3>
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Building2 className="w-10 h-10 text-zinc-800 mb-4" />
                <p className="text-zinc-600 text-xs font-medium italic">No organizations created yet in this session.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
