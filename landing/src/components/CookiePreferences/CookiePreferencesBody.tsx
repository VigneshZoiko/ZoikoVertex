import { CONTAINER } from "./CookiePreferencesShared";
import CookiePreferencesToc from "./CookiePreferencesToc";
import CookiePreferencesControls from "./CookiePreferencesControls";
import CookiePreferencesSummary from "./CookiePreferencesSummary";
import CookiePreferencesCalifornia from "./CookiePreferencesCalifornia";
import CookiePreferencesVendors from "./CookiePreferencesVendors";
import CookiePreferencesRecord from "./CookiePreferencesRecord";
import CookiePreferencesFaq from "./CookiePreferencesFaq";

export default function CookiePreferencesBody() {
  return (
    <div className={`${CONTAINER} py-12`}>
      {/* 224px rail + 80px gutter + 768px column = the 1072px Figma grid */}
      <div className="flex items-start gap-20">
        <CookiePreferencesToc />

        <div className="min-w-0 flex-1 space-y-14 lg:max-w-[768px]">
          <CookiePreferencesControls />
          <CookiePreferencesSummary />
          <CookiePreferencesCalifornia />
          <CookiePreferencesVendors />
          <CookiePreferencesRecord />
          <CookiePreferencesFaq />
        </div>
      </div>
    </div>
  );
}
