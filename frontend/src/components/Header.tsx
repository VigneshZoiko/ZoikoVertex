"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  ShieldCheck,
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  FileText,
  Shield,
  MessageSquare,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationPanel from "@/components/NotificationPanel";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useRoleContext } from "@/lib/context/RoleContext";
import { canAccessSimple } from "@/lib/routeAccess";

interface SearchItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  keywords?: string;
}

const allRoutes: SearchItem[] = [
  // Overview
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, keywords: "home overview main" },
  { label: "Operations", href: "/agents/operations", icon: <Settings className="w-4 h-4" />, keywords: "manage control" },

  // Publishing
  { label: "Campaigns", href: "/campaigns", icon: <BarChart3 className="w-4 h-4" />, keywords: "create campaign new add marketing" },
  { label: "Calendar", href: "/calendar", icon: <FileText className="w-4 h-4" />, keywords: "schedule date planner" },
  { label: "Inbox & Engagement", href: "/inbox", icon: <MessageSquare className="w-4 h-4" />, keywords: "messages comments replies engage" },
  { label: "Media Vault", href: "/library", icon: <FileText className="w-4 h-4" />, keywords: "add new media upload assets images videos files" },
  { label: "Publishing Hub", href: "/publish", icon: <FileText className="w-4 h-4" />, keywords: "post publish schedule content" },

  // Agents
  { label: "Agent Studio", href: "/agents/studio", icon: <Settings className="w-4 h-4" />, keywords: "create agent new build configure" },
  { label: "Agent Operations", href: "/agents/operations", icon: <Settings className="w-4 h-4" />, keywords: "monitor run execute status" },
  { label: "Workflows", href: "/agents/workflows", icon: <Settings className="w-4 h-4" />, keywords: "automation pipeline flow sequence" },
  { label: "Prompt Governance", href: "/agents/prompts", icon: <FileText className="w-4 h-4" />, keywords: "templates prompts manage library" },
  { label: "Knowledge Base", href: "/agents/knowledge", icon: <FileText className="w-4 h-4" />, keywords: "add document upload sources data training" },
  { label: "Autonomy Monitoring", href: "/agents/autonomy", icon: <BarChart3 className="w-4 h-4" />, keywords: "autonomous watch track oversight" },

  // Governance
  { label: "Governance", href: "/governance", icon: <Shield className="w-4 h-4" />, keywords: "compliance rules framework" },
  { label: "Policy Manager", href: "/governance/policy", icon: <FileText className="w-4 h-4" />, keywords: "create policy new add rule set" },
  { label: "Risk Engine", href: "/governance/risk", icon: <Shield className="w-4 h-4" />, keywords: "risk assessment score threats" },
  { label: "Legal & Compliance", href: "/governance/legal", icon: <FileText className="w-4 h-4" />, keywords: "regulations law requirements" },
  { label: "Brand Library", href: "/governance/brand-library", icon: <FileText className="w-4 h-4" />, keywords: "brand guidelines assets identity" },
  { label: "Collusion Monitor", href: "/governance/collusion-monitor", icon: <Shield className="w-4 h-4" />, keywords: "detect fraud suspicious activity" },
  { label: "Review Queue", href: "/review-queue", icon: <MessageSquare className="w-4 h-4" />, keywords: "approve reject pending review items" },
  { label: "Quality Assurance", href: "/governance/qa", icon: <Shield className="w-4 h-4" />, keywords: "quality check audit verify" },
  { label: "Validation", href: "/validation", icon: <Shield className="w-4 h-4" />, keywords: "validate verify test approve" },
  { label: "Approvals", href: "/governance/approvals", icon: <Shield className="w-4 h-4" />, keywords: "approve pending requests chain" },
  { label: "Rules Engine", href: "/governance/rules", icon: <Settings className="w-4 h-4" />, keywords: "automation conditions triggers logic" },
  { label: "Audit Trail", href: "/governance/audit", icon: <FileText className="w-4 h-4" />, keywords: "logs history activity changes" },
  { label: "Forensic Hub", href: "/governance/forensic", icon: <Shield className="w-4 h-4" />, keywords: "investigation evidence analysis" },
  { label: "Evidence Vault", href: "/governance/evidence", icon: <FileText className="w-4 h-4" />, keywords: "store evidence secure proof records" },

  // Integrations
  { label: "Identity Ledger", href: "/evidence/identity-ledger", icon: <Settings className="w-4 h-4" />, keywords: "identity verification auth sso" },
  { label: "Data Integrations", href: "/integrations/data", icon: <Settings className="w-4 h-4" />, keywords: "connect import export sync data sources" },
  { label: "API Manager", href: "/integrations/api", icon: <Settings className="w-4 h-4" />, keywords: "api keys tokens endpoints developer" },
  { label: "Integration Health", href: "/integrations/health", icon: <BarChart3 className="w-4 h-4" />, keywords: "status monitoring connections uptime" },
  { label: "Developer", href: "/integrations/developer", icon: <Settings className="w-4 h-4" />, keywords: "dev tools sandbox testing" },

  // Accounts & Access
  { label: "Accounts", href: "/accounts", icon: <Users className="w-4 h-4" />, keywords: "users members manage add invite" },
  { label: "Team", href: "/team", icon: <Users className="w-4 h-4" />, keywords: "team members roles collaborate" },
  { label: "Role Access", href: "/access/roles", icon: <Users className="w-4 h-4" />, keywords: "permissions roles access control rbac" },
  { label: "External Access", href: "/access/external", icon: <Users className="w-4 h-4" />, keywords: "external users guests invite" },
  { label: "Partner Access", href: "/access/partners", icon: <Users className="w-4 h-4" />, keywords: "partners collaboration external org" },
  { label: "Access Units", href: "/access/units", icon: <Users className="w-4 h-4" />, keywords: "units groups departments organize" },

  // Admin
  { label: "Workspace Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" />, keywords: "configure preferences customize workspace" },
  { label: "Billing & Usage", href: "/admin/billing", icon: <FileText className="w-4 h-4" />, keywords: "payments invoices plan subscription usage" },
  { label: "Privacy & Data", href: "/admin/privacy", icon: <FileText className="w-4 h-4" />, keywords: "gdpr data privacy compliance erasure" },
  { label: "Notifications", href: "/admin/notifications", icon: <FileText className="w-4 h-4" />, keywords: "alerts email preferences configure" },
  { label: "System Status", href: "/admin/status", icon: <BarChart3 className="w-4 h-4" />, keywords: "health uptime performance monitoring" },
  { label: "Security Center", href: "/admin/security", icon: <Shield className="w-4 h-4" />, keywords: "password 2fa mfa audit login" },

  // SuperAdmin
  { label: "SuperAdmin", href: "/superadmin", icon: <Shield className="w-4 h-4" />, keywords: "admin console master" },
  { label: "Platform Analytics", href: "/superadmin/analytics", icon: <BarChart3 className="w-4 h-4" />, keywords: "superadmin org stats global metrics" },
  { label: "Support Queue", href: "/superadmin/tickets", icon: <MessageSquare className="w-4 h-4" />, keywords: "tickets support resolve manage issues" },

  // Support & Profile
  { label: "Support & Docs", href: "/support", icon: <HelpCircle className="w-4 h-4" />, keywords: "help raise ticket issue bug report" },
  { label: "Resources", href: "/resources", icon: <FileText className="w-4 h-4" />, keywords: "docs documentation guides help" },
  { label: "Profile", href: "/profile", icon: <Users className="w-4 h-4" />, keywords: "my account settings personal info avatar" },
  { label: "Privacy Policy", href: "/privacy", icon: <FileText className="w-4 h-4" />, keywords: "policy terms legal data" },
];

