import React, { useState, useRef, useEffect } from 'react';
import { Globe, CheckCircle2, ChevronDown, AlertTriangle, Plus } from 'lucide-react';
import Image from 'next/image';

interface ConnectedAccount {
  id: string;
  platform: string;
  account_name: string;
  account_handle?: string;
  avatar_url?: string;
}

interface PlatformSelectorProps {
  connectedAccounts: ConnectedAccount[];
  selectedAccountIds: string[];
  onToggleAccount: (id: string) => void;
  userRole?: string | null;
  mediaCount?: number;
  mediaType?: string;
}

interface PlatformRule {
  maxFiles: number;
  acceptedTypes: ('image' | 'video' | 'both')[];
  carouselSupported: boolean;
  warningFn: (count: number, type: string) => string | null;
}

const PLATFORM_RULES: Record<string, PlatformRule> = {
  instagram: {
    maxFiles: 10,
    acceptedTypes: ['both'],
    carouselSupported: true,
    warningFn: (count) => count > 10 ? `Instagram accepts up to 10 files per post.` : null,
  },
  facebook: {
    maxFiles: 10,
    acceptedTypes: ['both'],
    carouselSupported: true,
    warningFn: (count) => count > 10 ? `Facebook accepts up to 10 files per post.` : null,
  },
  linkedin: {
    maxFiles: 9,
    acceptedTypes: ['both'],
    carouselSupported: true,
    warningFn: (count, type) => {
      if (type === 'video' && count > 1) return `LinkedIn supports only 1 video per post.`;
      if (count > 9) return `LinkedIn accepts up to 9 images per carousel.`;
      return null;
    },
  },
  twitter: {
    maxFiles: 4,
    acceptedTypes: ['both'],
    carouselSupported: false,
    warningFn: (count, type) => {
      if (type === 'video' && count > 1) return `X (Twitter) only accepts 1 video per post.`;
      if (count > 4) return `X (Twitter) accepts up to 4 images or 1 video.`;
      return null;
    },
  },
  threads: {
    maxFiles: 10,
    acceptedTypes: ['image'],
    carouselSupported: true,
    warningFn: (count, type) => {
      if (type === 'video') return `Threads does not support multiple videos via API.`;
      if (count > 10) return `Threads accepts up to 10 images per post.`;
      return null;
    },
  },
  youtube: {
    maxFiles: 1,
    acceptedTypes: ['video'],
    carouselSupported: false,
    warningFn: (count, type) => {
      if (type === 'image') return `YouTube only accepts video uploads.`;
      if (count > 1) return `YouTube accepts only 1 video per post.`;
      return null;
    },
  },
  pinterest: {
    maxFiles: 1,
    acceptedTypes: ['both'],
    carouselSupported: false,
    warningFn: (count) => count > 1 ? `Pinterest accepts 1 image or video per Pin.` : null,
  },
  tiktok: {
    maxFiles: 1,
    acceptedTypes: ['video'],
    carouselSupported: false,
    warningFn: (count, type) => {
      if (type === 'image') return `TikTok requires video content.`;
      if (count > 1) return `TikTok accepts only 1 video per post.`;
      return null;
    },
  },
};

function getCompatibility(platformId: string, mediaCount: number, mediaType: string) {
  if (mediaCount === 0 || !mediaType) return { blocked: false, warning: null };
  const rule = PLATFORM_RULES[platformId];
  if (!rule) return { blocked: false, warning: null };
  const normalizedType = mediaType.startsWith('video') ? 'video' : 'image';
  const typesAccepted = rule.acceptedTypes;
  if (!typesAccepted.includes('both') && !typesAccepted.includes(normalizedType as any)) {
    return { blocked: true, warning: rule.warningFn(mediaCount, normalizedType) || `${platformId} does not support this media type.` };
  }
  return { blocked: false, warning: rule.warningFn(mediaCount, normalizedType) };
}

/* ─── Platform brand config ──────────────────────────────────────────────── */
const PLATFORM_META: Record<string, { label: string; color: string; Icon: React.FC<{ className?: string }> }> = {
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    color: '#E4405F',
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  linkedin: {
    label: 'LinkedIn',
    color: '#0A66C2',
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  twitter: {
    label: 'X / Twitter',
    color: '#18181b',
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  threads: {
    label: 'Threads',
    color: '#18181b',
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.284-.883-2.292-.887h-.1c-.96 0-1.941.292-2.74 1.019l-1.378-1.487c1.171-1.081 2.641-1.616 4.2-1.616h.143c3.179.013 5.024 1.913 5.382 5.375.368.085.724.194 1.062.33 1.409.568 2.485 1.553 3.113 2.844.897 1.843.886 4.453-.984 6.274-1.978 1.935-4.355 2.77-7.534 2.793zm.058-9.013c-.042 0-.083 0-.124.002-1.19.066-2.087.425-2.604.957-.392.4-.565.922-.535 1.553.063 1.193 1.026 1.972 2.45 1.9 1.146-.063 1.984-.538 2.491-1.41.345-.586.544-1.362.596-2.352a11.546 11.546 0 0 0-2.274-.65z"/>
      </svg>
    ),
  },
  pinterest: {
    label: 'Pinterest',
    color: '#BD081C',
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    ),
  },
};

