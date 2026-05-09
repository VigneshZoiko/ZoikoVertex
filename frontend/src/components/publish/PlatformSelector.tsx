import React, { useState } from 'react';
import { Globe, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';

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
  expandedPlatforms: string[];
  onToggleExpansion: (platform: string) => void;
  userRole?: string | null;
  // NEW: media context for compatibility checking
  mediaCount?: number;         // number of files selected
  mediaType?: string;          // 'image' | 'video' | undefined
}

// ─── Platform compatibility rules ────────────────────────────────────────────
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
    warningFn: (count, type) => {
      if (count > 10) return `Instagram accepts up to 10 files per post. You have ${count} selected — please reduce your selection.`;
      return null;
    },
  },
  facebook: {
    maxFiles: 10,
    acceptedTypes: ['both'],
    carouselSupported: true,
    warningFn: (count, type) => {
      if (count > 10) return `Facebook accepts up to 10 files per post. You have ${count} selected.`;
      return null;
    },
  },
  linkedin: {
    maxFiles: 9,
    acceptedTypes: ['both'],
    carouselSupported: true,
    warningFn: (count, type) => {
      if (type === 'video' && count > 1) return `LinkedIn supports only 1 video per post. Posting multiple videos is not supported.`;
      if (count > 9) return `LinkedIn accepts up to 9 images per carousel. You have ${count} selected.`;
      return null;
    },
  },
  twitter: {
    maxFiles: 4,
    acceptedTypes: ['both'],
    carouselSupported: false,
    warningFn: (count, type) => {
      if (type === 'video' && count > 1) return `X (Twitter) only accepts 1 video per post.`;
      if (type === 'image' && count > 4) return `X (Twitter) accepts up to 4 images per post. You have ${count} selected — only the first 4 will be used.`;
      if (count > 4) return `X (Twitter) accepts a maximum of 4 images or 1 video per post.`;
      return null;
    },
  },
  threads: {
    maxFiles: 10,
    acceptedTypes: ['image'],
    carouselSupported: true,
    warningFn: (count, type) => {
      if (type === 'video') return `Threads does not currently support multiple videos via API. Only the first video will be posted.`;
      if (count > 10) return `Threads accepts up to 10 images per post. You have ${count} selected.`;
      return null;
    },
  },
  youtube: {
    maxFiles: 1,
    acceptedTypes: ['video'],
    carouselSupported: false,
    warningFn: (count, type) => {
      if (type === 'image') return `YouTube only accepts video uploads. Images are not supported — this platform will be skipped.`;
      if (count > 1) return `YouTube accepts only 1 video per post. Only the first video will be uploaded.`;
      return null;
    },
  },
  pinterest: {
    maxFiles: 1,
    acceptedTypes: ['both'],
    carouselSupported: false,
    warningFn: (count, type) => {
      if (count > 1) return `Pinterest accepts 1 image or video per Pin. Only the first file will be used.`;
      return null;
    },
  },
  tiktok: {
    maxFiles: 1,
    acceptedTypes: ['video'],
    carouselSupported: false,
    warningFn: (count, type) => {
      if (type === 'image') return `TikTok requires video content. Images are not supported for standard posts.`;
      if (count > 1) return `TikTok accepts only 1 video per post.`;
      return null;
    },
  },
};

// ─── Helper: is this platform blocked for current media? ──────────────────────
function getCompatibility(platformId: string, mediaCount: number, mediaType: string): {
  blocked: boolean;
  warning: string | null;
} {
  if (mediaCount === 0 || !mediaType) return { blocked: false, warning: null };

  const rule = PLATFORM_RULES[platformId];
  if (!rule) return { blocked: false, warning: null };

  const normalizedType = mediaType.startsWith('video') ? 'video' : 'image';

  // Hard block: wrong media type entirely
  const typesAccepted = rule.acceptedTypes;
  if (!typesAccepted.includes('both') && !typesAccepted.includes(normalizedType as any)) {
    const warning = rule.warningFn(mediaCount, normalizedType);
    return { blocked: true, warning: warning || `${platformId} does not support this media type.` };
  }

  const warning = rule.warningFn(mediaCount, normalizedType);
  const blocked = warning !== null && (
    (normalizedType === 'image' && platformId === 'youtube') ||
    (normalizedType === 'image' && platformId === 'tiktok') ||
    (normalizedType === 'video' && platformId === 'youtube' && mediaCount > 1)
  );

  return { blocked, warning };
}

// ─── Brand Icons ──────────────────────────────────────────────────────────────
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);
const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
  </svg>
);
const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/>
    <path d="M8 12c0-2.2 1.8-4 4-4 1.7 0 3.2 1.1 3.8 2.6"/>
    <path d="M16 12c0 2.2-1.8 4-4 4-1.7 0-3.2-1.1-3.8-2.6"/>
  </svg>
);

