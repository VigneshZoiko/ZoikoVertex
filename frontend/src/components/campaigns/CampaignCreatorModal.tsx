"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  X, ChevronDown, ChevronLeft, Loader2, ImageIcon, Trash2,
  Monitor, Smartphone, Globe as InstaIcon, Check, Link2,
} from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import MediaVaultPicker from "@/components/MediaVaultPicker";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MetaAccount {
  id: string; platform: string; account_name: string;
  account_handle: string; ad_account_id?: string | null;
  ad_account_currency?: string | null;
}

interface AdData {
  name: string; copy: string; headline: string;
  website_url: string; cta: string; image_url: string;
  ad_type?: "image_ad" | "video_ad" | "lead_ad";
  video_url?: string;
  lead_form_id?: string;
}

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const OBJECTIVES = [
  { value: "TRAFFIC",     label: "Traffic",     desc: "Drive visitors to your website or marketing landing pages." },
  { value: "ENGAGEMENT",  label: "Engagement",  desc: "Get more likes, comments, and shares." },
  { value: "AWARENESS",   label: "Awareness",   desc: "Get more people to notice and remember your brand." },
  { value: "LEAD_GENERATION", label: "Leads",   desc: "Collect leads for your business or brand." },
  { value: "CONVERSIONS", label: "Sales",       desc: "Find people who are likely to buy your product or service." },
];

interface OptimizeOption { value: string; label: string; desc: string; }

const OPTIMIZE_OPTIONS: Record<string, OptimizeOption[]> = {
  TRAFFIC: [
    { value: "LANDING_PAGE_VIEWS", label: "Landing page views", desc: "Deliver your ads to people who are more likely to click on your ad's link and load the website." },
    { value: "LINK_CLICKS",        label: "Link clicks",        desc: "Deliver your ads to people who are more likely to click on them." },
    { value: "REACH",              label: "Daily unique reach", desc: "Deliver your ads to people up to once a day." },
  ],
  ENGAGEMENT: [
    { value: "POST_ENGAGEMENT", label: "Post engagement",  desc: "Deliver your ads to people most likely to engage with your post." },
    { value: "REACH",           label: "Daily unique reach", desc: "Deliver your ads to people up to once a day." },
  ],
  ENGAGEMENT_WEBSITE: [
    { value: "OFFSITE_CONVERSIONS", label: "Conversions",        desc: "Deliver your ads to the right people so you can get the most website conversions." },
    { value: "LANDING_PAGE_VIEWS",  label: "Landing page views", desc: "Deliver your ads to people who are more likely to click on your ad's link and load the website or Instant Experience." },
    { value: "LINK_CLICKS",         label: "Link clicks",        desc: "Deliver your ads to people who are more likely to click on them." },
    { value: "REACH",               label: "Daily unique reach", desc: "Deliver your ads to people up to once a day." },
  ],
  ENGAGEMENT_VIDEO: [
    { value: "THRUPLAY",              label: "ThruPlay",                        desc: "For videos shorter than 15 seconds, the social network will deliver your ads to people who are mostly likely to watch them to the end. For longer videos, the social network will deliver your ads to people mostly likely to play the video for at least 15 seconds." },
    { value: "TWO_SECOND_VIDEO_VIEWS", label: "2-second continuous video views", desc: "The social network will deliver your ads to people who are likely to watch your video for two seconds or more. Most 2-second continuous video views have at least 50% of the video pixels on screen." },
  ],
  AWARENESS: [
    { value: "REACH",          label: "Reach",          desc: "We'll serve your ads to the maximum number of people." },
    { value: "AD_RECALL_LIFT", label: "Ad recall lift", desc: "The social network will deliver your ads to people who are most likely to remember your ads." },
  ],
  LEAD_GENERATION: [
    { value: "LEAD_GENERATION", label: "Maximize the number of leads",            desc: "Meta will show your ads to the people most likely to share their contact info with you." },
    { value: "QUALITY_LEAD",    label: "Maximize the number of conversion leads", desc: "Meta will show your ads to the people most likely to convert after sharing their contact info with you." },
  ],
  LEAD_GENERATION_WEBSITE: [
    { value: "OFFSITE_CONVERSIONS", label: "Conversions",        desc: "The social network will deliver your ads to the right people so you can get the most website conversions." },
    { value: "LANDING_PAGE_VIEWS",  label: "Landing page views", desc: "The social network will deliver your ads to people who are more likely to click on your ad's link and load the website or Instant Experience." },
    { value: "LINK_CLICKS",         label: "Link clicks",        desc: "The social network will deliver your ads to people who are more likely to click on them." },
    { value: "REACH",               label: "Daily unique reach", desc: "The social network will deliver your ads to people up to once a day." },
  ],
  CONVERSIONS: [
    { value: "OFFSITE_CONVERSIONS", label: "Conversions",        desc: "Deliver your ads to the right people so you can get the most website conversions." },
    { value: "LANDING_PAGE_VIEWS",  label: "Landing page views", desc: "The social network will deliver your ads to people who are more likely to click on your ad's link and load the website or Instant Experience." },
    { value: "LINK_CLICKS",         label: "Link clicks",        desc: "The social network will deliver your ads to people who are more likely to click on them." },
    { value: "REACH",               label: "Daily unique reach", desc: "The social network will deliver your ads to people up to once a day." },
  ],
  CONVERSIONS_MESSAGE: [
    { value: "CONVERSATIONS", label: "Conversations", desc: "Meta will show your ads to people most likely to have a conversation with your business." },
  ],
};

// â”€â”€ Placement definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Placement {
  id: string; label: string; platform: string;
  device: "all" | "mobile" | "desktop"; // which device types support this
  unavailableFor?: string[];
}

// effectiveObjective keys used in unavailableFor:
// TRAFFIC, AWARENESS, LEAD_GENERATION, CONVERSIONS
// ENGAGEMENT_POST_AD  = Engagement > On your ad > Post engagement
// ENGAGEMENT_VIDEO_AD = Engagement > On your ad > Video views
// ENGAGEMENT_WEBSITE  = Engagement > On your website

const ALL_PLACEMENTS: Placement[] = [
  { id: "facebook_news_feed",        label: "Facebook News Feed",                               platform: "Facebook",         device: "all" },
  { id: "instagram_feed",            label: "Instagram Feed",                                   platform: "Instagram",        device: "all" },
  { id: "facebook_marketplace",      label: "Facebook Marketplace",                             platform: "Facebook",         device: "mobile",  unavailableFor: ["TRAFFIC","ENGAGEMENT_POST_AD"] },
  // facebook_video_feeds removed â€” deprecated in Meta API v17+
  { id: "facebook_right_column",     label: "Facebook Right Column",                            platform: "Facebook",         device: "desktop", unavailableFor: ["TRAFFIC","ENGAGEMENT_POST_AD","AWARENESS"] },
  { id: "instagram_explore",         label: "Instagram Explore",                                platform: "Instagram",        device: "mobile",  unavailableFor: ["TRAFFIC"] },
  { id: "messenger_inbox",           label: "Messenger Inbox",                                  platform: "Messenger",        device: "all",     unavailableFor: ["ENGAGEMENT_POST_AD","AWARENESS"] },
  { id: "instagram_stories",         label: "Instagram Stories",                                platform: "Instagram",        device: "all",     unavailableFor: ["ENGAGEMENT_POST_AD"] },
  { id: "facebook_stories",          label: "Facebook Stories",                                 platform: "Facebook",         device: "mobile",  unavailableFor: ["ENGAGEMENT_POST_AD"] },
  { id: "messenger_stories",         label: "Messenger Stories",                                platform: "Messenger",        device: "mobile",  unavailableFor: ["ENGAGEMENT_POST_AD"] },
  { id: "facebook_instream_videos",  label: "Facebook In-Stream Videos",                        platform: "Facebook",         device: "all" },
  { id: "facebook_search",           label: "Facebook Search Results",                          platform: "Facebook",         device: "all" },
  { id: "audience_network_native",   label: "Audience Network Native, Banner and Interstitial", platform: "Audience Network", device: "mobile" },
  { id: "audience_network_rewarded", label: "Audience Network Rewarded Videos",                 platform: "Audience Network", device: "mobile",  unavailableFor: ["TRAFFIC","ENGAGEMENT_POST_AD","AWARENESS"] },
  { id: "audience_network_instream", label: "Audience Network In-Stream Videos",                platform: "Audience Network", device: "mobile",  unavailableFor: ["TRAFFIC"] },
  { id: "facebook_reels",            label: "Facebook Reels",                                   platform: "Facebook",         device: "mobile" },
  { id: "instagram_reels",           label: "Instagram Reels",                                  platform: "Instagram",        device: "mobile" },
];

const CTA_OPTIONS = [
  "Learn more", "Shop now", "Sign up", "Book now",
  "Contact us", "Download", "Get quote", "Subscribe",
  "Watch more", "Send message", "Get offer",
];

const SIDEBAR_STEPS = [
  { num: 1, label: "Set your campaign objective" },
  { num: 2, label: "Choose your audience and budget" },
  { num: 3, label: "Create your ads" },
  { num: 4, label: "Publish campaign" },
];

// â”€â”€ Input / Select helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const inp = "w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors";

const Field = React.memo(function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-zinc-200">{label}</p>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {children}
    </div>
  );
});

const Radio = React.memo(function Radio({ value, checked, onChange, label, desc }: { value: string; checked: boolean; onChange: () => void; label: string; desc?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group py-1">
      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "border-white" : "border-zinc-600 group-hover:border-zinc-400"}`}>
        {checked && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
      <input type="radio" className="hidden" value={value} checked={checked} onChange={onChange} />
      <div>
        <p className={`text-sm font-medium ${checked ? "text-white" : "text-zinc-300"}`}>{label}</p>
        {desc && <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>}
      </div>
    </label>
  );
});

// â”€â”€ MessageDestPicker â€” reused for Sales, Engagement, Leads â”€â”€

const MessageDestPicker = React.memo(function MessageDestPicker({ msgDest, setMsgDest }: { msgDest: string; setMsgDest: (v: string) => void }) {
  return (
    <div className="ml-7 mt-2 space-y-1.5">
      <p className="text-xs font-semibold text-zinc-400">Select destination</p>
      <div className="border border-zinc-700 rounded-xl overflow-hidden divide-y divide-zinc-800">
        <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/40 transition-colors">
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${msgDest === "messenger" ? "border-white" : "border-zinc-600"}`}>
            {msgDest === "messenger" && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <input type="radio" className="hidden" checked={msgDest === "messenger"} onChange={() => setMsgDest("messenger")} />
          <p className="text-sm text-zinc-200">Facebook Messenger</p>
        </label>
        <div className="px-4 py-3 opacity-50">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-4 h-4 rounded-full border-2 border-zinc-700 shrink-0" />
            <p className="text-sm text-zinc-400">Instagram DM</p>
          </div>
          <p className="text-[11px] text-zinc-500 ml-7">Selected ad account doesn&apos;t have Instagram connected</p>
          <p className="text-[11px] text-zinc-600 ml-7 mt-0.5">Instagram DMs are disabled because the selected advertising account does not have Instagram logged in.</p>
        </div>
      </div>
    </div>
  );
});

// â”€â”€ Meta Account Picker Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Hootsuite-style: shows Facebook Pages + Ad Accounts from Meta API.

interface MetaPage    { id: string; name: string; picture?: string; }
interface MetaAdAcct2 { id: string; name: string; currency: string; amount_spent: string; status: string; disable_reason?: string | null; }

