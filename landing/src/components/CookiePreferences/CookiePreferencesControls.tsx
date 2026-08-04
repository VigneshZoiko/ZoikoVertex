"use client";

import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useCookieConsent } from "./CookieConsentProvider";
import type { CategoryId } from "./constants";
import ConsentActions from "./ConsentActions";
import { Callout, Lede, SectionHeader } from "./CookiePreferencesShared";

type Category = {
  id: CategoryId;
  name: string;
  /** Exported icon from public/images/cookie-preferences. */
  icon: string;
  /** Tailwind classes for the icon tile — one accent per category. */
  tile: string;
  description: string;
};

const ICON_DIR = "/images/cookie-preferences";

const CATEGORIES: Category[] = [
  {
    id: "necessary",
    name: "Strictly Necessary",
    icon: "Lock.png",
    tile: "bg-violet-500/10 border-violet-500/20",
    description:
      "Required for security, site delivery, session management, consent storage, and fraud prevention. Cannot be disabled.",
  },
  {
    id: "analytics",
    name: "Analytics",
    icon: "BarChart3.png",
    tile: "bg-[#20E7F2]/[0.06] border-[#20E7F2]/25",
    description:
      "Helps us understand page performance, content engagement, conversion paths, and product-interest signals to improve the website.",
  },
  {
    id: "personalization",
    name: "Personalization",
    icon: "Sparkles.png",
    tile: "bg-orange-400/[0.07] border-orange-400/25",
    description:
      "Remembers your preferences, region, or language to tailor content, demo recommendations, and resource suggestions.",
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: "Megaphone.png",
    tile: "bg-amber-500/10 border-amber-500/20",
    description:
      "Supports campaign attribution, retargeting, ad measurement, and cross-site advertising. Subject to Do Not Sell or Share controls where applicable.",
  },
  {
    id: "integrations",
    name: "Integrations",
    icon: "Puzzle.png",
    tile: "bg-green-500/10 border-green-500/20",
    description:
      "Enables embedded video, scheduling widgets, live chat, CRM forms, and demo library playback where available.",
  },
];

function Toggle({
  id,
  name,
  checked,
  onChange,
}: {
  id: CategoryId;
  name: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <span className="w-6 text-right text-[12px] font-medium text-slate-500 font-[family-name:var(--font-jetbrains)]">
        {checked ? "On" : "Off"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${name} cookies`}
        id={`toggle-${id}`}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#20E7F2]" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-transform ${
            checked ? "translate-x-[26px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </div>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const { draft, toggle, hydrated } = useCookieConsent();
  const locked = category.id === "necessary";

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${category.tile}`}
        >
          <Image
            src={`${ICON_DIR}/${category.icon}`}
            alt=""
            width={16}
            height={16}
            className="h-4 w-4"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-slate-900 font-[family-name:var(--font-bricolage)]">
            {category.name}
          </h3>
          <p className="mt-1.5 text-[12.5px] font-light leading-[1.65] text-slate-500">
            {category.description}
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {locked ? (
            <span className="inline-flex items-center whitespace-nowrap rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-medium text-violet-600 font-[family-name:var(--font-jetbrains)]">
              Always Active
            </span>
          ) : (
            <Toggle
              id={category.id}
              name={category.name}
              checked={hydrated && draft[category.id]}
              onChange={() => toggle(category.id)}
            />
          )}

          <ChevronDown
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 text-gray-400"
            strokeWidth={2.5}
          />
        </div>
      </div>
    </div>
  );
}

export default function CookiePreferencesControls() {
  return (
    <section>
      <SectionHeader
        id="cookie-controls"
        num={1}
        title="Manage Cookie Categories"
        badge={{ label: "Interactive", tone: "cyan" }}
      />

      <Lede>
        ZoikoVertex uses cookies and similar technologies across five
        categories. Strictly necessary technologies cannot be disabled. All
        other categories can be turned on or off individually — or you can
        accept or reject all non-essential cookies at once.
      </Lede>

      <p className="mt-5 text-[15px] font-light leading-[1.85] text-slate-700">
        <span className="font-semibold text-slate-900">
          You can change these choices at any time
        </span>{" "}
        using the controls below or the Cookie Preferences link in the footer of
        any page.
      </p>

      <div className="mt-8 space-y-4">
        {CATEGORIES.map((c) => (
          <CategoryCard key={c.id} category={c} />
        ))}
      </div>

      <Callout tone="green" lead="No dark patterns.">
        Accepting all cookies is not easier or harder than rejecting
        non-essential cookies. Both choices are equally accessible. You can
        withdraw consent at any time using the controls on this page or the
        footer link.
      </Callout>

      <div className="mt-8">
        <ConsentActions theme="light" />
      </div>
    </section>
  );
}
