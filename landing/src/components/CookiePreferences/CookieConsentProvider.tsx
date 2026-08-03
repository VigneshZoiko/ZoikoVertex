"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ALL_ON,
  CONSENT_VERSION,
  DEFAULT_CONSENT,
  OPTIONAL_CATEGORIES,
  type CategoryId,
  type Consent,
} from "./constants";

const CONSENT_KEY = "zv_cookie_consent_v1";

type CookieConsentValue = {
  /** Working copy the toggles write to — not yet persisted. */
  draft: Consent;
  /** Last persisted choice, or null if the visitor has never chosen. */
  saved: Consent | null;
  savedAt: string | null;
  /** True once localStorage has been read, so SSR and first paint agree. */
  hydrated: boolean;
  /** navigator.globalPrivacyControl, once known. */
  gpc: boolean | null;
  toggle: (id: CategoryId) => void;
  save: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
};

const CookieConsentContext = createContext<CookieConsentValue | null>(null);

function normalize(value: unknown): Consent | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const next = { ...DEFAULT_CONSENT };
  for (const id of OPTIONAL_CATEGORIES) {
    next[id] = raw[id] === true;
  }
  return next;
}

function readStored(): { consent?: unknown; at?: string } | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState<Consent>(DEFAULT_CONSENT);
  const [saved, setSaved] = useState<Consent | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [gpc, setGpc] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = readStored();
    const consent = normalize(stored?.consent);

    if (consent) {
      setDraft(consent);
      setSaved(consent);
      setSavedAt(stored?.at ?? null);
    }

    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    setGpc(nav.globalPrivacyControl === true);
    setHydrated(true);
  }, []);

  const commit = useCallback((consent: Consent) => {
    const at = new Date().toISOString();

    setDraft(consent);
    setSaved(consent);
    setSavedAt(at);

    try {
      window.localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({ consent, at, version: CONSENT_VERSION })
      );
    } catch {
      /* storage unavailable (private mode, quota) — choice stays in-memory */
    }

    window.dispatchEvent(
      new CustomEvent("zv:cookie-consent", { detail: { consent } })
    );
  }, []);

  const value = useMemo<CookieConsentValue>(
    () => ({
      draft,
      saved,
      savedAt,
      hydrated,
      gpc,
      toggle: (id) => {
        if (id === "necessary") return;
        setDraft((prev) => ({ ...prev, [id]: !prev[id] }));
      },
      save: () => commit(draft),
      acceptAll: () => commit(ALL_ON),
      rejectNonEssential: () => commit(DEFAULT_CONSENT),
    }),
    [draft, saved, savedAt, hydrated, gpc, commit]
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used inside CookieConsentProvider");
  }
  return ctx;
}
