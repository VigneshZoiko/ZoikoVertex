"use client";

import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

// Map paths to readable names
const routeMap: Record<string, string> = {
  '': 'Dashboard',
  'superadmin': 'Governance Node',
  'analytics': 'Analytics',
  'tickets': 'Support Queue',
  'operations': 'Operations Feed',
  'resources': 'Resource Monitoring',
  'library': 'Media Vault',
  'projects': 'Projects',
  'calendar': 'Calendar',
  'publish': 'Publishing Hub',
  'queue': 'Review Queue',
  'quality': 'Quality Assurance',
  'governance': 'Governance',
  'rules': 'Approval Rules',
  'exceptions': 'Exceptions',
  'agents': 'Agents',
  'studio': 'Agent Studio',
  'workflows': 'Workflows',
  'prompts': 'Prompt Governance',
  'autonomy': 'Autonomy Controls',
  'models': 'Model Performance',
  'knowledge': 'Knowledge Bases',
  'legal': 'Brand Standards',
  'policy': 'Policy Center',
  'risk': 'Risk & Compliance',
  'audit': 'Audit Trail',
  'evidence': 'Evidence Vault',
  'integrations': 'Integrations',
  'accounts': 'Platform Accounts',
  'data': 'Data Connectors',
  'api': 'API & Webhooks',
  'health': 'Integration Health',
  'access': 'Access',
  'team': 'Users & Access',
  'roles': 'Roles & Permissions',
  'units': 'Business Units',
  'admin': 'Admin',
  'settings': 'Workspace Settings',
  'billing': 'Subscription & Usage',
  'security': 'Security',
  'privacy': 'Privacy & Data',
  'notifications': 'Notifications',
  'status': 'System Status',
  'support': 'Support',
  'profile': 'Profile Settings'
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  
  if (!pathname) return null;

  const segments = pathname.split('/').filter(Boolean);

  // If we're on the root dashboard, don't show complex breadcrumbs
  if (segments.length === 0) {
    return (
      <nav className="flex items-center text-sm font-medium">
        <div className="flex items-center text-[var(--foreground)] px-2 py-1 rounded-md bg-[var(--surface-hover)]">
          <Home className="w-4 h-4 mr-2" />
          Dashboard
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex items-center text-sm" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        <li>
          <Link 
            href="/dashboard"
            className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] p-1.5 rounded-md transition-colors flex items-center"
            title="Dashboard"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>
        
        {(() => {
          const lastSegment = segments[segments.length - 1];
          const isId = /^[0-9a-fA-F-]{36}$|^\d+$/.test(lastSegment);
          const name = isId ? 'Details' : (routeMap[lastSegment] || lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1));
          return (
            <React.Fragment key={lastSegment}>
              <li className="text-[var(--border)]">
                <ChevronRight className="w-4 h-4 shrink-0" />
              </li>
              <li>
                <span
                  className="text-[var(--foreground)] font-semibold px-2 py-1 bg-[var(--surface-hover)] rounded-md"
                  aria-current="page"
                >
                  {name}
                </span>
              </li>
            </React.Fragment>
          );
        })()}
      </ol>
    </nav>
  );
}
