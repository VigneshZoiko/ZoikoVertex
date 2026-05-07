import React from 'react';
import { Globe, CheckCircle2, ChevronRight } from 'lucide-react';

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
}

// Custom Brand Icons
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

const PlatformSelector: React.FC<PlatformSelectorProps> = ({ 
  connectedAccounts, 
  selectedAccountIds, 
  onToggleAccount,
  expandedPlatforms,
  onToggleExpansion
}) => {
  const platformsList = ['facebook', 'instagram', 'linkedin', 'twitter'];

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
          <button 
            onClick={() => window.location.href = '/accounts'}
            className="text-[10px] text-indigo-400 font-bold uppercase hover:underline"
          >
            Manage
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {platformsList.map(platformId => {
          const platformAccounts = connectedAccounts.filter(a => a.platform === platformId);
          const isExpanded = expandedPlatforms.includes(platformId);
          const Icon = platformId === 'facebook' ? FacebookIcon : platformId === 'instagram' ? InstagramIcon : platformId === 'linkedin' ? LinkedinIcon : TwitterIcon;
          const selectedCount = platformAccounts.filter(a => selectedAccountIds.includes(a.id)).length;

          return (
            <div key={platformId} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
              <button 
                onClick={() => onToggleExpansion(platformId)}
                className={`w-full flex items-center justify-between p-4 transition-colors ${isExpanded ? 'bg-zinc-900/50' : 'hover:bg-zinc-900/30'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                    platformId === 'facebook' ? 'bg-blue-600' : platformId === 'instagram' ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' : platformId === 'linkedin' ? 'bg-blue-700' : 'bg-white text-black'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-white capitalize">{platformId}</span>
                  {selectedCount > 0 && (
                    <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                      {selectedCount}
                    </span>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {isExpanded && (
                <div className="p-4 pt-2 space-y-2 border-t border-zinc-800/50">
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
                    <p className="text-[10px] text-zinc-500 py-2 italic text-center">No accounts connected. <a href="/accounts" className="text-indigo-400 hover:underline">Connect one now</a></p>
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