/* ─── Dropdown for a single platform ────────────────────────────────────── */
function PlatformDropdown({
  platformId,
  accounts,
  selectedAccountIds,
  onToggleAccount,
  mediaCount,
  mediaType,
}: {
  platformId: string;
  accounts: ConnectedAccount[];
  selectedAccountIds: string[];
  onToggleAccount: (id: string) => void;
  mediaCount: number;
  mediaType: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = PLATFORM_META[platformId] || { label: platformId, color: '#52525b', Icon: Globe };
  const Icon = meta.Icon;
  const { blocked, warning } = getCompatibility(platformId, mediaCount, mediaType);
  const selectedInPlatform = accounts.filter(a => selectedAccountIds.includes(a.id));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !blocked && setOpen(o => !o)}
        disabled={blocked}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
          blocked
            ? 'border-rose-500/20 opacity-40 cursor-not-allowed bg-[var(--surface)]'
            : open
            ? 'border-indigo-500/40 bg-[var(--surface)]'
            : selectedInPlatform.length > 0
            ? 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/50'
            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--card-border)]'
        }`}
      >
        {/* Platform icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 text-xs"
          style={{ backgroundColor: meta.color }}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>

        {/* Label + selected chips */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[var(--foreground)]">{meta.label}</span>
          {warning && !blocked && (
            <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" /> Limited
            </span>
          )}
          {blocked && (
            <span className="text-[10px] text-rose-400">Unsupported</span>
          )}
          {selectedInPlatform.map(acc => (
            <span
              key={acc.id}
              className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/30 rounded-full text-[10px] font-semibold text-indigo-400 max-w-[120px]"
            >
              {acc.avatar_url && (
                <span className="w-3 h-3 rounded-full overflow-hidden inline-block shrink-0 relative">
                  <Image src={acc.avatar_url} alt="" fill className="object-cover" />
                </span>
              )}
              <span className="truncate">{acc.account_handle ? `@${acc.account_handle.replace(/^@/, '')}` : acc.account_name}</span>
            </span>
          ))}
        </div>

        {/* Right: count badge + chevron */}
        <div className="flex items-center gap-1.5 shrink-0">
          {accounts.length === 0 && !blocked && (
            <span className="text-[10px] text-[var(--foreground-muted)]">No accounts</span>
          )}
          {accounts.length > 0 && (
            <span className="text-[10px] text-[var(--foreground-muted)]">
              {selectedInPlatform.length}/{accounts.length}
            </span>
          )}
          {!blocked && <ChevronDown className={`w-3.5 h-3.5 text-[var(--foreground-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {warning && (
            <div className="px-3 py-2 bg-amber-500/8 border-b border-amber-500/20 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-amber-300 leading-relaxed">{warning}</p>
            </div>
          )}

          {accounts.length > 0 ? (
            <div className="py-1 max-h-52 overflow-y-auto">
              {accounts.map(account => {
                const isSelected = selectedAccountIds.includes(account.id);
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => { onToggleAccount(account.id); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--surface)] transition-colors text-left ${isSelected ? 'bg-indigo-500/8' : ''}`}
                  >
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-[var(--border)] shrink-0 relative bg-[var(--surface)] flex items-center justify-center">
                      {account.avatar_url
                        ? <Image src={account.avatar_url} alt="" fill className="object-cover" />
                        : <span className="text-xs font-bold text-[var(--foreground-muted)]">{account.account_name.charAt(0).toUpperCase()}</span>
                      }
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{account.account_name}</p>
                      {account.account_handle && (
                        <p className="text-[10px] text-[var(--foreground-muted)] truncate">@{account.account_handle.replace(/^@/, '')}</p>
                      )}
                    </div>
                    {/* Checkbox */}
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-[var(--border)]'}`}>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-[var(--foreground-muted)] mb-2">No {meta.label} accounts connected.</p>
              <a href="/accounts" className="inline-flex items-center gap-1 text-xs text-indigo-400 font-semibold hover:underline">
                <Plus className="w-3 h-3" /> Connect account
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  connectedAccounts,
  selectedAccountIds,
  onToggleAccount,
  userRole,
  mediaCount = 0,
  mediaType = '',
}) => {
  const platformsList = ['facebook', 'instagram', 'linkedin', 'twitter', 'threads', 'pinterest'];

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-400" />
          Post To
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-[var(--surface)] text-[var(--foreground-muted)] px-2 py-1 rounded font-bold uppercase tracking-wider">
            {selectedAccountIds.length} selected
          </span>
          {userRole?.toUpperCase() !== 'CREATOR' && (
            <a href="/accounts" className="text-[10px] text-indigo-400 font-bold uppercase hover:underline">
              Manage
            </a>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {platformsList.map(platformId => (
          <PlatformDropdown
            key={platformId}
            platformId={platformId}
            accounts={connectedAccounts.filter(a => a.platform === platformId)}
            selectedAccountIds={selectedAccountIds}
            onToggleAccount={onToggleAccount}
            mediaCount={mediaCount}
            mediaType={mediaType}
          />
        ))}
      </div>
    </div>
  );
};

export default PlatformSelector;
