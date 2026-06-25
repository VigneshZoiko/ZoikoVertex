function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

const SESSION_KEY = "zt-chatbot-session";
const PREFS_KEY = "zt-chatbot-prefs";
const DRAFT_KEY = "zt-chatbot-draft";

export async function saveSession(session) {
  if (window.zoikoDesktop?.session?.save) {
    await window.zoikoDesktop.session.save(session);
  }
  if (!isBrowser()) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession() {
  if (window.zoikoDesktop?.session?.get) {
    const session = await window.zoikoDesktop.session.get();
    if (session) {
      if (isBrowser()) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    }
  }

  if (!isBrowser()) return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  const session = JSON.parse(raw);
  if (session?.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
    await clearSession();
    return null;
  }

  return session;
}

export async function clearSession() {
  if (window.zoikoDesktop?.session?.clear) {
    await window.zoikoDesktop.session.clear();
  }
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEY);
}

export function saveDraft(draft) {
  if (!isBrowser()) return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadDraft() {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(DRAFT_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearDraft() {
  if (!isBrowser()) return;
  localStorage.removeItem(DRAFT_KEY);
}

export function loadPrefs() {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(PREFS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function savePrefs(prefs) {
  if (!isBrowser()) return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
