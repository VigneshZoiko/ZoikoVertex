"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  User, Shield, History, Save, Camera,
  Eye, EyeOff, AlertCircle, CheckCircle2, X, Monitor, Smartphone,
  ExternalLink, LogOut, ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRoleContext } from "@/lib/context/RoleContext";
import ConfirmActionModal from "@/components/ConfirmActionModal";

type Tab = "overview" | "security" | "access";

interface Profile {
  full_name: string;
  email: string;
  phone_number: string;
  avatar_url: string;
}

function formatRole(role: string | null): string {
  if (!role) return "—";
  return role
    .toLowerCase()
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface AccessLog {
  id: string;
  action: string;
  ip_address: string;
  user_agent: string;
  location: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { role } = useRoleContext();

  // Profile
  const [profile, setProfile] = useState<Profile>({
    full_name: "", email: "", phone_number: "", avatar_url: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Security
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);

  // Access logs
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [currentUA, setCurrentUA] = useState("");
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const geoRequested = useRef(false);

  useEffect(() => { setCurrentUA(navigator.userAgent); }, []);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };
  const [showSignOutAll, setShowSignOutAll] = useState(false);

  /* ── Load profile ─────────────────────────── */
  const loadProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);

    const { data } = await supabase
      .from("users")
      .select("full_name, phone_number, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const p: Profile = {
      full_name: data?.full_name ?? "",
      email: user.email ?? "",
      phone_number: data?.phone_number ?? "",
      avatar_url: data?.avatar_url ?? "",
    };
    setProfile(p);
    if (p.avatar_url) setAvatarPreview(p.avatar_url);

    setLoading(false);
  }, [router]);

  /* ── Load access logs ─────────────────────── */
  const loadAccessLogs = useCallback(async () => {
    if (!userId) return;
    setLogsLoading(true);

    // 1. Fetch latest 5
    const { data: latestFive } = await supabase
      .from("user_access_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (latestFive && latestFive.length > 0) {
      setAccessLogs(latestFive);
      
      // 2. Delete older logs (anything not in the latest 5 IDs)
      const latestIds = latestFive.map(l => l.id);
      await supabase
        .from("user_access_logs")
        .delete()
        .eq("user_id", userId)
        .not("id", "in", `(${latestIds.join(",")})`);
    } else {
      setAccessLogs([]);
    }

    setLogsLoading(false);
  }, [userId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => {
    if ((tab === "access" || tab === "security") && userId) loadAccessLogs();
  }, [tab, userId, loadAccessLogs]);

  /* ── Fetch location on Security tab ─────── */
  useEffect(() => {
    if (tab !== "security" || geoRequested.current) return;
    geoRequested.current = true;

    // Check localStorage cache first (valid for 1 hour)
    try {
      const cached = localStorage.getItem("zv_location");
      if (cached) {
        const { loc, ts } = JSON.parse(cached);
        if (Date.now() - ts < 3_600_000) {
          setCurrentLocation(loc);
          return;
        }
      }
    } catch { /* ignore */ }

    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const a = data.address;
          const parts = [
            a.city || a.town || a.village || a.county,
            a.state,
            a.country,
          ].filter(Boolean);
          const loc = parts.join(", ") || "Unknown location";
          setCurrentLocation(loc);
          localStorage.setItem("zv_location", JSON.stringify({ loc, ts: Date.now() }));
        } catch {
          setCurrentLocation("Location unavailable");
        } finally {
          setLocLoading(false);
        }
      },
      () => {
        setCurrentLocation("Permission denied");
        setLocLoading(false);
      },
      { timeout: 10000 }
    );
  }, [tab]);

  /* ── Save profile ──────────────────────────── */
  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("users").update({
      full_name: profile.full_name,
      phone_number: profile.phone_number,
    }).eq("id", userId);
    setSaving(false);
    if (error) showToast("error", "Failed to save: " + error.message);
    else showToast("success", "Profile updated successfully!");
  };

  /* ── Avatar upload ─────────────────────────── */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast("error", "Image must be less than 2MB");
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    
    const ext = file.name.split(".").pop();
    const path = `avatars/${userId}-${Date.now()}.${ext}`;
    
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadErr) { showToast("error", "Upload failed: " + uploadErr.message); return; }
    
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    
    await supabase.from("users").update({ avatar_url: publicUrl }).eq("id", userId);
    setProfile(p => ({ ...p, avatar_url: publicUrl }));
    showToast("success", "Profile picture updated!");
  };

  /* ── Change password ───────────────────────── */
  const changePassword = async () => {
    if (!pwForm.newPw || !pwForm.confirm) {
      showToast("error", "Please fill in all fields."); return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      showToast("error", "Passwords do not match."); return;
    }
    if (pwForm.newPw.length < 8) {
      showToast("error", "Minimum 8 characters required."); return;
    }
    
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    setPwSaving(false);
    
    if (error) showToast("error", error.message);
    else {
      showToast("success", "Password updated successfully!");
      setPwForm({ current: "", newPw: "", confirm: "" });
      if (userId) {
        await supabase.from("user_access_logs").insert({
          user_id: userId, action: "password_change", ip_address: "—", user_agent: navigator.userAgent
        });
      }
    }
  };

  /* ── Remove a log entry ───────────────────── */
  const removeLog = async (logId: string) => {
    await supabase.from("user_access_logs").delete().eq("id", logId);
    setAccessLogs(prev => prev.filter(l => l.id !== logId));
  };

  /* ── Sign out ──────────────────────────── */
  const signOutCurrent = async () => {
    // scope: 'local' = current session only | scope: 'global' = all sessions
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
  };

  const signOutAll = async () => {
    setShowSignOutAll(true);
  };

  const confirmSignOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    router.push("/login");
  };

  const initials = profile.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : profile.email?.[0]?.toUpperCase() ?? "?";

  const formatDate = (iso: string) => 
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // Parse a user-agent string into a human-readable label
  const parseUA = (ua: string) => {
    const isMobile = /iphone|android|mobile/i.test(ua);
    let os = "Unknown OS";
    let browser = "Unknown Browser";
    if (/windows/i.test(ua)) os = "Windows";
    else if (/macintosh|mac os/i.test(ua)) os = "macOS";
    else if (/linux/i.test(ua)) os = "Linux";
    else if (/iphone/i.test(ua)) os = "iPhone";
    else if (/android/i.test(ua)) os = "Android";
    if (/edg\//i.test(ua)) browser = "Edge";
    else if (/opr\//i.test(ua)) browser = "Opera";
    else if (/chrome/i.test(ua)) browser = "Chrome";
    else if (/safari/i.test(ua)) browser = "Safari";
    else if (/firefox/i.test(ua)) browser = "Firefox";
    return { label: `${os} · ${browser}`, isMobile };
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "security", label: "Security" },
    { id: "access", label: "Access" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-info-border/20 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border animate-in slide-in-from-right-4 duration-300 ${
          toast.type === "success"
            ? "bg-success-text/10 border-success-border/30 text-success-text"
            : "bg-error-text/10 border-error-border/30 text-error-text"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <p className="text-sm font-medium">{toast.msg}</p>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Tabs Navigation (Screenshot Style) */}
      <div className="relative flex items-center gap-8 border-b border-[var(--border)] mb-8 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 py-4 text-sm font-semibold transition-all whitespace-nowrap ${
              tab === t.id
                ? "text-[var(--foreground)]"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t.label}
            {tab === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-info-text rounded-full animate-tab-line" />
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────── */}
      {tab === "overview" && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden animate-content-fade">
          <div className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-[var(--foreground-muted)]" />
              <h2 className="text-base font-bold text-[var(--foreground)]">Personal Information</h2>
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-6 py-2 bg-[#1a365d] hover:bg-[#1e3a8a] disabled:opacity-60 text-foreground text-sm font-bold rounded-lg transition-all active:scale-95 shadow-md"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[var(--foreground)]">Full Name</label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-info-border transition-colors"
                  placeholder="Vignesh"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[var(--foreground)]">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  className="w-full bg-[var(--surface)]/50 border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--foreground-muted)] outline-none cursor-not-allowed"
                />
                <p className="text-xs text-[var(--foreground-muted)]">Email is your login identity and can&apos;t be changed here.</p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[var(--foreground)]">Phone Number</label>
                <input
                  type="tel"
                  value={profile.phone_number}
                  onChange={e => setProfile(p => ({ ...p, phone_number: e.target.value }))}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-info-border transition-colors"
                  placeholder="+1 555 123 4567"
                />
              </div>

              {/* Designation — auto-fetched from workspace role */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[var(--foreground)]">Designation</label>
                <input
                  type="text"
                  value={formatRole(role)}
                  readOnly
                  className="w-full bg-[var(--surface)]/50 border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--foreground-muted)] outline-none cursor-not-allowed"
                />
                <p className="text-xs text-[var(--foreground-muted)]">Set by your workspace role assignment.</p>
              </div>
            </div>

            {/* Profile Picture Footer (Screenshot Style) */}
            <div className="flex items-center gap-6 pt-8 border-t border-[var(--border)]">
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <div className="w-16 h-16 rounded-full overflow-hidden bg-[#002b4e] flex items-center justify-center text-foreground text-2xl font-bold border-2 border-[var(--border)] shadow-inner">
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt="Avatar" fill className="object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5 text-foreground" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">Profile picture</p>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">PNG, JPG, or WebP — automatically resized to 256×256.</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ─────────────────────────── */}
      {tab === "security" && (
        <div className="space-y-6 animate-content-fade">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm">
            <div className="px-8 py-6 border-b border-[var(--border)] flex items-center gap-3">
              <Shield className="w-5 h-5 text-[var(--foreground-muted)]" />
              <h2 className="text-base font-bold text-[var(--foreground)]">Change Password</h2>
            </div>
            <div className="p-8">
              <div className="space-y-6 max-w-4xl">
                <div>
                  <label className="block text-sm font-bold text-[var(--foreground)] mb-2">Current Password</label>
                  <input
                    type="password"
                    value={pwForm.current}
                    onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-info-border transition-colors"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-[var(--foreground)] mb-2">New Password</label>
                    <input
                      type="password"
                      value={pwForm.newPw}
                      onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-info-border transition-colors"
                    />
                    <p className="text-xs text-[var(--foreground-muted)] mt-1.5">At least 8 characters, with both letters and numbers.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--foreground)] mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={pwForm.confirm}
                      onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-info-border transition-colors"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-[var(--foreground-muted)]">Updating your password signs you out of every other device automatically.</p>
                  <button
                    onClick={changePassword}
                    disabled={pwSaving}
                    className="px-6 py-2.5 bg-[#8b949e] hover:bg-info-text text-foreground text-sm font-bold rounded-lg transition-all active:scale-95 shadow-sm"
                  >
                    {pwSaving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-[var(--foreground-muted)]" />
                <h2 className="text-base font-bold text-[var(--foreground)]">
                  Recent Sessions ({1 + accessLogs.filter(l => l.action === 'sign_in').length})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={signOutAll}
                  className="text-xs font-bold text-error-text hover:text-error-text hover:bg-error-text/10 px-3 py-2 rounded-lg border border-error-border/20 transition-all"
                >
                  Sign Out All
                </button>
                <button
                  onClick={loadAccessLogs}
                  className="text-sm font-bold text-[var(--foreground)] hover:text-info-text transition-colors border border-[var(--border)] px-4 py-2 rounded-lg bg-[var(--surface)]"
                >
                  Refresh list
                </button>
              </div>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {logsLoading ? (
                <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-info-border border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <>
                  {/* Always show current device first */}
                  {currentUA && (() => {
                    const { label, isMobile } = parseUA(currentUA);
                    return (
                      <div className="px-8 py-4 flex items-center justify-between hover:bg-[var(--surface)]/30 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)]">
                            {isMobile ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-[var(--foreground)]">{label}</p>
                              <span className="text-[10px] font-black bg-success-text/10 text-success-text px-2 py-0.5 rounded-full uppercase tracking-tight">Active Now</span>
                            </div>
                            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                              {locLoading
                                ? "Locating..."
                                : currentLocation
                                  ? `${currentLocation} · Current Session`
                                  : "Current Session"
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Historical sign_in logs */}
                  {accessLogs.filter(l => l.action === 'sign_in').map((session) => {
                    const { label, isMobile } = parseUA(session.user_agent);
                    return (
                      <div key={session.id} className="px-8 py-4 flex items-center justify-between hover:bg-[var(--surface)]/30 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)]">
                            {isMobile ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[var(--foreground)]">{label}</p>
                            <p className="text-xs text-[var(--foreground-muted)] mt-0.5 flex items-center gap-1.5 flex-wrap">
                              {session.location && <span>{session.location}</span>}
                              {session.location && <span className="opacity-30">·</span>}
                              <span>{formatDate(session.created_at)}</span>
                              <span className="opacity-30">·</span>
                              <span>IP: {session.ip_address}</span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeLog(session.id)}
                          className="text-xs font-semibold text-[var(--foreground-muted)] hover:text-error-text hover:bg-error-text/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-error-border/20 transition-all opacity-0 group-hover:opacity-100"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ACCESS TAB ───────────────────────────── */}
      {tab === "access" && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden animate-content-fade">
          <div className="px-8 py-6 border-b border-[var(--border)] flex items-center gap-3">
            <History className="w-5 h-5 text-[var(--foreground-muted)]" />
            <h2 className="text-base font-bold text-[var(--foreground)]">Access History</h2>
          </div>
          <div className="p-0 divide-y divide-[var(--border)]">
            {logsLoading ? (
              <div className="p-12 flex justify-center"><div className="w-6 h-6 border-2 border-info-border border-t-transparent rounded-full animate-spin" /></div>
            ) : accessLogs.length === 0 ? (
              <div className="p-12 text-center text-[var(--foreground-muted)]">No activity recorded yet.</div>
            ) : (
              accessLogs.map(log => (
                <div key={log.id} className="px-8 py-6 flex items-start justify-between hover:bg-[var(--surface)]/30 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-info-text mt-2.5 shrink-0" />
                    <div>
                      <p className="text-base font-bold text-[var(--foreground)] capitalize">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-sm text-[var(--foreground-muted)] mt-1 font-medium flex items-center gap-1.5 flex-wrap">
                        {log.location && <span>{log.location}</span>}
                        {log.location && <span className="opacity-30">·</span>}
                        {log.ip_address !== "—" && <span>{log.ip_address}</span>}
                        {log.ip_address !== "—" && <span className="opacity-30">·</span>}
                        <span className="opacity-70 text-[10px] uppercase">{log.user_agent.split(' ').slice(-2).join(' ')}</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-[var(--foreground-muted)] shrink-0 ml-8">{formatDate(log.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <ConfirmActionModal
        open={showSignOutAll}
        variant="warning"
        title="Sign Out All Devices"
        message="Sign out from ALL devices? This will invalidate every active session."
        confirmLabel="Sign Out All"
        onConfirm={confirmSignOutAll}
        onCancel={() => setShowSignOutAll(false)}
      />
    </div>
  );
}