function MetaPickerModal({
  accountId, accountName, onClose, onSave,
}: {
  accountId: string;
  accountName: string;
  onClose: () => void;
  onSave: (adAccountId: string, adAccountName: string, currency: string, pageId: string, pageName: string) => void;
}) {
  const [loading,    setLoading]    = useState(true);
  const [fetchErr,   setFetchErr]   = useState<string | null>(null);
  const [pages,      setPages]      = useState<MetaPage[]>([]);
  const [adAccounts, setAdAccounts] = useState<MetaAdAcct2[]>([]);
  const [selAdAcct,  setSelAdAcct]  = useState("");
  const [selPage,    setSelPage]    = useState("");
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/api/v1/campaigns/meta/pages?id=${accountId}`),
      api.post(`/api/v1/campaigns/meta/accounts/${accountId}/fetch-ad-accounts`, {}),
    ]).then(([pagesRes, adRes]) => {
      const pList: MetaPage[]    = pagesRes.success ? (pagesRes.data?.pages        || []) : [];
      const aList: MetaAdAcct2[] = adRes.success    ? (adRes.data?.ad_accounts     || []) : [];
      setPages(pList);
      setAdAccounts(aList);
      // Auto-select if only one option each
      const activeAds = aList.filter(a => a.status === "Active");
      if (activeAds.length === 1) setSelAdAcct(activeAds[0].id);
      else if (aList.length === 1) setSelAdAcct(aList[0].id);
      if (pList.length === 1) setSelPage(pList[0].id);
      if (!adRes.success) setFetchErr(adRes.error || "Failed to load from Meta");
    }).catch(() => setFetchErr("Could not reach Meta â€” check your connection"))
    .finally(() => setLoading(false));
  }, [accountId]);

  const handleDone = async () => {
    if (!selAdAcct) return;
    setSaving(true);
    const ad   = adAccounts.find(a => a.id === selAdAcct)!;
    const page = pages.find(p => p.id === selPage);
    onSave(ad.id, ad.name, ad.currency, selPage, page?.name || "");
  };

  const content = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "84vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0">
          <h3 className="text-lg font-bold text-white">Which Facebook ad accounts do you want to add?</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors ml-4 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto border-t border-zinc-800/60">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
              <span className="text-sm text-zinc-500">Loading from Metaâ€¦</span>
            </div>
          ) : fetchErr ? (
            <div className="p-6 text-center space-y-2">
              <p className="text-sm text-rose-400">{fetchErr}</p>
              <p className="text-xs text-zinc-600">Token may be expired. Reconnect from Platform Accounts.</p>
            </div>
          ) : (
            <>
              {/* Ad Accounts list */}
              {adAccounts.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-zinc-400">No ad accounts found under this Facebook account.</p>
                  <p className="text-xs text-zinc-600 mt-1">Create a Meta Business Manager account to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/40">
                  {adAccounts.map(a => {
                    const isSelected = selAdAcct === a.id;
                    const hasIssue   = a.status !== "Active";
                    const isBilling  = a.disable_reason === "Missing payment method";

                    return (
                      <div key={a.id}>
                        <button type="button"
                          onClick={() => setSelAdAcct(a.id)}
                          className={`w-full flex items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-zinc-900/60 cursor-pointer ${
                            isSelected ? "bg-zinc-900/40" : ""
                          }`}>
                          {/* Checkbox */}
                          <div className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-[#1877F2] border-[#1877F2]" : "border-zinc-500 hover:border-zinc-300"
                          }`}>
                            {isSelected && (
                              <svg viewBox="0 0 12 10" className="w-3 h-3">
                                <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          {/* Account info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{a.name}</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">id: {a.id.replace("act_", "")}</p>
                            <p className="text-[10px] text-zinc-600">{a.currency} Â· ${a.amount_spent} spent</p>
                          </div>
                        </button>

                        {/* Warning row â€” shown but doesn't block selection */}
                        {hasIssue && (
                          <div className="px-6 pb-3 pl-[60px] space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
                              <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 shrink-0" fill="currentColor">
                                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                              </svg>
                              {a.disable_reason || "Issue"} for this Ad account
                            </div>
                            {isBilling && (
                              <a href="https://www.facebook.com/ads/manager/billing" target="_blank" rel="noreferrer"
                                className="text-[11px] text-[#1877F2] hover:underline">
                                Add a payment method on Facebook â†—
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pages section */}
              {pages.length > 0 && (
                <div className="border-t border-zinc-800/60">
                  <p className="px-6 pt-4 pb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Which Facebook page to use for ads?</p>
                  <div className="divide-y divide-zinc-800/40">
                    {pages.map(p => {
                      const isSelected = selPage === p.id;
                      return (
                        <button key={p.id} type="button" onClick={() => setSelPage(isSelected ? "" : p.id)}
                          className="w-full flex items-center gap-4 px-6 py-3.5 text-left hover:bg-zinc-900/60 transition-colors">
                          <div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-[#1877F2] border-[#1877F2]" : "border-zinc-500 hover:border-zinc-300"
                          }`}>
                            {isSelected && (
                              <svg viewBox="0 0 12 10" className="w-3 h-3 fill-white">
                                <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          {p.picture ? (
                            <Image src={p.picture} alt="" width={32} height={32} className="rounded-full shrink-0 border border-zinc-700 object-cover" unoptimized />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#1877F2]/20 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-[#1877F2]">{p.name.charAt(0)}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                            <p className="text-[11px] text-zinc-500">Facebook Page</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-950 shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleDone}
            disabled={!selAdAcct || saving || loading}
            className="px-6 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40 min-w-[80px]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Done"}
          </button>
        </div>

      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

// â”€â”€ Main Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function CampaignCreatorModal({ onClose, onCreated, editId }: {
  onClose: () => void;
  onCreated: () => void;
  editId?: string;
}) {
  const [step,       setStep]       = useState(1);
  const [saving,     setSaving]     = useState(false);
  const [publishing,       setPublishing]       = useState(false);
  const [publishingStatus, setPublishingStatus] = useState<string | null>(null);
  const [error,            setError]            = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(editId || null);

  // Step 1
  const [pages,           setPages]         = useState<MetaAccount[]>([]);
  const [selectedPage,    setPage]          = useState("");
  const [adAccounts,      setAdAccts]       = useState<MetaAccount[]>([]); // all Facebook accounts (with or without ad_account_id)
  const [selectedAcc,     setAcc]           = useState("");
  const [metaBalance,     setMetaBalance]   = useState<{ balance: string | null; amount_spent: string; currency: string; spend_cap: string | null } | null>(null);
  // Meta picker modal state
  const [showMetaPicker,   setShowMetaPicker]   = useState(false);
  const [pickerAccountId,  setPickerAccountId]  = useState("");

  const openMetaPicker = () => {
    // Resolve which connected account the picker is for
    const acc = adAccounts.find(a => a.id === selectedAcc) || adAccounts[0];
    if (acc) { setPickerAccountId(acc.id); setAcc(acc.id); }
    setShowMetaPicker(true);
  };

  const handleMetaPickerSave = async (adAccountId: string, adAccountName: string, currency: string, pageId: string, _pageName: string) => {
    const connectedId = pickerAccountId || selectedAcc || adAccounts[0]?.id;
    if (!connectedId) return;

    await api.post(`/api/v1/campaigns/meta/accounts/${connectedId}/set-ad-account`, {
      ad_account_id:       adAccountId,
      ad_account_name:     adAccountName,
      ad_account_currency: currency,
      page_id:             pageId || undefined,  // persist numeric FB Page ID for ad creative
    });

    // Refresh so the new ad_account_id shows immediately
    const r = await api.get("/api/v1/campaigns/meta/accounts");
    const accs: MetaAccount[] = r.data?.accounts || [];
    const fb = accs.filter(a => a.platform === "facebook");
    setPages(fb); setAdAccts(fb);
    setAcc(connectedId);
    if (pageId) setPage(pageId);
    setShowMetaPicker(false);
  };
  const [campName,    setCampName]  = useState("New campaign");
  const [objective,   setObjective] = useState("TRAFFIC");
  const [optimize,    setOptimize]     = useState("LANDING_PAGE_VIEWS");
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [convLocation, setConvLocation] = useState("website");
  const [engType,      setEngType]      = useState("POST_ENGAGEMENT");
  const [engTypeOpen,  setEngTypeOpen]  = useState(false);
  const [specialCat,  setSpecial]      = useState(false);
  const [specialCatType, setSpecialCatType] = useState("");

  // Step 2
  const [ageMin,      setAgeMin]         = useState("18");
  const [ageMax,      setAgeMax]         = useState("65");
  const [gender,      setGender]         = useState("ALL");
  const [location,    setLocation]       = useState(() => JSON.stringify([{ key: "US", display_name: "United States", type: "country" }]));
  const [interests,   setInterests]      = useState<{id:string;name:string}[]>([]);
  const [msgDest,        setMsgDest]        = useState("messenger");
  const [trackingPixel,  setTrackingPixel]  = useState("");
  const [convEvent,      setConvEvent]      = useState("");
  const [pixelDropOpen,  setPixelDropOpen]  = useState(false);
  const [eventDropOpen,  setEventDropOpen]  = useState(false);
  const [pixelSearch,    setPixelSearch]    = useState("");
  const [eventSearch,    setEventSearch]    = useState("");
  const [euTargeting,    setEuTargeting]    = useState(false);
  const [euConfirmed,  setEuConfirmed]  = useState(false);
  const [beneficiary,  setBeneficiary]  = useState("");
  const [payer,        setPayer]        = useState("");
  const [autoPlace,          setAutoPlace]          = useState(true);
  const [deviceType,         setDeviceType]         = useState("all");
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>(
    ALL_PLACEMENTS.map(p => p.id) // all selected by default
  );
  const [showEditAud,    setShowEditAud]    = useState(false);
  const [showExclude,      setShowExclude]      = useState(false);
  const [tmpExcludeLoc,    setTmpExcludeLoc]    = useState("");   // legacy - unused
  const [excludeLocations, setExcludeLocations] = useState<{key:string; display_name:string; type:string}[]>([]);
  const [locResults,       setLocResults]       = useState<{key:string;display_name:string}[]>([]);
  const [intResults,       setIntResults]       = useState<{id:string;name:string}[]>([]);
  const [locLoading,       setLocLoading]       = useState(false);
  const [intLoading,       setIntLoading]       = useState(false);
  const [locInputVal,      setLocInputVal]      = useState("");
  const [intInputVal,      setIntInputVal]      = useState("");

  // Debounced location search
  const searchLoc = React.useCallback(async (q: string) => {
    if (q.length < 2) { setLocResults([]); return; }
    setLocLoading(true);
    try {
      const r = await api.get(`/api/v1/campaigns/meta/search/locations?q=${encodeURIComponent(q)}`);
      if (r.success) setLocResults(r.data?.locations || []);
    } catch { setLocResults([]); }
    finally { setLocLoading(false); }
  }, []);

  // Debounced interest search
  const searchInt = React.useCallback(async (q: string) => {
    if (q.length < 2) { setIntResults([]); return; }
    setIntLoading(true);
    try {
      const r = await api.get(`/api/v1/campaigns/meta/search/interests?q=${encodeURIComponent(q)}`);
      if (r.success) setIntResults(r.data?.interests || []);
    } catch { setIntResults([]); }
    finally { setIntLoading(false); }
  }, []);
  const [audDropOpen,      setAudDropOpen]      = useState(false);
  const [showMediaErr,     setShowMediaErr]     = useState(false);
  const [reachLoading,     setReachLoading]     = useState(false);
  const [potentialReach,   setPotentialReach]   = useState<string>("--");
  // Separate search state for exclude locations
  const [exLocResults,   setExLocResults]   = useState<{key:string;display_name:string;type:string}[]>([]);
  const [exLocLoading,   setExLocLoading]   = useState(false);
  const [exLocInput,     setExLocInput]     = useState("");
  const searchExclude = React.useCallback(async (q: string) => {
    if (q.length < 2) { setExLocResults([]); return; }
    setExLocLoading(true);
    try {
      const r = await api.get(`/api/v1/campaigns/meta/search/locations?q=${encodeURIComponent(q)}`);
      if (r.success) setExLocResults(r.data?.locations || []);
    } catch { setExLocResults([]); }
    finally { setExLocLoading(false); }
  }, []);
  // Temp state for edit modal
  const [tmpAge,        setTmpAge]        = useState(["18","65"]);
  const [tmpGender,     setTmpGender]     = useState("ALL");
  const [audienceError, setAudienceError] = useState<string | null>(null);
  const [tmpLoc,    setTmpLoc]    = useState<{key:string; display_name:string; type:string}[]>([{ key: "US", display_name: "United States", type: "country" }]);
  const [tmpExcLocItems, setTmpExcLocItems] = useState<{key:string; display_name:string; type:string}[]>([]);
  const [tmpInt,    setTmpInt]    = useState<{id:string;name:string}[]>([]);
  const [budgetAmt,   setBudget]    = useState("10.00");
  const [budgetType,  setBudgetType]= useState<"daily"|"total">("daily");
  const [startDate,   setStart]     = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate,     setEnd]       = useState("");

  // Step 3
  const [previewTab,     setPreview]      = useState<"desktop"|"mobile"|"instagram">("desktop");
  const [ads,            setAds]          = useState<AdData[]>([{ name: "New ad", copy: "", headline: "", website_url: "", cta: "Learn more", image_url: "" }]);
  const [selectedAdIdx,  setSelectedAdIdx]= useState(0);
  const [showSummary,    setShowSummary]  = useState(false);
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [addWebsiteUrl,    setAddWebsiteUrl]    = useState(false);
  const [welcomeMsg,       setWelcomeMsg]       = useState("");
  const [showWelcomeErr,   setShowWelcomeErr]   = useState(false);
  const [imageUploading,   setImageUploading]   = useState(false);
  const [imageUploadErr,   setImageUploadErr]   = useState<string | null>(null);
  const uploadCounterRef = useRef(0);

  const uploadAdImage = async (file: File) => {
    setImageUploading(true); setImageUploadErr(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid  = user?.id || "anon";
      const ext  = file.name.split(".").pop()?.toLowerCase() || "jpg";
      uploadCounterRef.current += 1;
      const path = `${uid}/${uploadCounterRef.current}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("campaign-images")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) {
        if (upErr.message?.includes("Bucket not found") || upErr.message?.includes("bucket")) {
          throw new Error('Storage bucket not set up. Create a public bucket named "campaign-images" in Supabase Storage.');
        }
        throw new Error(upErr.message);
      }

      const { data: urlData } = supabase.storage
        .from("campaign-images")
        .getPublicUrl(path);

      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Could not get public URL from storage");

      setAd(a => ({ ...a, image_url: publicUrl }));
      setShowMediaErr(false);
      clearErr("adImage");
      // Register in media_library so it appears in Media Vault picker
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      api.post("/api/v1/library/upload", { title: file.name, urls: [publicUrl], file_type: mediaType }).catch(() => {});
    } catch (e: unknown) {
      setImageUploadErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setImageUploading(false);
    }
  };
  const ad = ads[selectedAdIdx] || ads[0];
  const setAd = (updater: (prev: AdData) => AdData) => {
    setAds(prev => prev.map((a, i) => i === selectedAdIdx ? updater(a) : a));
  };

  // Load meta accounts
  useEffect(() => {
    api.get("/api/v1/campaigns/meta/accounts").then(r => {
      const accs: MetaAccount[] = r.data?.accounts || [];
      const fb = accs.filter(a => a.platform === "facebook");
      setPages(fb);
      setAdAccts(fb); // show ALL Facebook accounts, not just those with ad_account_id
      if (fb.length > 0) setPage(fb[0].id);
      const withAd = fb.find(a => a.ad_account_id);
      if (withAd) setAcc(withAd.id);
      else if (fb[0]) setAcc(fb[0].id);
    }).catch(() => {});
  }, []);

  // Fetch Meta ad account balance whenever the selected account changes
  useEffect(() => {
    if (!selectedAcc) { setMetaBalance(null); return; }
    api.get("/api/v1/campaigns/meta/ad-account-details").then(r => {
      if (r.success && r.data) {
        setMetaBalance({
          balance:      r.data.balance ?? null,
          amount_spent: r.data.amount_spent ?? "0.00",
          currency:     r.data.currency ?? "USD",
          spend_cap:    r.data.spend_cap ?? null,
        });
      } else {
        setMetaBalance(null);
      }
    }).catch(() => setMetaBalance(null));
  }, [selectedAcc]);

  const [adsSidebarOpen, setAdsSidebarOpen] = useState(true);

  // Reset ads sidebar when entering Step 3
  useEffect(() => { if (step === 3) setAdsSidebarOpen(true); }, [step]);

  // Real potential reach from Meta Reach Estimate API
  useEffect(() => {
    if (!ageMin) return;
    setReachLoading(true);
    setPotentialReach("--");

    let geoArr: {key:string; type:string}[] = [];
    try { geoArr = JSON.parse(location); } catch { /* no location yet */ }

    api.post('/api/v1/campaigns/meta/reach-estimate', {
      age_min:          parseInt(ageMin),
      age_max:          parseInt(ageMax || "65"),
      gender,
      geography:        geoArr,
      optimization_goal: optimize || "REACH",
    }).then(r => {
      if (r.success && r.data?.estimate) {
        setPotentialReach(r.data.estimate);
      } else {
        setPotentialReach("Unavailable");
      }
    }).catch(() => setPotentialReach("Unavailable"))
    .finally(() => setReachLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageMin, ageMax, gender, location]);

  // Load existing campaign data when editing
  useEffect(() => {
    if (!editId) return;
    api.get(`/api/v1/campaigns/${editId}`).then(r => {
      const c = r.data;
      if (!c) return;
      if (c.name)      setCampName(c.name);
      if (c.objective) setObjective(c.objective);
      if (c.platforms?.length) { /* platforms stored for reference */ }

      // Budget / dates â€” prefer daily, fall back to total
      if (c.budget_daily)                     { setBudget(String(c.budget_daily)); setBudgetType("daily"); }
      else if (c.budget_total && !c.budget_daily) { setBudget(String(c.budget_total)); setBudgetType("total"); }
      if (c.start_at)  setStart(c.start_at.split("T")[0]);
      if (c.end_at)    setEnd(c.end_at.split("T")[0]);

      // Targeting
      const t = c.targeting || {};
      if (t.age_min)   setAgeMin(String(t.age_min));
      if (t.age_max)   setAgeMax(String(t.age_max));
      if (t.gender)    setGender(t.gender);
      if (t.geography?.length) {
        // Normalise: support both old string[] and new {key,display_name,type}[] format
        const geoLocs: {key:string;display_name:string;type:string}[] = t.geography.map((g: any) =>
          typeof g === "object" && g.key ? g : { key: String(g).slice(0,2).toUpperCase(), display_name: String(g), type: "country" }
        );
        setLocation(JSON.stringify(geoLocs));
        setTmpLoc(geoLocs);
      }
      if (t.excluded_geography?.length) setExcludeLocations(t.excluded_geography);
      if (t.interests?.length) {
        const intArr: {id:string;name:string}[] = t.interests.map((i: any) =>
          typeof i === "object" && i.id ? i : { id: String(i), name: String(i) }
        );
        setInterests(intArr);
        setTmpInt(intArr);
      }

      // Boost settings
      const bs = c.boost_settings || {};
      if (bs.optimize)      setOptimize(bs.optimize);
      if (bs.conv_location) setConvLocation(bs.conv_location);
      if (bs.eng_type)      setEngType(bs.eng_type);
      if (bs.msg_dest)      setMsgDest(bs.msg_dest);
      if (bs.device_type)   setDeviceType(bs.device_type);
      if (bs.placements === "automatic") {
        setAutoPlace(true);
      } else if (Array.isArray(bs.placements) && bs.placements.length) {
        setAutoPlace(false); setSelectedPlacements(bs.placements);
      }
      if (bs.special_category) { setSpecial(true); setSpecialCatType(bs.special_category); }
      if (c.eu_targeting)   setEuTargeting(c.eu_targeting);
      if (c.eu_beneficiary) setBeneficiary(c.eu_beneficiary);
      if (c.eu_payer)       setPayer(c.eu_payer);
      if (c.tracking_pixel_id) setTrackingPixel(c.tracking_pixel_id);
      if (c.conversion_event)  setConvEvent(c.conversion_event);
      if (c.welcome_message)   setWelcomeMsg(c.welcome_message);
      if (c.selected_meta_account_id) setAcc(c.selected_meta_account_id);

      // Creative â€” use ads_data array if present, fall back to single creative
      const cr = c.creative || {};
      const loadedAds: AdData[] = Array.isArray(c.ads_data) && c.ads_data.length > 0
        ? c.ads_data.map((a: any) => ({
            name:         a.name             || "New ad",
            copy:         a.copy_text        || "",
            headline:     a.headline         || "",
            website_url:  a.landing_page_url || "",
            cta:          a.cta_text         || "Learn more",
            image_url:    a.ad_image_url     || "",
            ad_type:      (a.meta_ad_type === "video_ad" || a.meta_ad_type === "lead_ad") ? a.meta_ad_type : "image_ad",
            video_url:    a.ad_video_url     || "",
            lead_form_id: a.lead_form_id     || "",
          }))
        : [{
            name:         "New ad",
            copy:         cr.copy_text        || "",
            headline:     cr.headline         || "",
            website_url:  cr.landing_page_url || "",
            cta:          cr.cta_text         || "Learn more",
            image_url:    cr.ad_image_url     || "",
            ad_type:      (cr.meta_ad_type === "video_ad" || cr.meta_ad_type === "lead_ad") ? cr.meta_ad_type as "video_ad"|"lead_ad" : "image_ad" as const,
            video_url:    cr.ad_video_url     || "",
            lead_form_id: cr.lead_form_id     || "",
          }];
      setAds(loadedAds);
      setSelectedAdIdx(0);

      // Jump to step where user left off
      const ws = c.wizard_step || 1;
      setStep(ws > 4 ? 3 : ws);
    }).catch(() => { /* silent â€” new campaign */ });
  }, [editId]);  

  // Compute effective objective for placement filtering
  const effectiveObjective =
    objective === "ENGAGEMENT"      && convLocation === "on_ad"      && engType === "POST_ENGAGEMENT" ? "ENGAGEMENT_POST_AD"      :
    objective === "ENGAGEMENT"      && convLocation === "on_ad"      && engType === "VIDEO_VIEWS"     ? "ENGAGEMENT_VIDEO_AD"     :
    objective === "ENGAGEMENT"      && convLocation === "website"                                     ? "ENGAGEMENT_WEBSITE"      :
    objective === "LEAD_GENERATION" && convLocation === "website_lead" ? "LEAD_GENERATION_WEBSITE" :
    convLocation === "message" ? "CONVERSIONS_MESSAGE" :
    objective;

  // When effective objective changes, reset available placements
  useEffect(() => {
    setSelectedPlacements(
      ALL_PLACEMENTS
        .filter(p => !p.unavailableFor?.includes(effectiveObjective))
        .map(p => p.id)
    );
  }, [effectiveObjective]);

  // When objective changes, reset conversion location, optimize, and related state.
  // Dep = [objective] only â€” effectiveObjective derives from convLocation, so including
  // it here caused a loop: changing convLocation â†’ effectiveObjective changes â†’ useEffect
  // fires â†’ convLocation gets reset, making it impossible to select a conversion location.
  useEffect(() => {
    const defaultLoc =
      objective === "ENGAGEMENT"      ? "on_ad"        :
      objective === "LEAD_GENERATION" ? "instant_form" :
      "website";
    setConvLocation(defaultLoc);
    setMsgDest("messenger");
    setEngType("POST_ENGAGEMENT");
    setEngTypeOpen(false);
    setOptimizeOpen(false);
    // Derive the starting effectiveObjective from the reset convLocation
    const defaultEffective =
      objective === "ENGAGEMENT"      ? "ENGAGEMENT_POST_AD"       :
      objective === "LEAD_GENERATION" ? "LEAD_GENERATION"          :
      objective;
    const opts = OPTIMIZE_OPTIONS[defaultEffective] || OPTIMIZE_OPTIONS[objective] || [];
    setOptimize(opts[0]?.value || "");
  }, [objective]);

  // Step summaries for left sidebar
  const summaries: Record<number, string[]> = {
    1: [
      pages.find(p => p.id === selectedPage)?.account_name ? `Page: ${pages.find(p => p.id === selectedPage)?.account_name}` : "",
      adAccounts.find(a => a.id === selectedAcc)?.account_name ? `Ad account: ${adAccounts.find(a => a.id === selectedAcc)?.account_name}` : "",
      campName ? `Campaign name: ${campName}` : "",
      objective ? `Campaign objective: ${OBJECTIVES.find(o => o.value === objective)?.label || ""}` : "",
      optimize ? `Optimization and delivery: ${OPTIMIZE_OPTIONS[effectiveObjective]?.find(o => o.value === optimize)?.label || optimize}` : "",
    ].filter(Boolean),
    2: [
      "Built audience",
      autoPlace ? "Automatic placements" : `Manual placements (${selectedPlacements.length})`,
      (objective === "CONVERSIONS" && convLocation !== "message" && optimize === "OFFSITE_CONVERSIONS") ? "Tracking" : "",
      budgetAmt ? `Budget: ${(()=>{const c=adAccounts.find(a=>a.id===selectedAcc)?.ad_account_currency||"USD";const s:Record<string,string>={USD:"$",INR:"â‚¹",EUR:"â‚¬",GBP:"Â£",AUD:"A$",SGD:"S$",MYR:"RM",AED:"Ø¯.Ø¥"};return s[c]||(c+" ");})()}${budgetAmt} per ${budgetType === "daily" ? "day" : "total"}` : "",
      startDate ? `From: ${new Date(startDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}` : "",
    ].filter(Boolean),
    3: ["Ads", ad.name],
    4: ["Summary"],
  };

  const buildPayload = (wizardStep: number) => ({
    name:          campName,
    campaign_type: "PAID_ADS",
    objective,
    platforms:     ["Meta"],
    budget_total:  budgetType === "total" ? parseFloat(budgetAmt) : null,
    budget_daily:  budgetType === "daily" ? parseFloat(budgetAmt) : null,
    budget_currency: adAccounts.find(a => a.id === selectedAcc)?.ad_account_currency || "USD",
    start_at:      startDate || null,
    end_at:        endDate   || null,
    selected_meta_account_id: selectedAcc || null,
    eu_targeting:   euTargeting,
    eu_beneficiary: euTargeting ? beneficiary || null : null,
    eu_payer:       euTargeting ? payer       || null : null,
    tracking_pixel_id: trackingPixel || null,
    conversion_event:  convEvent     || null,
    welcome_message:   convLocation === "message" ? welcomeMsg || null : null,
    device_type:       deviceType,
    targeting: {
      age_min:   parseInt(ageMin),
      age_max:   parseInt(ageMax),
      gender,
      geography: (() => { try { return JSON.parse(location); } catch { return [{ key: "US", display_name: location, type: "country" }]; } })(),
      excluded_geography: excludeLocations,
      interests: interests,
    },
    ads_data: ads.map(a => {
      const effectiveType = convLocation === "message" ? "messenger" : (a.ad_type || "image_ad");
      return {
        name:             a.name,
        copy_text:        a.copy,
        headline:         a.headline,
        cta_text:         a.cta,
        landing_page_url: a.website_url  || null,
        ad_image_url:     a.image_url    || null,
        meta_ad_type:     effectiveType,
        ad_video_url:     a.video_url    || null,
        lead_form_id:     a.lead_form_id || null,
      };
    }),
    creative: {
      headline:         ad.headline,
      copy_text:        ad.copy,
      cta_text:         ad.cta,
      landing_page_url: ad.website_url  || null,
      ad_image_url:     ad.image_url    || null,
      meta_ad_type:     convLocation === "message" ? "messenger" : (ad.ad_type || "image_ad"),
      ad_video_url:     ad.video_url    || null,
      lead_form_id:     ad.lead_form_id || null,
    },
    boost_settings: {
      optimize:         optimize,
      conv_location:    convLocation,
      eng_type:         engType,
      msg_dest:         msgDest,
      placements:       autoPlace ? "automatic" : selectedPlacements,
      device_type:      deviceType,
      special_category: specialCat ? specialCatType : null,
    },
    wizard_step: wizardStep,
  });

  const saveAsDraft = async () => {
    setSaving(true); setError(null);
    try {
      const payload = buildPayload(step);
      if (campaignId) {
        await api.patch(`/api/v1/campaigns/${campaignId}`, payload);
      } else {
        const r = await api.post("/api/v1/campaigns", payload);
        if (r.data?.id) setCampaignId(r.data.id);
      }
      onClose();
    } catch { setError("Failed to save draft"); }
    finally { setSaving(false); }
  };

  const publish = async () => {
    setPublishing(true); setError(null);
    try {
      let cid = campaignId;
      const campaignPayload = buildPayload(4);

      if (!cid) {
        const r = await api.post("/api/v1/campaigns", campaignPayload);
        if (!r.success) throw new Error(r.error || "Failed to save campaign");
        cid = r.data?.id;
        if (cid) setCampaignId(cid);
      } else {
        const r = await api.patch(`/api/v1/campaigns/${cid}`, campaignPayload);
        if (!r.success) throw new Error(r.error || "Failed to update campaign");
      }

      if (!cid) throw new Error("Failed to save campaign â€” no ID returned");

      // 2. Publish to Meta Marketing API â€” use a separate status string, not the error state
      setPublishingStatus("Publishing to Facebook...");
      const metaResult = await api.post(`/api/v1/campaigns/${cid}/publish-to-meta`, {});
      setPublishingStatus(null);

      if (!metaResult.success) {
        throw new Error(metaResult.error || "Meta API error");
      }

      onCreated();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        || (e instanceof Error ? e.message : "Failed to publish campaign");
      setError(msg);
    } finally { setPublishing(false); }
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearErr = (key: string) => setFieldErrors(prev => { const n = {...prev}; delete n[key]; return n; });

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};

    if (s === 1) {
      if (!campName.trim() || campName.trim().length < 2)
        errs.campName = "Campaign name is required (min 2 characters)";
      if (!selectedPage)
        errs.selectedPage = "Select a Facebook page to continue";
      const selAccObj = adAccounts.find(a => a.id === selectedAcc);
      if (!selAccObj)
        errs.selectedAcc = "Select a Facebook account to continue";
      else if (!selAccObj.ad_account_id)
        errs.selectedAcc = "Link an ad account before continuing â€” click \"Select accounts\"";
    }

    if (s === 2) {
      const budget   = parseFloat(budgetAmt);
      const currency = adAccounts.find(a => a.id === selectedAcc)?.ad_account_currency || "USD";
      const minBudget: Record<string, number> = { USD:1, INR:97, EUR:1, GBP:1, AUD:2, SGD:2, MYR:5, AED:4 };
      const min = minBudget[currency] || 1;
      if (!budgetAmt || isNaN(budget) || budget < min)
        errs.budget = `Budget must be at least ${min} ${currency} per day`;
      if (!startDate)
        errs.startDate = "Start date is required";
    }

    if (s === 3) {
      const adType = convLocation === "message" ? "messenger" : (ad.ad_type || "image_ad");
      if (adType === "image_ad" && !ad.image_url)
        errs.adImage = "Add an image before continuing";
      else if (adType === "video_ad" && !ad.video_url)
        errs.adImage = "Enter a Facebook-hosted video ID or URL";
      else if (adType === "lead_ad" && !ad.lead_form_id)
        errs.adImage = "Enter your Meta Lead Gen Form ID";
      if (convLocation === "message" && !welcomeMsg.trim())
        errs.welcomeMsg = "Welcome message is required for message destination campaigns";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextLabel: Record<number, string> = {
    1: "Next: Audience and budget",
    2: "Next: Create an ad",
    3: "Publish campaign",
  };

  const [modalSidebarOpen, setModalSidebarOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const closeAllDropdowns = React.useCallback(() => {
    setOptimizeOpen(false); setEngTypeOpen(false);
    setAudDropOpen(false); setPixelDropOpen(false); setEventDropOpen(false);
  }, []);

  const anyDropOpen = optimizeOpen || engTypeOpen || audDropOpen || pixelDropOpen || eventDropOpen;
  if (!mounted) return null;

  const modal = createPortal(
    <div className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/65 backdrop-blur-sm pt-3 px-4">
      <div className="relative w-full bg-zinc-900 rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ maxWidth: 1100, height: "96vh" }}>
        {/* Invisible overlay â€” closes all dropdowns when clicking outside them */}
        {anyDropOpen && (
          <div className="absolute inset-0 z-[45]" onMouseDown={closeAllDropdowns} />
        )}

        {/* Meta account picker â€” rendered as portal above this modal */}
        {showMetaPicker && (() => {
          const accId  = pickerAccountId || selectedAcc || adAccounts[0]?.id;
          const accObj = adAccounts.find(a => a.id === accId);
          if (!accId) return null;
          return (
            <MetaPickerModal
              accountId={accId}
              accountName={accObj?.account_name || "Facebook"}
              onClose={() => setShowMetaPicker(false)}
              onSave={handleMetaPickerSave}
            />
          );
        })()}

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-base font-bold text-white">{editId ? "Edit Facebook ad campaign" : "New Facebook ad campaign"}</h2>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left sidebar â€” steps (collapsible) */}
          <div className={`shrink-0 border-r border-zinc-800 flex flex-col transition-all duration-200 ${modalSidebarOpen ? "w-52" : "w-8"}`}>
            {/* Collapse toggle */}
            <button type="button" onClick={() => setModalSidebarOpen(o => !o)}
              className="flex items-center justify-center w-full h-8 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors shrink-0">
              <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 transition-transform ${modalSidebarOpen ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {modalSidebarOpen && <div className="flex-1 overflow-y-auto">
            {SIDEBAR_STEPS.map(s => {
              const done    = s.num < step;
              const current = s.num === step;
              const sums    = summaries[s.num] || [];
              return (
                <div key={s.num}
                  className={`px-4 py-3 border-l-2 transition-colors ${
                    current ? "border-amber-500 bg-amber-500/5" :
                    done    ? "border-zinc-700 cursor-pointer hover:bg-zinc-800/50" :
                              "border-transparent opacity-40"
                  }`}
                  onClick={() => done && setStep(s.num)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      current ? "bg-amber-500 text-zinc-900" :
                      done    ? "bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-500"
                    }`}>{s.num}</div>
                    <p className={`text-xs font-bold ${current ? "text-white" : "text-zinc-400"}`}>{s.label}</p>
                  </div>
                  {(current || done) && sums.map((line, i) => (
                    <p key={i} className="text-[10px] text-zinc-500 pl-7 leading-snug">{line}</p>
                  ))}
                </div>
              );
            })}
            </div>}
          </div>

          {/* Right content area */}
          <div className="flex-1 overflow-y-auto">

            {/* â”€â”€ STEP 1 â”€â”€ */}
            {step === 1 && (
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">Facebook Page and ad account</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Choose the Facebook Page and ad account to use for this campaign.</p>
                  </div>

                  {adAccounts.length === 0 ? (
                    /* No Facebook accounts connected at all */
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                      <p className="text-sm font-semibold text-amber-400">No Facebook accounts connected</p>
                      <p className="text-xs text-zinc-500">Connect a Facebook account first to run ad campaigns.</p>
                      <a href="/accounts" target="_blank"
                        className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white text-xs font-semibold rounded-lg transition-colors">
                        Connect Facebook account
                      </a>
                    </div>
                  ) : (
                    <>
                      {/* Connected account card */}
                      {(() => {
                        const sel = adAccounts.find(a => a.id === selectedAcc) || adAccounts[0];
                        const hasAdAccount = !!sel?.ad_account_id;
                        return (
                          <div className="border border-zinc-700 rounded-xl overflow-hidden">
                            {/* Facebook account row */}
                            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-900/40">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-[#1877F2]/20 border border-[#1877F2]/30 flex items-center justify-center shrink-0">
                                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#1877F2]">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">{sel?.account_name || "Facebook"}</p>
                                  {adAccounts.length > 1 && (
                                    <div className="relative mt-0.5">
                                      <select value={selectedAcc} onChange={e => setAcc(e.target.value)}
                                        className="text-[10px] text-zinc-500 bg-transparent outline-none cursor-pointer pr-3 appearance-none">
                                        {adAccounts.map(a => (
                                          <option key={a.id} value={a.id}>{a.account_name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Always-visible button to open picker */}
                              <button type="button" onClick={openMetaPicker}
                                className="shrink-0 px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold rounded-lg transition-colors">
                                {hasAdAccount ? "Change" : "Select accounts"}
                              </button>
                            </div>

                            {/* Ad account + page status */}
                            <div className="divide-y divide-zinc-800/60">
                              <div className="flex items-center justify-between px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <p className="text-[11px] text-zinc-500 w-20 shrink-0">Ad Account</p>
                                  {hasAdAccount ? (
                                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                      {sel!.ad_account_id}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-amber-400">Not linked â€” click &quot;Select accounts&quot;</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 px-4 py-2.5">
                                <p className="text-[11px] text-zinc-500 w-20 shrink-0">Page</p>
                                <span className="text-[11px] text-zinc-300 truncate">{sel?.account_name || "â€”"}</span>
                              </div>
                              {/* Meta ad account balance â€” fetched from Meta Graph API */}
                              {metaBalance && (
                                <div className="px-4 py-2.5 flex items-center gap-4 bg-zinc-900/60 border-t border-zinc-800/60">
                                  <div>
                                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Account Balance</p>
                                    <p className={`text-xs font-bold ${metaBalance.balance !== null ? "text-emerald-400" : "text-zinc-500"}`}>
                                      {metaBalance.balance !== null
                                        ? `${metaBalance.currency} ${parseFloat(metaBalance.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                        : "â€”"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Spent</p>
                                    <p className="text-xs font-semibold text-zinc-300">
                                      {metaBalance.currency} {parseFloat(metaBalance.amount_spent).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                  {metaBalance.spend_cap && (
                                    <div>
                                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Spend Cap</p>
                                      <p className="text-xs font-semibold text-zinc-400">
                                        {metaBalance.currency} {parseFloat(metaBalance.spend_cap).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </p>
                                    </div>
                                  )}
                                  <p className="text-[10px] text-zinc-600 ml-auto">Live from Meta</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      <a href="/accounts" target="_blank"
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                        <span className="w-3.5 h-3.5 rounded-full border border-zinc-600 flex items-center justify-center text-[9px]">+</span>
                        Connect another Facebook account
                      </a>
                    </>
                  )}
                  {fieldErrors.selectedAcc && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1"><span>âš </span>{fieldErrors.selectedAcc}</p>
                  )}
                  {fieldErrors.selectedPage && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1"><span>âš </span>{fieldErrors.selectedPage}</p>
                  )}
                </div>

                <div className="border-t border-zinc-800 pt-5 space-y-5">
                  <Field label="Campaign name" hint="Give your campaign a name. You can change it at any time.">
                    <input
                      value={campName}
                      onChange={e => { setCampName(e.target.value); clearErr("campName"); }}
                      className={inp + (fieldErrors.campName ? " border-rose-500" : "")}
                      placeholder="New campaign"
                    />
                    {fieldErrors.campName && <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1"><span>âš </span>{fieldErrors.campName}</p>}
                  </Field>
                </div>

                <div className="border-t border-zinc-800 pt-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-0.5">Campaign objective</h4>
                    <p className="text-xs text-zinc-500">Your campaign objective is the business outcome you want to achieve with your campaign.</p>
                  </div>
                  <p className="text-xs font-semibold text-zinc-400">Select a campaign objective</p>
                  <div className="space-y-1">
                    {OBJECTIVES.map(o => (
                      <Radio key={o.value} value={o.value} checked={objective === o.value}
                        onChange={() => {
                          setObjective(o.value);
                          // Clear conversion tracking if leaving CONVERSIONS objective
                          if (o.value !== "CONVERSIONS") {
                            setTrackingPixel("");
                            setConvEvent("");
                          }
                        }}
                        label={o.label} desc={o.desc} />
                    ))}
                  </div>
                </div>

                {/* Conversion location â€” hidden for Awareness */}
                {objective !== "AWARENESS" && (
                <div className="border-t border-zinc-800 pt-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-0.5">Conversion location</h4>
                    <p className="text-xs text-zinc-500">Choose where you want people to take your desired action.</p>
                  </div>

                  {/* Traffic â€” Website only */}
                  {objective === "TRAFFIC" && (
                    <Radio value="website" checked label="Website" desc="Drive traffic to your website and marketing landing pages." onChange={() => setConvLocation("website")} />
                  )}

                  {/* Sales â€” On your website + Message destination */}
                  {objective === "CONVERSIONS" && (
                    <div className="space-y-2">
                      <Radio value="website" checked={convLocation !== "message"} label="On your website"
                        onChange={() => { setConvLocation("website"); setOptimize(OPTIMIZE_OPTIONS["CONVERSIONS"]?.[0]?.value || ""); }} />
                      <Radio value="message" checked={convLocation === "message"} label="Message destination"
                        desc="Send people to Messenger, Instagram or WhatsApp to start a conversation with your business."
                        onChange={() => { setConvLocation("message"); setOptimize(OPTIMIZE_OPTIONS["CONVERSIONS_MESSAGE"]?.[0]?.value || ""); }} />

                      {convLocation === "message" && <MessageDestPicker msgDest={msgDest} setMsgDest={setMsgDest} />}
                    </div>
                  )}

                  {/* Leads â€” 3 conversion location options */}
                  {objective === "LEAD_GENERATION" && (
                    <div className="space-y-1">
                      <Radio value="instant_form" checked={convLocation === "instant_form"}
                        label="On your instant form"
                        onChange={() => { setConvLocation("instant_form"); setOptimize(OPTIMIZE_OPTIONS["LEAD_GENERATION"]?.[0]?.value || ""); }} />
                      <Radio value="website_lead" checked={convLocation === "website_lead"}
                        label="On your website"
                        onChange={() => { setConvLocation("website_lead"); setOptimize(OPTIMIZE_OPTIONS["LEAD_GENERATION_WEBSITE"]?.[0]?.value || ""); }} />
                      <Radio value="message" checked={convLocation === "message"} label="Message destination"
                        desc="Send people to Messenger, Instagram or WhatsApp to start a conversation with your business."
                        onChange={() => { setConvLocation("message"); setOptimize(OPTIMIZE_OPTIONS["CONVERSIONS_MESSAGE"]?.[0]?.value || ""); }} />
                      {convLocation === "message" && <MessageDestPicker msgDest={msgDest} setMsgDest={setMsgDest} />}
                    </div>
                  )}

                  {/* Engagement â€” 3 options */}
                  {objective === "ENGAGEMENT" && (
                    <div className="space-y-1">
                      <Radio value="on_ad"   checked={convLocation === "on_ad"}   label="On your ad"
                        onChange={() => { setConvLocation("on_ad");  setOptimize(OPTIMIZE_OPTIONS["ENGAGEMENT"]?.[0]?.value || ""); }} />
                      <Radio value="website" checked={convLocation === "website"} label="On your website"
                        onChange={() => { setConvLocation("website"); setOptimize(OPTIMIZE_OPTIONS["ENGAGEMENT_WEBSITE"]?.[0]?.value || ""); }} />
                      <Radio value="message" checked={convLocation === "message"} label="Message destination"
                        desc="Send people to Messenger, Instagram or WhatsApp to start a conversation with your business."
                        onChange={() => { setConvLocation("message"); setOptimize(OPTIMIZE_OPTIONS["CONVERSIONS_MESSAGE"]?.[0]?.value || ""); }} />
                      {convLocation === "message" && <MessageDestPicker msgDest={msgDest} setMsgDest={setMsgDest} />}
                    </div>
                  )}
                </div>
                )}

                {/* Engagement type selector â€” shown when "On your ad" */}
                {objective === "ENGAGEMENT" && convLocation === "on_ad" && (
                    <Field label="Select a type of engagement">
                      <div className="relative">
                        <button type="button" onClick={() => setEngTypeOpen(o => !o)}
                          className={inp + " flex items-center justify-between text-left"}>
                          <span>{engType === "POST_ENGAGEMENT" ? "Post engagement" : "Video views"}</span>
                          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${engTypeOpen ? "rotate-180" : ""}`} />
                        </button>
                        {engTypeOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                            {[
                              { value: "POST_ENGAGEMENT", label: "Post engagement" },
                              { value: "VIDEO_VIEWS",     label: "Video views"     },
                            ].map(et => (
                              <button key={et.value} type="button"
                                onClick={() => {
                                  setEngType(et.value);
                                  setEngTypeOpen(false);
                                  // Update optimize options for video vs post
                                  const key = et.value === "VIDEO_VIEWS" ? "ENGAGEMENT_VIDEO" : "ENGAGEMENT";
                                  setOptimize(OPTIMIZE_OPTIONS[key]?.[0]?.value || "");
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                  engType === et.value ? "bg-amber-500/10 text-white" : "hover:bg-zinc-800 text-zinc-300"
                                }`}>
                                {engType === et.value && <span className="text-amber-400 text-xs">âœ“</span>}
                                {engType !== et.value && <span className="w-3" />}
                                <span className="text-sm font-medium">{et.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </Field>
                )}

                <div className="border-t border-zinc-800 pt-5 space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-0.5">Optimization for ad delivery</h4>
                    <p className="text-xs text-zinc-500">Choose a key result you want Meta to optimize for. Your choice affects who will see your ads.</p>
                  </div>
                  <Field label="Optimize for" hint="The optimization event you choose is the outcome that you want Meta to get you as efficiently as possible. For example, if you choose to optimize for link clicks, Meta shows your ad to people who are most likely to click your link.">
                    <div className="relative">
                      {/* Trigger */}
                      <button type="button" onClick={() => setOptimizeOpen(o => !o)}
                        className={inp + " flex items-center justify-between text-left"}>
                        <span>{OPTIMIZE_OPTIONS[effectiveObjective]?.find(o => o.value === optimize)?.label || optimize}</span>
                        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${optimizeOpen ? "rotate-180" : ""}`} />
                      </button>
                      {/* Dropdown */}
                      {optimizeOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                          {(OPTIMIZE_OPTIONS[effectiveObjective] || []).map(o => (
                            <button key={o.value} type="button"
                              onClick={() => { setOptimize(o.value); setOptimizeOpen(false); }}
                              className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors border-b border-zinc-800/50 last:border-0 ${
                                optimize === o.value ? "bg-amber-500/10" : "hover:bg-zinc-800"
                              }`}>
                              <div className="mt-0.5 shrink-0">
                                {optimize === o.value ? (
                                  <div className="w-4 h-4 rounded-full border-2 border-amber-400 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-zinc-600" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white">{o.label}</p>
                                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{o.desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </Field>
                </div>

                <div className="border-t border-zinc-800 pt-5 space-y-4">
                  <div>
                    <p className="text-sm font-bold text-white mb-0.5">Is your ad in a special category?</p>
                    <p className="text-xs text-zinc-500">If you are based in or targeting an audience in the United States and your ad relates to credit, employment, or housing, you must identify it to comply with Meta&apos;s advertising policies. Special ad categories have restricted targeting options. <span className="text-zinc-400 underline cursor-pointer">Learn more</span></p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={specialCat}
                      onChange={e => { setSpecial(e.target.checked); if (!e.target.checked) setSpecialCatType(""); }}
                      className="mt-0.5 w-4 h-4 accent-white rounded shrink-0" />
                    <p className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                      Yes, my ad relates to financial products and services, employment, or housing
                    </p>
                  </label>

                  {/* When checked â€” category picker + restrictions */}
                  {specialCat && (
                    <div className="space-y-3 ml-7">
                      {/* Category dropdown */}
                      <div className="relative">
                        <select value={specialCatType} onChange={e => setSpecialCatType(e.target.value)}
                          className={inp + " pr-8 appearance-none"}>
                          <option value="">Select one category</option>
                          <option value="HOUSING">Housing</option>
                          <option value="EMPLOYMENT">Employment</option>
                          <option value="CREDIT">Financial products and services</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                      </div>

                      {/* Important info box */}
                      <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">i</div>
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-white">Important information about special ad categories</p>
                          <p className="text-xs text-zinc-400">To help you comply with Facebook&apos;s advertising policies, some audience targeting options are restricted for ads in special categories.</p>
                          <ul className="space-y-1.5 mt-2">
                            {[
                              { label: "Age:",                value: "Options are fixed to include ages 18 through 65+ and can't be changed." },
                              { label: "Gender:",             value: "Options are fixed to include all genders and can't be changed." },
                              { label: "Detailed Targeting:", value: "Some detailed targeting options, such as interests, are unavailable. Excluding people based on detailed targeting is not available." },
                              { label: "Location:",           value: "Zip code selection is unavailable. Targeted locations must include all areas within a 15-mile radius of any selected city, address, or dropped pin." },
                              { label: "Lookalike Audiences:", value: "Lookalike audiences are unavailable." },
                              { label: "Custom Audiences:",   value: "Custom audiences must not discriminate against people based on certain personal characteristics." },
                              { label: "Saved Audiences:",    value: "Saved audiences are unavailable." },
                            ].map(({ label, value }) => (
                              <li key={label} className="flex items-start gap-1.5 text-xs text-zinc-400">
                                <span className="text-zinc-300 font-semibold shrink-0">{label}</span>
                                <span>{value}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* â”€â”€ STEP 2 â”€â”€ */}
            {step === 2 && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Decide on your audience and budget</h3>
                  <p className="text-sm text-zinc-500">Choose who you want to see your ad on Facebook, then set your budget and when you want your campaign to run.</p>
                </div>

                {/* Audience */}
                <div className="border-t border-zinc-800 pt-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-0.5">Audience</h4>
                    <p className="text-xs text-zinc-500">Your audience is the group of people who will potentially see your ad. Use our default audience settings or an audience you created on Facebook.</p>
                  </div>

                  {/* Audience type selector */}
                  <Field label="Select an audience">
                    <div className="relative">
                      <button type="button" onClick={() => setAudDropOpen(o => !o)}
                        className={inp + " flex items-center justify-between text-left"}>
                        <span className="text-white font-medium">Build your own audience</span>
                        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${audDropOpen ? "rotate-180" : ""}`} />
                      </button>

                      {/* Dropdown â€” all audience options inside */}
                      {audDropOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                          {/* Build your own â€” selected option */}
                          <button type="button" onClick={() => setAudDropOpen(false)}
                            className="w-full flex items-start gap-3 px-4 py-3.5 text-left bg-amber-500/5 border-b border-zinc-800 hover:bg-amber-500/10 transition-colors">
                            <span className="text-amber-400 text-xs mt-0.5 shrink-0">âœ“</span>
                            <div>
                              <p className="text-sm font-bold text-white">Build your own audience</p>
                              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">Choose who you want to see your ad based on targeting settings including their location, age, interests, and others.</p>
                            </div>
                          </button>

                          {/* Use saved audience */}
                          <div className="px-4 py-3.5 border-b border-zinc-800/50 opacity-60">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-zinc-400">Use saved audience</p>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-700 text-zinc-400 rounded-full shrink-0 ml-2">NO EXISTING AUDIENCE</span>
                            </div>
                            <p className="text-[11px] text-zinc-600 leading-relaxed">Choose a saved audience to reach people based on targeting options you&apos;ve already set on Facebook.</p>
                          </div>

                          {/* Use custom or lookalike */}
                          <div className="px-4 py-3.5 opacity-60">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-zinc-400">Use custom or lookalike audiences</p>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-700 text-zinc-400 rounded-full shrink-0 ml-2">NO EXISTING AUDIENCE</span>
                            </div>
                            <p className="text-[11px] text-zinc-600 leading-relaxed">Choose custom and lookalike audiences you&apos;ve created on Facebook to reach people who have already engaged with your brand, or to reach new people who are similar to the audiences you&apos;re already targeting.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Field>

                  {/* Current audience summary + Edit button */}
                  <div className="bg-zinc-800/40 border border-zinc-700 rounded-xl p-4 space-y-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Included people who match</p>
                    <p className="text-xs text-zinc-300">Age: {ageMin} - {ageMax}</p>
                    <p className="text-xs text-zinc-300">Gender: {gender === "ALL" ? "All" : gender.charAt(0) + gender.slice(1).toLowerCase()}</p>
                    <p className="text-xs text-zinc-300">Location: {(() => { try { return (JSON.parse(location) as {display_name:string}[]).map(l => l.display_name).join(", "); } catch { return location || "â€”"; } })()}</p>
                    {interests.length > 0 && <p className="text-xs text-zinc-300">Interests: {interests.map(i => i.name).join(", ")}</p>}
                    {excludeLocations.length > 0 && (
                      <p className="text-xs text-rose-400 flex items-start gap-1">
                        <span className="shrink-0">Excluded:</span>
                        <span>{excludeLocations.map(l => l.display_name).join(", ")}</span>
                      </p>
                    )}
                    <div className="pt-2 border-t border-zinc-700/50 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-zinc-500">Potential reach</p>
                        <p className="text-lg font-bold text-white">{reachLoading ? <span className="text-zinc-500 text-sm">Estimating...</span> : potentialReach}</p>
                      </div>
                      <button type="button"
                        onClick={() => {
                          // Special ad categories enforce age 18-65, gender All
                          const forcedAge = specialCat && specialCatType ? ["18","65"] : [ageMin, ageMax];
                          const forcedGender = specialCat && specialCatType ? "ALL" : gender;
                          setTmpAge(forcedAge); setTmpGender(forcedGender);
                          // Keep existing location objects or convert string fallback
                          setTmpLoc(tmpLoc.length > 0 ? tmpLoc : [{ key: "US", display_name: "United States", type: "country" }]);
                          setTmpExcLocItems([...excludeLocations]); // pre-load saved exclude locations
                          setTmpInt(interests); setAudienceError(null); setShowEditAud(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white border border-zinc-600 hover:border-zinc-400 rounded-lg transition-colors">
                        Edit audience
                      </button>
                    </div>
                  </div>
                </div>

                {/* Edit Audience sub-modal */}
                {showEditAud && (
                  <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70">
                    <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "85vh" }}>
                      {/* Header */}
                      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                        <h3 className="text-base font-bold text-white">Edit audience</h3>
                        <button onClick={() => setShowEditAud(false)} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-1 overflow-hidden">
                        {/* Left â€” form */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                          {/* Location */}
                          <div className="space-y-3">
                            <p className="text-sm font-bold text-white">Location</p>
                            <p className="text-xs text-zinc-500">Target people by including or excluding their location</p>

                            {/* Include */}
                            <p className="text-xs font-semibold text-zinc-400">Include</p>
                            <div className="border border-zinc-700 rounded-lg p-2 bg-zinc-900">
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {tmpLoc.map(l => (
                                  <span key={l.key} className="flex items-center gap-1 text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300">
                                    <span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />
                                    {l.display_name}
                                    <button onClick={() => setTmpLoc(tmpLoc.filter(x => x.key !== l.key))} className="text-zinc-500 hover:text-rose-400 ml-0.5">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                                <div className="relative flex-1 min-w-32">
                                  <input
                                    value={locInputVal}
                                    onChange={e => { setLocInputVal(e.target.value); searchLoc(e.target.value); }}
                                    onBlur={() => setTimeout(() => { setLocResults([]); }, 150)}
                                    placeholder="Search locations..."
                                    className="w-full text-sm outline-none placeholder:text-zinc-600 text-white bg-transparent"
                                  />
                                  {/* Location dropdown */}
                                  {(locResults.length > 0 || locLoading) && locInputVal.length >= 2 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto min-w-56">
                                      {locLoading && <p className="px-3 py-2 text-xs text-zinc-500">Searching...</p>}
                                      {locResults.map(l => (
                                        <button key={l.key} type="button"
                                          onClick={() => {
                                            if (!tmpLoc.find(x => x.key === l.key)) {
                                              setTmpLoc(prev => [...prev, { key: l.key, display_name: l.display_name, type: (l as any).type || "city" }]);
                                            }
                                            setLocInputVal(""); setLocResults([]);
                                          }}
                                          className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors border-b border-zinc-700/50 last:border-0">
                                          {l.display_name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-600">Locations powered by Meta Targeting API â€” requires connected Facebook account with ads_management scope.</p>

                            {/* Exclude toggle */}
                            <button type="button" onClick={() => setShowExclude(o => !o)}
                              className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                              {showExclude ? "â–¾" : "â–¸"} {showExclude ? "Hide" : "Exclude"} Location
                            </button>

                            {showExclude && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-zinc-400">Exclude</p>
                                <div className="border border-zinc-700 rounded-lg p-2 bg-zinc-900">
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {tmpExcLocItems.map(l => (
                                      <span key={l.key} className="flex items-center gap-1 text-xs bg-rose-500/10 border border-rose-500/30 rounded px-2 py-1 text-rose-300">
                                        <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                                        {l.display_name}
                                        <button onClick={() => setTmpExcLocItems(tmpExcLocItems.filter(x => x.key !== l.key))} className="text-rose-400 hover:text-rose-200 ml-0.5">
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                    <div className="relative flex-1 min-w-32">
                                      <input
                                        value={exLocInput}
                                        onChange={e => { setExLocInput(e.target.value); searchExclude(e.target.value); }}
                                        onBlur={() => setTimeout(() => { setExLocResults([]); }, 150)}
                                        placeholder="Search locations to exclude..."
                                        className="w-full text-sm outline-none placeholder:text-zinc-600 text-white bg-transparent"
                                      />
                                      {(exLocResults.length > 0 || exLocLoading) && exLocInput.length >= 2 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto min-w-56">
                                          {exLocLoading && <p className="px-3 py-2 text-xs text-zinc-500">Searching...</p>}
                                          {exLocResults.map(l => (
                                            <button key={l.key} type="button"
                                              onClick={() => {
                                                if (!tmpExcLocItems.find(x => x.key === l.key)) {
                                                  setTmpExcLocItems(prev => [...prev, l]);
                                                }
                                                setExLocInput(""); setExLocResults([]);
                                              }}
                                              className="w-full text-left px-3 py-2 text-sm text-rose-200 hover:bg-zinc-700 transition-colors border-b border-zinc-700/50 last:border-0">
                                              {l.display_name}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="border-t border-zinc-800" />

                          {/* Gender */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-white">Gender</p>
                              {specialCat && specialCatType && <span className="text-[10px] text-amber-400 font-semibold">Locked by special category</span>}
                            </div>
                            <div className={`flex gap-0 border rounded-lg overflow-hidden w-fit ${specialCat && specialCatType ? "border-zinc-800 opacity-50 pointer-events-none" : "border-zinc-700"}`}>
                              {["ALL","FEMALE","MALE"].map((g, i) => (
                                <button key={g} type="button" onClick={() => !specialCat && setTmpGender(g)}
                                  disabled={!!(specialCat && specialCatType)}
                                  className={`px-6 py-2 text-sm font-medium transition-all ${i > 0 ? "border-l border-zinc-700" : ""} ${
                                    tmpGender === g ? "bg-white text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                  }`}>
                                  {g === "ALL" ? "All" : g === "FEMALE" ? "Female" : "Male"}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-zinc-800" />

                          {/* Age */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-white">Age</p>
                              {specialCat && specialCatType && <span className="text-[10px] text-amber-400 font-semibold">Locked: 18â€“65+ by special category</span>}
                            </div>
                            <p className="text-xs text-zinc-500">Select the minimum and maximum age for people who will see your ad.<br/>Note: the minimum age is 13, and the maximum age is 65 and over.</p>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <select value={tmpAge[0]} onChange={e => setTmpAge([e.target.value, tmpAge[1]])}
                                  disabled={!!(specialCat && specialCatType)}
                                  className={inp + " w-24 pr-8 appearance-none" + (specialCat && specialCatType ? " opacity-50 cursor-not-allowed" : "")}>
                                  {["13","16","18","21","25","30","35","40","45","50","55","60","65"].map(a => (
                                    <option key={a} value={a}>{a}</option>
                                  ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-2 top-2.5 pointer-events-none" />
                              </div>
                              <span className="text-zinc-500">â€“</span>
                              <div className="relative">
                                <select value={tmpAge[1]} onChange={e => setTmpAge([tmpAge[0], e.target.value])}
                                  disabled={!!(specialCat && specialCatType)}
                                  className={inp + " w-24 pr-8 appearance-none" + (specialCat && specialCatType ? " opacity-50 cursor-not-allowed" : "")}>
                                  {["18","21","25","30","35","40","45","50","55","60","65+"].map(a => (
                                    <option key={a} value={a}>{a}</option>
                                  ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-2 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-zinc-800" />

                          {/* Detailed targeting */}
                          <div className="space-y-3">
                            <p className="text-sm font-bold text-white">Detailed targeting</p>
                            <p className="text-xs text-zinc-500">
                              Target your audience by demographics, interests, or behaviors.
                            </p>
                            <div className="p-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                              <p className="text-[11px] text-blue-400 leading-relaxed">
                                <span className="font-bold">How it works:</span> Interests are fetched from Meta&apos;s Targeting API using your connected ad account. Type to search â€” e.g. &quot;Technology&quot;, &quot;Travel&quot;, &quot;Fitness&quot;. No extra Meta setup needed â€” your existing <code className="text-xs bg-blue-500/10 px-1 rounded">ads_management</code> scope covers this.
                              </p>
                            </div>
                            <p className="text-xs font-semibold text-zinc-400">Include</p>
                            <div className="border border-zinc-700 rounded-lg p-2 bg-zinc-900">
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {tmpInt.map(t => (
                                  <span key={t.id} className="flex items-center gap-1 text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300">
                                    {t.name}
                                    <button onClick={() => setTmpInt(prev => prev.filter(x => x.id !== t.id))} className="text-zinc-500 hover:text-rose-400 ml-0.5">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                                <div className="relative flex-1 min-w-40">
                                  <input
                                    value={intInputVal}
                                    onChange={e => { setIntInputVal(e.target.value); searchInt(e.target.value); }}
                                    onBlur={() => setTimeout(() => { setIntResults([]); }, 150)}
                                    placeholder="Search interests..."
                                    className="w-full text-sm outline-none placeholder:text-zinc-600 text-white bg-transparent"
                                  />
                                  {/* Interests dropdown */}
                                  {(intResults.length > 0 || intLoading) && intInputVal.length >= 2 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto min-w-56">
                                      {intLoading && <p className="px-3 py-2 text-xs text-zinc-500">Searching...</p>}
                                      {intResults.map(i => (
                                        <button key={i.id} type="button"
                                          onClick={() => {
                                            if (!tmpInt.find(x => x.id === i.id)) {
                                              setTmpInt(prev => [...prev, { id: i.id, name: i.name }]);
                                            }
                                            setIntInputVal(""); setIntResults([]);
                                          }}
                                          className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors border-b border-zinc-700/50 last:border-0">
                                          {i.name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-600">Search and select interests from Meta&apos;s Targeting API. Requires a connected Facebook account.</p>
                          </div>
                        </div>

                        {/* Right â€” current details */}
                        <div className="w-56 shrink-0 bg-zinc-900/50 border-l border-zinc-800 p-5 space-y-4">
                          <p className="text-sm font-bold text-white">Current audience details</p>
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                              <span>ðŸ‘¥</span> Included people who match
                            </p>
                            <p className="text-xs text-zinc-400">Age: {tmpAge[0]} - {tmpAge[1]}</p>
                            <p className="text-xs text-zinc-400">Gender: {tmpGender === "ALL" ? "All" : tmpGender.charAt(0) + tmpGender.slice(1).toLowerCase()}</p>
                            <p className="text-xs text-zinc-400">Location: {tmpLoc.map(l => l.display_name).join(", ") || "â€”"}</p>
                            {tmpExcLocItems.length > 0 && <p className="text-xs text-rose-400">Excluded: {tmpExcLocItems.map(l => l.display_name).join(", ")}</p>}
                            {tmpInt.length > 0 && <p className="text-xs text-zinc-400">Interests: {tmpInt.map(i => i.name).join(", ")}</p>}
                          </div>
                          <div className="pt-3 border-t border-zinc-800">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Potential reach</p>
                            <p className="text-xl font-bold text-white">{potentialReach}</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-950">
                        {audienceError && (
                          <p className="text-xs text-rose-400 mr-auto">{audienceError}</p>
                        )}
                        <button onClick={() => { setShowEditAud(false); setAudienceError(null); }}
                          className="px-5 py-2 text-sm text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-white rounded-lg font-medium transition-colors">
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setAudienceError(null);
                            const minAge = parseInt(tmpAge[0]);
                            const maxAge = parseInt(tmpAge[1].replace("+","")) || 65;
                            if (minAge >= maxAge) { setAudienceError("Minimum age must be less than maximum age."); return; }
                            setAgeMin(tmpAge[0]); setAgeMax(tmpAge[1].replace("+",""));
                            setGender(tmpGender);
                            setLocation(JSON.stringify(tmpLoc));
                            setExcludeLocations([...tmpExcLocItems]);
                            setInterests([...tmpInt]);
                            setShowEditAud(false); setShowExclude(false);
                          }}
                          className="px-5 py-2 text-sm bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold rounded-lg transition-colors">
                          Change audience
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* EU targeting */}
                <div className="border-t border-zinc-800 pt-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Do your ads target audiences in the EU?</h4>
                    <p className="text-xs text-zinc-500">
                      Due to regulatory requirements in the European Union (EU), you will need to provide beneficiary and payer information if your ads target the EU or EU-associated territories. Please make sure to provide accurate information to keep your ads from being rejected by Meta.{" "}
                      <span className="text-zinc-400 underline cursor-pointer">Learn more about EU requirements</span>
                    </p>
                  </div>

                  {/* Primary checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={euTargeting}
                      onChange={e => { setEuTargeting(e.target.checked); if (!e.target.checked) { setEuConfirmed(false); setBeneficiary(""); setPayer(""); } }}
                      className="mt-0.5 w-4 h-4 accent-white rounded shrink-0" />
                    <p className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                      Yes, my ads target audiences in the EU
                    </p>
                  </label>

                  {/* Expanded: confirmation + beneficiary + payer */}
                  {euTargeting && (
                    <div className="ml-7 space-y-4">
                      {/* Confirm checkbox */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" checked={euConfirmed} onChange={e => setEuConfirmed(e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-white rounded shrink-0" />
                        <p className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors leading-relaxed">
                          I confirm that I will provide accurate beneficiary and payer information for EU-targeted ads.
                        </p>
                      </label>

                      {/* Beneficiary */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-zinc-200">Beneficiary</p>
                          <span className="text-rose-400 text-xs">*</span>
                        </div>
                        <p className="text-xs text-zinc-500">Provide accurate beneficiary entity name</p>
                        <input
                          value={beneficiary}
                          onChange={e => setBeneficiary(e.target.value)}
                          placeholder="Entity or person who benefits from the ad"
                          className={inp}
                        />
                      </div>

                      {/* Payer */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-zinc-200">Payer</p>
                          <span className="text-rose-400 text-xs">*</span>
                        </div>
                        <p className="text-xs text-zinc-500">Provide accurate payer entity name</p>
                        <input
                          value={payer}
                          onChange={e => setPayer(e.target.value)}
                          placeholder="Entity or person who pays for the ad"
                          className={inp}
                        />
                      </div>

                      {(beneficiary || payer) && !euConfirmed && (
                        <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
                          <span>âš </span> Please confirm your details are accurate above.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Placements */}
                <div className="border-t border-zinc-800 pt-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-0.5">Placements</h4>
                    <p className="text-xs text-zinc-500">
                      The automatic placements option is enabled by default, so that Facebook can show your ad where it performs best.
                      The automatic placements option maximises your budget and ensures that more people see your ad.{" "}
                      <span className="text-zinc-400 underline cursor-pointer">Learn more about placements</span>
                    </p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={!autoPlace} onChange={e => setAutoPlace(!e.target.checked)}
                      className="w-4 h-4 accent-white rounded" />
                    <p className="text-sm text-zinc-300">I want to manually choose the placements</p>
                  </label>

                  {/* Automatic placements info */}
                  {autoPlace && (
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3">
                      <p className="text-xs font-semibold text-zinc-300">Automatic placements</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Facebook, Instagram, Messenger, Audience Network</p>
                    </div>
                  )}

                  {/* Manual placements */}
                  {!autoPlace && (() => {
                    const objUnavailable = ALL_PLACEMENTS.filter(p => p.unavailableFor?.includes(effectiveObjective));
                    const objAvailable   = ALL_PLACEMENTS.filter(p => !p.unavailableFor?.includes(effectiveObjective));
                    // Filter by device
                    const deviceFiltered = objAvailable.filter(p =>
                      deviceType === "all" || p.device === deviceType || p.device === "all"
                    );
                    const deviceBlocked  = objAvailable.filter(p =>
                      deviceType !== "all" && p.device !== "all" && p.device !== deviceType
                    );
                    const total    = ALL_PLACEMENTS.length;
                    const selCount = selectedPlacements.length;

                    const togglePlacement = (id: string) => {
                      setSelectedPlacements(prev =>
                        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                      );
                    };

                    const PLATFORM_COLOR: Record<string, string> = {
                      "Facebook":         "text-blue-400",
                      "Instagram":        "text-pink-400",
                      "Messenger":        "text-indigo-400",
                      "Audience Network": "text-purple-400",
                    };

                    // Inline toggle component
                    const PlacementToggle = ({ id, disabled }: { id: string; disabled?: boolean }) => {
                      const on = selectedPlacements.includes(id) && !disabled;
                      return (
                        <button type="button"
                          onClick={() => !disabled && togglePlacement(id)}
                          disabled={disabled}
                          className={`relative shrink-0 rounded-full transition-colors overflow-hidden ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                          style={{ width: 40, height: 22, background: on ? "#6366f1" : "#52525b" }}
                        >
                          <span style={{
                            position: "absolute",
                            top: 3,
                            left: 0,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "#ffffff",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                            transition: "transform 200ms ease",
                            transform: on ? "translateX(21px)" : "translateX(3px)",
                          }} />
                        </button>
                      );
                    };

                    return (
                      <div className="space-y-3">
                        {/* Device selector */}
                        <div>
                          <p className="text-xs font-semibold text-zinc-400 mb-1.5">Select device</p>
                          <div className="relative w-44">
                            <select value={deviceType} onChange={e => setDeviceType(e.target.value)}
                              className={inp + " pr-8 appearance-none"}>
                              <option value="all">All devices</option>
                              <option value="mobile">Mobile</option>
                              <option value="desktop">Desktop</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                          </div>
                        </div>

                        {/* Counter */}
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-zinc-200">
                            Selected placements <span className="text-zinc-500">({selCount} / {total})</span>
                          </p>
                        </div>

                        {/* Placement rows */}
                        <div className="border border-zinc-700 rounded-xl overflow-hidden divide-y divide-zinc-800/60 max-h-72 overflow-y-auto">

                          {/* Available + device-compatible */}
                          {deviceFiltered.map(p => (
                            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                              <PlacementToggle id={p.id} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-200">{p.label}</p>
                              </div>
                              <span className={`text-[10px] font-semibold shrink-0 ${PLATFORM_COLOR[p.platform] || "text-zinc-500"}`}>
                                {p.platform}
                              </span>
                            </div>
                          ))}

                          {/* Device-blocked (available for objective but wrong device) */}
                          {deviceBlocked.map(p => (
                            <div key={p.id} className="flex items-center gap-3 px-4 py-3 opacity-40">
                              <PlacementToggle id={p.id} disabled />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-400">{p.label}</p>
                                <p className="text-[11px] text-zinc-600 mt-0.5">
                                  Not available for {deviceType === "mobile" ? "mobile" : "desktop"} devices.
                                </p>
                              </div>
                              <span className={`text-[10px] font-semibold shrink-0 ${PLATFORM_COLOR[p.platform] || "text-zinc-500"}`}>
                                {p.platform}
                              </span>
                            </div>
                          ))}

                          {/* Objective-unavailable */}
                          {objUnavailable.map(p => (
                            <div key={p.id} className="flex items-center gap-3 px-4 py-3 opacity-35">
                              <PlacementToggle id={p.id} disabled />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-500">{p.label}</p>
                                <p className="text-[11px] text-zinc-600 mt-0.5">
                                  Not available with the {
                                    effectiveObjective === "ENGAGEMENT_POST_AD"  ? "Post Engagement" :
                                    effectiveObjective === "ENGAGEMENT_VIDEO_AD" ? "Video Views" :
                                    effectiveObjective === "ENGAGEMENT_WEBSITE"  ? "Engagement (Website)" :
                                    effectiveObjective === "AWARENESS"           ? "Brand Awareness" :
                                    effectiveObjective.charAt(0) + effectiveObjective.slice(1).toLowerCase().replace(/_/g, " ")
                                  } objective.
                                </p>
                              </div>
                              <span className={`text-[10px] font-semibold shrink-0 ${PLATFORM_COLOR[p.platform] || "text-zinc-500"}`}>
                                {p.platform}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Tracking â€” Sales + On your website + Conversions only */}
                {objective === "CONVERSIONS" && convLocation !== "message" && optimize === "OFFSITE_CONVERSIONS" && (() => {
                  // Real pixels are fetched from Meta API at publish time.
                  // Here users enter their Pixel ID manually (found in Meta Events Manager).
                  const filteredPixels: { id: string; name: string }[] = [];

                  const CONV_EVENTS = [
                    "Add payment info", "Add to cart", "Add to wishlist", "Complete registration",
                    "Donate", "Initiate checkout", "Purchase", "Search",
                    "Start trial", "Subscribe", "View content",
                  ];
                  const filteredEvents = CONV_EVENTS.filter(e =>
                    !eventSearch || e.toLowerCase().includes(eventSearch.toLowerCase())
                  );

                  return (
                    <div className="border-t border-zinc-800 pt-5 space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-white mb-0.5">Tracking</h4>
                        <p className="text-xs text-zinc-500">
                          Use conversion tracking pixels to track and understand the actions people take on your website.
                          You can track actions or conversion events such as viewing or purchasing a product.{" "}
                          <span className="text-zinc-400 underline cursor-pointer">Learn more about conversion tracking</span>
                        </p>
                      </div>

                      {/* Pixel ID â€” entered manually; found in Meta Events Manager */}
                      <Field label="Meta Pixel ID">
                        <input
                          type="text"
                          value={trackingPixel}
                          onChange={e => { setTrackingPixel(e.target.value); setConvEvent(""); }}
                          placeholder="e.g. 1234567890123456"
                          className={inp}
                        />
                        <p className="text-[11px] text-zinc-600 mt-1">
                          Find your Pixel ID in{" "}
                          <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                            Meta Events Manager
                          </a>
                          {" "}â†’ Data Sources â†’ your Pixel.
                        </p>
                      </Field>

                      {/* Conversion event selector */}
                      <Field label="Select a conversion event">
                        <div className="relative">
                          <button type="button"
                            onClick={() => { if (!trackingPixel) return; setEventDropOpen(o => !o); setPixelDropOpen(false); }}
                            disabled={!trackingPixel}
                            className={inp + " flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed"}>
                            <span className={convEvent ? "text-white" : "text-zinc-600"}>
                              {convEvent || "Search for a conversion event"}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${eventDropOpen ? "rotate-180" : ""}`} />
                          </button>
                          {eventDropOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                              <div className="p-2 border-b border-zinc-800">
                                <input autoFocus value={eventSearch} onChange={e => setEventSearch(e.target.value)}
                                  placeholder="Search for a conversion event"
                                  className={inp + " text-sm"} />
                              </div>
                              <div className="max-h-56 overflow-y-auto">
                                {filteredEvents.map(e => (
                                  <button key={e} type="button"
                                    onClick={() => { setConvEvent(e); setEventSearch(""); setEventDropOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors border-b border-zinc-800/30 last:border-0">
                                    {e}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {!trackingPixel && <p className="text-[11px] text-zinc-600 mt-1">Select a pixel first.</p>}
                      </Field>
                    </div>
                  );
                })()}

                {/* Budget */}
                {(() => {
                  const selAccObj  = adAccounts.find(a => a.id === selectedAcc);
                  const currency   = selAccObj?.ad_account_currency || "USD";
                  const SYMBOLS: Record<string, string>  = { USD:"$", INR:"â‚¹", EUR:"â‚¬", GBP:"Â£", AUD:"A$", SGD:"S$", MYR:"RM", AED:"Ø¯.Ø¥" };
                  const MINS: Record<string, number>     = { USD:1, INR:97, EUR:1, GBP:1, AUD:2, SGD:2, MYR:5, AED:4 };
                  const symbol = SYMBOLS[currency] || (currency + " ");
                  const minAmt = MINS[currency] || 1;
                  return (
                <div className="border-t border-zinc-800 pt-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-0.5">Budget and duration</h4>
                    <p className="text-xs text-zinc-500">Set the budget and duration of your ad campaign.</p>
                  </div>

                  {/* Meta ad account live balance */}
                  {metaBalance ? (
                    <div className="flex items-center gap-5 px-4 py-3 bg-zinc-900 border border-zinc-700/60 rounded-xl">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Account Balance</p>
                        <p className={`text-base font-bold ${metaBalance.balance !== null ? "text-emerald-400" : "text-zinc-500"}`}>
                          {metaBalance.balance !== null
                            ? `${symbol}${parseFloat(metaBalance.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "â€”"}
                        </p>
                      </div>
                      <div className="w-px h-8 bg-zinc-800" />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Total Spent</p>
                        <p className="text-base font-semibold text-zinc-300">
                          {symbol}{parseFloat(metaBalance.amount_spent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      {metaBalance.spend_cap && (
                        <>
                          <div className="w-px h-8 bg-zinc-800" />
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Spend Cap</p>
                            <p className="text-base font-semibold text-zinc-400">
                              {symbol}{parseFloat(metaBalance.spend_cap).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </>
                      )}
                      <p className="text-[10px] text-zinc-600 shrink-0">Live Â· Meta</p>
                    </div>
                  ) : (
                    <div className="h-[60px] flex items-center px-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                      <p className="text-xs text-zinc-600">Connecting to Meta ad accountâ€¦</p>
                    </div>
                  )}

                  <Field label="Budget" hint={`Enter in ${currency}. Meta minimum is ${symbol}${minAmt}/day for this ad account.`}>
                    <div className="flex items-center gap-4">
                      <div className="relative w-36">
                        <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">{symbol}</span>
                        <input type="number" value={budgetAmt}
                          onChange={e => { setBudget(e.target.value); clearErr("budget"); }}
                          min={minAmt}
                          className={inp + " pl-7" + (fieldErrors.budget ? " border-rose-500" : "")} />
                      </div>
                      <div className="flex gap-3">
                        {[{v:"daily",l:"Per day"},{v:"total",l:"Total"}].map(({v,l}) => (
                          <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${budgetType === v ? "border-white" : "border-zinc-600"}`}>
                              {budgetType === v && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <input type="radio" className="hidden" checked={budgetType === v} onChange={() => setBudgetType(v as "daily"|"total")} />
                            <span className="text-sm text-zinc-300">{l}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {fieldErrors.budget && <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1"><span>âš </span>{fieldErrors.budget}</p>}
                  </Field>
                  <Field label="Duration" hint="Choose how long your ad campaign will run.">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-[10px] text-zinc-500 mb-1">From</p>
                        <input type="date" value={startDate} onChange={e => { setStart(e.target.value); clearErr("startDate"); }}
                          className={inp + (fieldErrors.startDate ? " border-rose-500" : "")} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-zinc-500 mb-1">To</p>
                        <input type="date" value={endDate} onChange={e => setEnd(e.target.value)}
                          min={startDate} className={inp} placeholder="No end date" />
                      </div>
                    </div>
                    {fieldErrors.startDate && <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1"><span>âš </span>{fieldErrors.startDate}</p>}
                  </Field>
                </div>
                  );
                })()}

                {/* Payment */}
                <div className="border-t border-zinc-800 pt-5">
                  <h4 className="text-sm font-bold text-white mb-1">Payment</h4>
                  <p className="text-xs text-zinc-500">
                    Meta will bill your ad account when your ad is published. Review your payment method on Meta.{" "}
                    <span className="text-blue-400 underline cursor-pointer">Learn more â†—</span>
                  </p>
                </div>
              </div>
            )}

            {/* â”€â”€ STEP 3 â”€â”€ */}
            {step === 3 && (
              <div className="flex h-full overflow-hidden">

                {/* â”€â”€ Ads List Sidebar (independent from step progress sidebar) â”€â”€ */}
                <div className={`shrink-0 border-r border-zinc-800 flex flex-col transition-all duration-200 ${adsSidebarOpen ? "w-52" : "w-8"}`}>
                  <button type="button" onClick={() => setAdsSidebarOpen(o => !o)}
                    className="flex items-center justify-center w-full h-8 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors shrink-0">
                    <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 transition-transform ${adsSidebarOpen ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {adsSidebarOpen && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Ads List header */}
                      <div className="px-3 pt-1 pb-2 border-b border-zinc-800">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs font-bold text-white">Ads List</p>
                        </div>
                        <p className="text-[10px] text-zinc-500 mb-1.5">YOUR ADS ({ads.length}/50)</p>
                        {ads.length < 50 && (
                          <button type="button"
                            onClick={() => { setAds(prev => [...prev, { name: `New ad`, copy: "", headline: "", website_url: "http://example.com", cta: "Learn more", image_url: "" }]); setSelectedAdIdx(ads.length); setShowSummary(false); }}
                            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors">
                            <span className="text-base leading-none">+</span> Create an ad
                          </button>
                        )}
                      </div>

                      {/* Ad items */}
                      <div className="flex-1 overflow-y-auto py-1">
                        {ads.map((a, idx) => (
                          <div key={idx}
                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors group ${
                              !showSummary && selectedAdIdx === idx ? "bg-amber-500/10" : "hover:bg-zinc-800/40"
                            }`}
                            onClick={() => { setSelectedAdIdx(idx); setShowSummary(false); }}>
                            <p className="text-xs text-zinc-300 flex-1 truncate">{a.name || "New ad"}</p>
                            {!a.image_url && (
                              <span className="text-amber-400 text-xs shrink-0" title="No image added">âš </span>
                            )}
                            <button type="button"
                              onClick={e => { e.stopPropagation(); if (ads.length === 1) return; setAds(prev => prev.filter((_, i) => i !== idx)); setSelectedAdIdx(Math.max(0, idx - 1)); }}
                              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all shrink-0">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Campaign / Summary */}
                      <div className="border-t border-zinc-800 pt-2 pb-1">
                        <p className="px-3 text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Campaign</p>
                        <button type="button"
                          onClick={() => setShowSummary(true)}
                          className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${showSummary ? "bg-amber-500/10 text-amber-400" : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"}`}>
                          Summary
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* â”€â”€ Main: Ad form or Summary â”€â”€ */}
                {showSummary ? (
                  /* Summary view */
                  <div className="flex-1 overflow-y-auto p-6">
                    <h2 className="text-base font-bold text-white mb-5">Summary</h2>
                    <div className="space-y-0 border border-zinc-800 rounded-xl overflow-hidden">
                      {[
                        { label: "Page",                    value: pages.find(p => p.id === selectedPage)?.account_name || "â€”" },
                        { label: "Ad account",              value: adAccounts.find(a => a.id === selectedAcc)?.account_name || "â€”" },
                        { label: "Campaign name",           value: campName },
                        { label: "Objective",               value: OBJECTIVES.find(o => o.value === objective)?.label || objective },
                        { label: "Optimisation and delivery", value: OPTIMIZE_OPTIONS[effectiveObjective]?.find(o => o.value === optimize)?.label || optimize },
                        { label: "Special ad categories",   value: specialCat && specialCatType ? specialCatType.charAt(0) + specialCatType.slice(1).toLowerCase() : "No categories declared" },
                        { label: "Audience",                value: "Built audience" },
                        { label: "Placements",              value: autoPlace ? "Automatic placements" : `Manual placements (${selectedPlacements.length})` },
                        { label: "Payment summary",         value: budgetAmt ? `${(()=>{const c=adAccounts.find(a=>a.id===selectedAcc)?.ad_account_currency||"USD";const s:Record<string,string>={USD:"$",INR:"â‚¹",EUR:"â‚¬",GBP:"Â£",AUD:"A$",SGD:"S$",MYR:"RM",AED:"Ø¯.Ø¥"};return s[c]||(c+" ");})()}${parseFloat(budgetAmt).toFixed(2)} ${budgetType === "daily" ? "per day" : "total"}` : "â€”" },
                        { label: "Duration",                value: startDate ? `From - ${new Date(startDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "â€”" },
                        { label: "Created ads",             value: String(ads.length) },
                      ].map(({ label, value }, i) => (
                        <div key={label} className={`flex items-start gap-4 px-5 py-3 ${i % 2 === 0 ? "bg-zinc-900/20" : ""} border-b border-zinc-800/50 last:border-0`}>
                          <p className="text-sm font-semibold text-zinc-400 w-48 shrink-0">{label}</p>
                          <p className="text-sm text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-800">
                  {/* Ad header row */}
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <input value={ad.name} onChange={e => setAd(a => ({...a, name: e.target.value}))}
                      className="bg-transparent text-sm font-semibold text-white outline-none border-b border-transparent hover:border-zinc-600 focus:border-zinc-400 transition-colors flex-1"
                      placeholder="New ad" />
                  </div>

                  {/* Content tab */}
                  <div className="flex border-b border-zinc-800 px-5 shrink-0">
                    <button type="button" className="px-1 py-2.5 text-xs font-bold text-white border-b-2 border-white mr-4">Content</button>
                  </div>

                  {/* Ad form body */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">

                    {/* Name this ad */}
                    <Field label="Name this ad">
                      <input value={ad.name} onChange={e => setAd(a => ({...a, name: e.target.value}))}
                        className={inp} placeholder="New ad" />
                    </Field>

                    {/* Copy textarea */}
                    <div className="relative">
                      <textarea
                        value={ad.copy}
                        onChange={e => setAd(a => ({...a, copy: e.target.value}))}
                        maxLength={2200} rows={4}
                        placeholder="Tell people about your offer..."
                        className={inp + " resize-none text-sm"}
                      />
                      <p className="text-[10px] text-zinc-600 text-right mt-1">{ad.copy.length} / 2,200</p>
                    </div>

                    {/* Ad format selector â€” not shown for message destination */}
                    {convLocation !== "message" && (
                      <Field label="Ad format">
                        <div className="flex gap-2">
                          {([
                            { value: "image_ad", label: "Image Ad" },
                            { value: "video_ad", label: "Video Ad" },
                            ...(objective === "LEAD_GENERATION" ? [{ value: "lead_ad", label: "Lead Form" }] : []),
                          ] as { value: "image_ad"|"video_ad"|"lead_ad"; label: string }[]).map(type => (
                            <button key={type.value} type="button"
                              onClick={() => setAd(a => ({
                                ...a,
                                ad_type: type.value,
                                // Clear fields that belong to the other formats
                                ...(type.value !== "video_ad" ? { video_url: "" } : {}),
                                ...(type.value !== "lead_ad"  ? { lead_form_id: "" } : {}),
                                ...(type.value !== "image_ad" ? { image_url: "" } : {}),
                              }))}
                              className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
                                (ad.ad_type || "image_ad") === type.value
                                  ? "bg-white text-zinc-900 border-white"
                                  : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300"
                              }`}>
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </Field>
                    )}

                    {/* Video URL â€” shown when video_ad selected */}
                    {(ad.ad_type || "image_ad") === "video_ad" && convLocation !== "message" && (
                      <Field label="Facebook Video ID or URL">
                        <input type="text" value={ad.video_url || ""}
                          onChange={e => setAd(a => ({ ...a, video_url: e.target.value }))}
                          className={inp} placeholder="e.g. 1234567890123456" />
                        <p className="text-[11px] text-zinc-600 mt-1.5">Upload your video in Meta Ads Manager â†’ Creative Hub, then paste the video ID here.</p>
                      </Field>
                    )}

                    {/* Lead form ID â€” shown when lead_ad selected */}
                    {(ad.ad_type || "image_ad") === "lead_ad" && convLocation !== "message" && (
                      <Field label="Meta Lead Gen Form ID">
                        <input type="text" value={ad.lead_form_id || ""}
                          onChange={e => setAd(a => ({ ...a, lead_form_id: e.target.value }))}
                          className={inp} placeholder="e.g. 1234567890123456" />
                        <p className="text-[11px] text-zinc-600 mt-1.5">Create your form in Meta Ads Manager â†’ Lead Ads Forms, then paste the Form ID here.</p>
                      </Field>
                    )}

                    {/* Image upload â€” shown when image_ad selected */}
                    {(ad.ad_type || "image_ad") === "image_ad" && convLocation !== "message" && (
                    <>{/* Image / video upload */}
                    {!ad.image_url ? (
                      <div className="space-y-2">
                        {/* Warning â€” only shown after failed Next attempt */}
                        {(showMediaErr || fieldErrors.adImage) && (
                          <div className="flex items-start gap-2.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                            <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-rose-400 text-xs font-bold">!</span>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-rose-300">Image or video required</p>
                              <p className="text-[11px] text-rose-400/80 mt-0.5">Facebook requires an image or video to be included.</p>
                            </div>
                          </div>
                        )}
                        {/* Upload buttons row */}
                        <div className="flex gap-3">
                          <label className={`flex-1 flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl transition-colors ${imageUploading ? "border-zinc-600 cursor-wait" : "border-zinc-700 hover:border-zinc-500 cursor-pointer"} group`}>
                            <div className="w-10 h-10 bg-zinc-800 group-hover:bg-zinc-700 rounded-lg flex items-center justify-center transition-colors">
                              {imageUploading
                                ? <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                                : <ImageIcon className="w-5 h-5 text-zinc-400" />}
                            </div>
                            <p className="text-xs text-zinc-500 group-hover:text-zinc-400">
                              {imageUploading ? "Uploadingâ€¦" : "Add image"}
                            </p>
                            <input type="file" accept="image/*,image/jpeg,image/png,image/gif,image/webp" className="hidden"
                              disabled={imageUploading}
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) uploadAdImage(file);
                              }} />
                          </label>
                          <button type="button" onClick={() => setShowVaultPicker(true)}
                            className="flex-1 flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl cursor-pointer transition-colors group">
                            <div className="w-10 h-10 bg-zinc-800 group-hover:bg-zinc-700 rounded-lg flex items-center justify-center transition-colors">
                              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <p className="text-xs text-zinc-500 group-hover:text-zinc-400">Add from library</p>
                          </button>
                        </div>
                        {imageUploadErr && (
                          <p className="text-[11px] text-rose-400 flex items-center gap-1">
                            <span>âš </span>{imageUploadErr}
                          </p>
                        )}
                        {/* Paste a direct public image URL */}
                        <div>
                          <input type="text" value={ad.image_url}
                            onChange={e => { setAd(a => ({...a, image_url: e.target.value})); if (e.target.value) { setShowMediaErr(false); clearErr("adImage"); } }}
                            className={inp + " text-xs"} placeholder="Or paste a direct image URL ending in .jpg / .png" />
                          <p className="text-[10px] text-zinc-600 mt-1">Must be a direct link (no redirects). Upload using the button above for best results.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border border-zinc-700">
                        <Image src={ad.image_url} alt="Ad creative" width={600} height={314} className="w-full object-cover max-h-48" unoptimized />
                        <button type="button" onClick={() => setAd(a => ({...a, image_url: ""}))}
                          className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-black transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    </>
                  )}

                    {/* Message destination fields */}
                    {convLocation === "message" ? (
                      <>
                        {/* Welcome message */}
                        <div className="space-y-1.5">
                          <p className="text-sm font-semibold text-zinc-200">Welcome message</p>
                          <textarea
                            value={welcomeMsg}
                            onChange={e => { setWelcomeMsg(e.target.value.slice(0, 300)); setShowWelcomeErr(false); }}
                            rows={3}
                            placeholder="Hey you, welcome! Thanks for reaching out. How we can help you today?"
                            className={inp + " resize-none text-sm"}
                          />
                          <p className="text-[10px] text-zinc-600 text-right">{welcomeMsg.length} / 300 characters</p>
                          {(showWelcomeErr || fieldErrors.welcomeMsg) && (
                            <div className="flex items-start gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                              <span className="text-rose-400 text-xs shrink-0 mt-0.5">âŠ˜</span>
                              <div>
                                <p className="text-xs font-semibold text-rose-300">Welcome message required</p>
                                <p className="text-[11px] text-rose-400/80">Add a welcome message to proceed with this campaign type.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Headline â€” non-message */}
                        <Field label="Headline">
                          <input value={ad.headline} onChange={e => setAd(a => ({...a, headline: e.target.value}))}
                            className={inp} placeholder="Add a headline to get people's attention..." />
                        </Field>

                        {/* Add a website URL checkbox */}
                        <div className="space-y-2">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" checked={addWebsiteUrl} onChange={e => setAddWebsiteUrl(e.target.checked)}
                              className="mt-0.5 w-4 h-4 accent-white rounded shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-zinc-200">Add a website URL</p>
                              <p className="text-[11px] text-zinc-500 mt-0.5">
                                Enter a URL if you want people to go to a website when they click or tap on your ad.
                                Otherwise, they&apos;ll go to your Facebook Page or Instagram account.
                              </p>
                            </div>
                          </label>
                          {addWebsiteUrl && (
                            <input type="url" value={ad.website_url} onChange={e => setAd(a => ({...a, website_url: e.target.value}))}
                              className={inp} placeholder="https://yourwebsite.com/page" />
                          )}
                        </div>
                      </>
                    )}

                    {/* CTA */}
                    <Field label="Call to action">
                      <div className="relative">
                        <select value={ad.cta} onChange={e => setAd(a => ({...a, cta: e.target.value}))}
                          className={inp + " pr-8 appearance-none"}>
                          {CTA_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                      </div>
                    </Field>
                  </div>
                </div>

                )} {/* end showSummary ternary */}

                {/* Right: preview â€” always visible */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Preview tabs */}
                  <div className="flex border-b border-zinc-800 px-4">
                    {(["desktop","mobile","instagram"] as const).map(t => (
                      <button key={t} onClick={() => setPreview(t)}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-all capitalize ${
                          previewTab === t ? "border-zinc-300 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}>
                        {t === "desktop" && <Monitor className="w-3.5 h-3.5" />}
                        {t === "mobile"  && <Smartphone className="w-3.5 h-3.5" />}
                        {t === "instagram" && <InstaIcon className="w-3.5 h-3.5" />}
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Preview area */}
                  <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start p-5 bg-zinc-950/50 gap-3">
                    {(() => {
                      const pageName = pages.find(p => p.id === selectedPage)?.account_name || "Your Page";
                      const pageInitial = pageName.charAt(0).toUpperCase();
                      const imageEl = ad.image_url
                        ? <Image src={ad.image_url} alt="" width={400} height={previewTab === "instagram" ? 400 : 225} className="w-full object-cover" unoptimized />
                        : <div className="w-full bg-zinc-100 flex items-center justify-center" style={{ aspectRatio: previewTab === "instagram" ? "1/1" : "16/9" }}><ImageIcon className="w-8 h-8 text-zinc-300" /></div>;

                      if (previewTab === "instagram") {
                        // Message destination â€” messenger preview style
                        if (convLocation === "message") {
                          return (
                            <div className="bg-white rounded-xl overflow-hidden shadow-lg w-64">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-0.5">
                                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-zinc-800">{pageInitial}</div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-zinc-900">{pageName}</p>
                                    <p className="text-[9px] text-zinc-500">Sponsored Â· ðŸŒ</p>
                                  </div>
                                </div>
                                <span className="text-zinc-400">Â·Â·Â·</span>
                              </div>
                              {imageEl}
                              <div className="px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-zinc-400 truncate">{pageName.toLowerCase().replace(/ /g, "")}.com</p>
                                  <button className="flex items-center gap-1 text-[11px] text-blue-500 font-bold shrink-0">
                                    {ad.cta} <span className="text-xs">â€º</span>
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-100">
                                <div className="flex items-center gap-3 text-zinc-600">
                                  <span>â™¡</span><span>ðŸ’¬</span><span>âŠ˜</span>
                                </div>
                                <span className="text-zinc-600">ðŸ”–</span>
                              </div>
                              <div className="px-3 pb-2">
                                <p className="text-[11px] font-bold text-zinc-900">{pageName}</p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="bg-white rounded-xl overflow-hidden shadow-lg w-64">
                            {/* Instagram header */}
                            <div className="flex items-center justify-between px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-0.5">
                                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-bold text-zinc-800">{pageInitial}</div>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-zinc-900">{pageName}</p>
                                  <p className="text-[9px] text-zinc-500">Sponsored Â· ðŸŒ</p>
                                </div>
                              </div>
                              <span className="text-zinc-400">Â·Â·Â·</span>
                            </div>
                            {/* Square image */}
                            {imageEl}
                            {/* Actions */}
                            <div className="px-3 pt-2 pb-1">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-3 text-zinc-700">
                                  <span className="text-lg">â™¡</span>
                                  <span className="text-lg">ðŸ’¬</span>
                                  <span className="text-lg">â†—</span>
                                </div>
                                <span className="text-lg text-zinc-700">ðŸ”–</span>
                              </div>
                              {(ad.headline || ad.copy) && (
                                <div className="flex items-center justify-between mt-1 border-t border-zinc-100 pt-1.5">
                                  <div className="flex-1 min-w-0">
                                    {ad.website_url && <p className="text-[9px] text-zinc-400 uppercase truncate">{ad.website_url.replace(/https?:\/\//, "").split("/")[0]}</p>}
                                    {ad.headline && <p className="text-[11px] font-bold text-zinc-900 truncate">{ad.headline}</p>}
                                  </div>
                                  <button className="ml-2 px-2 py-1 bg-zinc-100 text-zinc-800 text-[10px] font-bold rounded shrink-0">{ad.cta}</button>
                                </div>
                              )}
                              <p className="text-[11px] font-bold text-zinc-900 mt-1">{pageName}</p>
                            </div>
                          </div>
                        );
                      }

                      // Desktop / Mobile â€” Facebook style
                      return (
                        <div className={`bg-white rounded-xl overflow-hidden shadow-lg ${previewTab === "mobile" ? "w-64" : "w-80"}`}>
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-zinc-300 flex items-center justify-center text-xs font-bold text-zinc-700">{pageInitial}</div>
                                <div>
                                  <p className="text-xs font-bold text-zinc-900">{pageName}</p>
                                  <p className="text-[10px] text-zinc-500">Sponsored Â· ðŸŒ</p>
                                </div>
                              </div>
                              <span className="text-zinc-400 text-lg">Â·Â·Â·</span>
                            </div>
                            {ad.copy && <p className="text-xs text-zinc-800 mb-2 leading-relaxed">{ad.copy}</p>}
                            {imageEl}
                            {(ad.headline || ad.website_url) && (
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  {ad.website_url && <p className="text-[10px] text-zinc-400 uppercase truncate">{ad.website_url.replace(/https?:\/\//, "").split("/")[0]}</p>}
                                  {ad.headline && <p className="text-xs font-bold text-zinc-900 mt-0.5 truncate">{ad.headline}</p>}
                                </div>
                                <button className="ml-2 px-3 py-1.5 bg-zinc-200 text-zinc-800 text-[11px] font-bold rounded shrink-0">{ad.cta}</button>
                              </div>
                            )}
                            <div className="flex items-center gap-4 mt-3 pt-2 border-t border-zinc-100">
                              {["ðŸ‘ Like", "ðŸ’¬ Comment", "â†— Share"].map(label => (
                                <button key={label} className="flex-1 text-center text-[11px] text-zinc-500 font-semibold">{label}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <p className="text-[10px] text-zinc-700 text-center px-4 max-w-xs">
                      Social networks regularly make updates to formatting, so your post may appear slightly different when published.{" "}
                      <span className="underline cursor-pointer">Learn more</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* â”€â”€ STEP 4 â”€â”€ */}
            {step === 4 && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Review and publish</h3>
                  <p className="text-sm text-zinc-500">Review your campaign settings before publishing to Meta.</p>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Campaign name",      value: campName },
                    { label: "Objective",          value: OBJECTIVES.find(o => o.value === objective)?.label || objective },
                    { label: "Optimization",       value: optimize },
                    { label: "Budget",             value: `$${parseFloat(budgetAmt || "0").toFixed(2)} per ${budgetType}` },
                    { label: "Start date",         value: startDate ? new Date(startDate).toLocaleDateString() : "Immediately" },
                    { label: "End date",           value: endDate ? new Date(endDate).toLocaleDateString() : "No end date" },
                    { label: "Audience",           value: `Age ${ageMin}â€“${ageMax}, ${gender === "ALL" ? "All genders" : gender}, ${(() => { try { return (JSON.parse(location) as {display_name:string}[]).map(l => l.display_name).join(", "); } catch { return location || "â€”"; } })()}` },
                    { label: "Ad headline",        value: ad.headline || "â€”" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-4 py-3 border-b border-zinc-800/50">
                      <p className="text-xs text-zinc-500 w-36 shrink-0 pt-0.5">{label}</p>
                      <p className="text-sm text-zinc-300">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
            {step > 1 && (
              <button onClick={() => { setStep(s => s - 1); setFieldErrors({}); }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
                {step === 2 ? "Campaign objective" : step === 3 ? "Audience and budget" : "Create your ads"}
              </button>
            )}
          </div>
          {publishingStatus && <p className="text-xs text-blue-400 animate-pulse">{publishingStatus}</p>}
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex items-center gap-3">
            <button onClick={saveAsDraft} disabled={saving}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save as draft"}
            </button>
            {step < 4 ? (
              <button onClick={() => {
                if (!validateStep(step)) return;
                setShowMediaErr(false); setShowWelcomeErr(false);
                setStep(s => s + 1);
              }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-900 text-sm font-bold rounded-lg transition-colors">
                {nextLabel[step]}
              </button>
            ) : (
              <button onClick={publish} disabled={publishing}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-900 text-sm font-bold rounded-lg transition-colors disabled:opacity-50">
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Publish campaign
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  // Render Media Vault Picker portal when open
  const vaultPickerPortal = showVaultPicker && typeof window !== "undefined"
    ? createPortal(
        <MediaVaultPicker
          title="Choose from Media Vault"
          hint="Select an image to use as your ad creative"
          typeFilter="image"
          onSelect={url => {
            setAd(a => ({ ...a, image_url: url }));
            setShowMediaErr(false);
            clearErr("adImage");
            setShowVaultPicker(false);
          }}
          onClose={() => setShowVaultPicker(false)}
        />,
        document.body
      )
    : null;

  return (
    <>
      {modal}
      {vaultPickerPortal}
    </>
  );
}
