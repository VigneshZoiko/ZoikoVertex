import { AlertTriangle } from "lucide-react";
import { CONTAINER_WIDE } from "./CookiePreferencesShared";

export default function CookiePreferencesNotice() {
  return (
    <section className="border-b border-orange-400/25 bg-[linear-gradient(87deg,#0c0a09_0%,#1a2e05_100%)]">
      <div className={`${CONTAINER_WIDE} flex gap-4 py-4`}>
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-orange-400"
          strokeWidth={2.5}
        />
        <p className="text-[11.5px] leading-[1.7] text-orange-400/75 font-[family-name:var(--font-jetbrains)]">
          <span className="font-bold text-orange-400">
            Pre-publication notice for legal and product review.
          </span>{" "}
          Cookie categories, vendor lists, retention periods, and consent logic
          must reflect actual implemented technologies before publication.
          Review with counsel for all target jurisdictions. California &ldquo;Do
          Not Sell or Share&rdquo; and Global Privacy Control obligations
          require engineering confirmation before activation.
        </p>
      </div>
    </section>
  );
}