interface ApiSearchResult {
  agents: { id: string; name: string; status: string; autonomy_level: string; workspace_id: string }[];
  content: { id: string; content: string; platform: string; status: string; workspace_id: string }[];
  campaigns: { id: string; title: string; status: string; workspace_id: string }[];
  workflows: { id: string; name: string; status: string; risk_level: string; workspace_id: string }[];
  policies: { id: string; name: string; status: string; risk_level: string; workspace_id: string }[];
}

export default function Header() {
  const router = useRouter();
  const { fullName, role, orgName, isSuperAdmin, planType } = useRoleContext();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [apiResults, setApiResults] = useState<ApiSearchResult | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const q = query.toLowerCase().trim();
  const words = q ? q.split(/\s+/).filter(Boolean) : [];
  const accessibleRoutes = allRoutes.filter(r => canAccessSimple(r.href, role ?? null, isSuperAdmin, planType));
  const filtered = words.length > 0
    ? accessibleRoutes.filter(r => {
        const searchText = (r.label + ' ' + (r.keywords || '')).toLowerCase();
        return words.every(w => searchText.includes(w));
      })
    : accessibleRoutes;

  const hasApiResults = apiResults && (
    apiResults.agents.length > 0 ||
    apiResults.content.length > 0 ||
    apiResults.campaigns.length > 0 ||
    apiResults.workflows.length > 0 ||
    apiResults.policies.length > 0
  );

  useEffect(() => {
    if (words.length === 0) {
      setApiResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setApiLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query.trim())}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const json = await res.json();
          setApiResults(json.data ?? null);
        }
      } catch {
        // silently fail
      } finally {
        setApiLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, words.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      e.preventDefault();
      navigate(filtered[selectedIdx].href);
    }
  };

  const formatRole = (r: string | null) => {
    if (!r) return 'Member';
    if (r === 'SUPERADMIN') return 'Super Admin';
    return r.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  return (
    <header className="h-16 bg-[var(--header-bg)]/80 backdrop-blur-xl border-b border-[var(--border)] flex items-center justify-between px-8 z-20 sticky top-0 shadow-sm transition-colors">
      {/* Left side: Breadcrumbs */}
      <div className="flex-1 hidden md:block">
        <Breadcrumbs />
      </div>

      {/* Center: Search */}
      <div className="flex-1 flex justify-center" ref={containerRef}>
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-[var(--foreground-muted)] group-focus-within:text-indigo-400 transition-colors" />
          </div>
          <input
            ref={inputRef}
            id="global-search"
            type="text"
            placeholder="Search pages..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setSelectedIdx(0); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="block w-full pl-10 pr-12 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-block border border-[var(--border)] rounded bg-[var(--background)] px-1.5 text-[10px] font-mono text-[var(--foreground-muted)] font-bold shadow-sm">
              ⌘K
            </kbd>
          </div>

          {/* Dropdown */}
          {open && (
            <div className="absolute top-full mt-1.5 left-0 right-0 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
              {filtered.length === 0 && !hasApiResults && !apiLoading && (
                <div className="px-4 py-6 text-center text-sm text-[var(--foreground-muted)]">
                  No results for &quot;{query}&quot;
                </div>
              )}

              {filtered.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] bg-[var(--background)]/50">
                    Pages
                  </div>
                  {filtered.map((item, i) => (
                    <button
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setSelectedIdx(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        i === selectedIdx
                          ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                          : 'text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <span className={i === selectedIdx ? 'text-[var(--accent)]' : 'text-[var(--foreground-muted)]'}>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight className={`w-3.5 h-3.5 ${i === selectedIdx ? 'text-[var(--accent)]' : 'text-[var(--foreground-muted)] opacity-0'}`} />
                    </button>
                  ))}
                </>
              )}

              {apiLoading && (
                <div className="px-4 py-3 text-center text-xs text-[var(--foreground-muted)]">
                  Searching data...
                </div>
              )}

              {hasApiResults && (
                <div className="border-t border-[var(--border)]">
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] bg-[var(--background)]/50">
                    Data Results
                  </div>
                  {apiResults!.agents.map((item) => (
                    <button
                      key={`agent-${item.id}`}
                      onClick={() => { setOpen(false); setQuery(""); router.push(`/agents/operations?id=${item.id}`); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <Settings className="w-4 h-4 text-[var(--foreground-muted)]" />
                      <span className="flex-1 truncate">{item.name}</span>
                      <span className="text-[10px] font-mono text-[var(--foreground-muted)]">{item.status}</span>
                    </button>
                  ))}
                  {apiResults!.content.map((item) => (
                    <button
                      key={`content-${item.id}`}
                      onClick={() => { setOpen(false); setQuery(""); router.push(`/publish?id=${item.id}`); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <FileText className="w-4 h-4 text-[var(--foreground-muted)]" />
                      <span className="flex-1 truncate">{item.content?.substring(0, 60)}</span>
                      <span className="text-[10px] font-mono text-[var(--foreground-muted)]">{item.platform}</span>
                    </button>
                  ))}
                  {apiResults!.campaigns.map((item) => (
                    <button
                      key={`campaign-${item.id}`}
                      onClick={() => { setOpen(false); setQuery(""); router.push(`/campaigns/${item.id}`); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <BarChart3 className="w-4 h-4 text-[var(--foreground-muted)]" />
                      <span className="flex-1 truncate">{item.title}</span>
                      <span className="text-[10px] font-mono text-[var(--foreground-muted)]">{item.status}</span>
                    </button>
                  ))}
                  {apiResults!.workflows.map((item) => (
                    <button
                      key={`workflow-${item.id}`}
                      onClick={() => { setOpen(false); setQuery(""); router.push(`/agents/workflows?id=${item.id}`); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <Settings className="w-4 h-4 text-[var(--foreground-muted)]" />
                      <span className="flex-1 truncate">{item.name}</span>
                      <span className="text-[10px] font-mono text-[var(--foreground-muted)]">{item.status}</span>
                    </button>
                  ))}
                  {apiResults!.policies.map((item) => (
                    <button
                      key={`policy-${item.id}`}
                      onClick={() => { setOpen(false); setQuery(""); router.push(`/governance/policy?id=${item.id}`); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <Shield className="w-4 h-4 text-[var(--foreground-muted)]" />
                      <span className="flex-1 truncate">{item.name}</span>
                      <span className="text-[10px] font-mono text-[var(--foreground-muted)]">{item.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right-side utilities */}
      <div className="flex-1 flex items-center justify-end gap-3">
        {isSuperAdmin && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" />
            SuperAdmin
          </div>
        )}

        <ThemeToggle />
        <NotificationPanel />

        {/* User profile */}
        <Link
          href="/profile"
          className="flex items-center pl-4 border-l border-[var(--border)] hover:opacity-80 transition-opacity group"
        >
          <div className="text-right mr-3 hidden md:block">
            <p className="text-sm font-bold text-[var(--foreground)] group-hover:text-indigo-400 transition-colors">
              {fullName || "User Profile"}
            </p>
            <p className="text-[10px] text-[var(--foreground-muted)] font-black uppercase tracking-wider">
              {formatRole(role || (isSuperAdmin ? 'SUPERADMIN' : ''))}-{orgName || 'ZoikoGroup'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shrink-0 border-2 border-transparent group-hover:border-indigo-500/50 transition-all overflow-hidden shadow-lg flex items-center justify-center text-xs text-foreground font-bold uppercase">
            {fullName ? fullName.split(' ').map(n => n[0]).join('') : "U"}
          </div>
        </Link>
      </div>
    </header>
  );
}