const PLATFORM_META: Record<string, { color: string; Icon: React.FC<{ className?: string }> }> = {
  facebook: { color: 'bg-blue-600', Icon: FacebookIcon },
  instagram: { color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500', Icon: InstagramIcon },
  linkedin: { color: 'bg-blue-700', Icon: LinkedinIcon },
  twitter: { color: 'bg-zinc-900 text-white border border-zinc-700', Icon: TwitterIcon },
  youtube: { color: 'bg-red-600', Icon: YoutubeIcon },
  threads: { color: 'bg-zinc-800', Icon: ThreadsIcon },
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  connectedAccounts,
  selectedAccountIds,
  onToggleAccount,
  expandedPlatforms,
  onToggleExpansion,
  userRole,
  mediaCount = 0,
  mediaType = '',
}) => {
  const [activeWarning, setActiveWarning] = useState<{ platformId: string; message: string } | null>(null);

  const platformsList = ['facebook', 'instagram', 'linkedin', 'twitter', 'youtube', 'threads'];

  const handlePlatformClick = (platformId: string) => {
    const { warning, blocked } = getCompatibility(platformId, mediaCount, mediaType);
    if (blocked) {
      setActiveWarning({ platformId, message: warning! });
      return;
    }
    if (warning) {
      setActiveWarning({ platformId, message: warning });
    } else {
      setActiveWarning(null);
    }
    onToggleExpansion(platformId);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-400" />
          Target Accounts
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-1 rounded font-bold uppercase tracking-wider">
            {selectedAccountIds.length} Selected
          </span>
          {userRole?.toUpperCase() !== 'CREATOR' && (
            <button
              onClick={() => window.location.href = '/accounts'}
              className="text-[10px] text-indigo-400 font-bold uppercase hover:underline"
            >
              Manage
            </button>
          )}
        </div>
      </div>

      {/* Active warning banner */}
      {activeWarning && (
        <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-400 capitalize mb-0.5">{activeWarning.platformId} — Media Compatibility Issue</p>
            <p className="text-xs text-amber-300/80 leading-relaxed">{activeWarning.message}</p>
          </div>
          <button onClick={() => setActiveWarning(null)} className="text-amber-500 hover:text-amber-300 text-xs font-bold">✕</button>
        </div>
      )}

      <div className="space-y-3">
        {platformsList.map(platformId => {
          const platformAccounts = connectedAccounts.filter(a => a.platform === platformId);
          const isExpanded = expandedPlatforms.includes(platformId);
          const meta = PLATFORM_META[platformId] || { color: 'bg-zinc-700', Icon: Globe };
          const Icon = meta.Icon;
          const selectedCount = platformAccounts.filter(a => selectedAccountIds.includes(a.id)).length;

          const { blocked, warning } = getCompatibility(platformId, mediaCount, mediaType);
          const hasWarning = !!warning;

          return (
            <div
              key={platformId}
              className={`rounded-xl overflow-hidden border transition-all ${
                blocked
                  ? 'border-rose-500/20 bg-zinc-950/80 opacity-50 grayscale cursor-not-allowed'
                  : hasWarning
                  ? 'border-amber-500/30 bg-zinc-950'
                  : 'border-zinc-800 bg-zinc-950'
              }`}
            >
              <button
                onClick={() => handlePlatformClick(platformId)}
                disabled={false}  // always clickable — shows warning if blocked
                className={`w-full flex items-center justify-between p-4 transition-colors ${
                  blocked ? 'cursor-not-allowed' : isExpanded ? 'bg-zinc-900/50' : 'hover:bg-zinc-900/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${meta.color} ${blocked ? 'opacity-40' : ''}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-sm font-bold capitalize ${blocked ? 'text-zinc-600' : 'text-white'}`}>
                    {platformId}
                  </span>

                  {/* Badges */}
                  {selectedCount > 0 && !blocked && (
                    <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                      {selectedCount}
                    </span>
                  )}
                  {blocked && (
                    <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <span>✕</span> Unsupported
                    </span>
                  )}
                  {!blocked && hasWarning && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      ⚠ Limited
                    </span>
                  )}
                </div>
                {!blocked && <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />}
                {blocked && <AlertTriangle className="w-4 h-4 text-rose-500/50" />}
              </button>

              {isExpanded && !blocked && (
                <div className="p-4 pt-2 space-y-2 border-t border-zinc-800/50">
                  {/* Inline warning */}
                  {hasWarning && (
                    <div className="mb-3 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-amber-300 leading-relaxed">{warning}</p>
                    </div>
                  )}

                  {platformAccounts.length > 0 ? (
                    platformAccounts.map(account => (
                      <label
                        key={account.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedAccountIds.includes(account.id)
                            ? 'bg-indigo-500/10 border-indigo-500/50'
                            : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selectedAccountIds.includes(account.id)}
                            onChange={() => onToggleAccount(account.id)}
                          />
                          <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-bold overflow-hidden">
                            {account.avatar_url ? <img src={account.avatar_url} alt="" /> : account.account_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{account.account_name}</p>
                            <p className="text-[10px] text-zinc-500">{account.account_handle || 'Active'}</p>
                          </div>
                        </div>
                        {selectedAccountIds.includes(account.id) && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                      </label>
                    ))
                  ) : (
                    <p className="text-[10px] text-zinc-500 py-2 italic text-center">
                      No accounts connected. <a href="/accounts" className="text-indigo-400 hover:underline">Connect one now</a>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlatformSelector;
