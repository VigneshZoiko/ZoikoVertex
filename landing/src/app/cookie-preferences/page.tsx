import { CookieConsentProvider } from "@/components/CookiePreferences/CookieConsentProvider";
import CookiePreferencesHero from "@/components/CookiePreferences/CookiePreferencesHero";
import CookiePreferencesNotice from "@/components/CookiePreferences/CookiePreferencesNotice";
import CookiePreferencesBody from "@/components/CookiePreferences/CookiePreferencesBody";

export default function CookiePreferencesPage() {
  return (
    <main className="min-h-screen bg-[#f5f6f8]">
      <CookieConsentProvider>
        <CookiePreferencesHero />
        <CookiePreferencesNotice />
        <CookiePreferencesBody />
      </CookieConsentProvider>
    </main>
  );
}
