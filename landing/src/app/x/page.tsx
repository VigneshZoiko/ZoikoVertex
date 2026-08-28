import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  Link2,
  PenLine,
  Eye,
  Send,
  Sparkles,
  Hash,
  ShieldCheck,
  ClipboardCheck,
  BarChart3,
  Image as ImageIcon,
  Lock,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "ZoikoVertex Publisher — X Integration",
  description:
    "AI-powered social media publishing with X integration. Connect your X account, compose posts, preview, and publish directly through the X API — with AI-assisted captions, media, and an approval workflow.",
};

const PAGE_BG = {
  background:
    "radial-gradient(circle at 15% 10%, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0) 38%), radial-gradient(circle at 85% 90%, rgba(32,231,242,0.10) 0%, rgba(32,231,242,0) 42%), linear-gradient(180deg, #050A17 0%, #08101F 100%)",
};

const X_STEPS = [
  { icon: Link2, title: "Connect X account", body: "Authorize with X using OAuth 2.0. No passwords are stored — only a scoped access token." },
  { icon: PenLine, title: "Create the post", body: "Compose text, attach images, and see a live character count before anything is sent." },
  { icon: Eye, title: "Preview", body: "See exactly how the post will render on X — handle, avatar, media, and copy — before publishing." },
  { icon: Send, title: "Publish to X", body: "Publish directly through the X API. The post id and status are recorded in your history." },
];

const API_EVIDENCE = [
  { label: "Authorization", value: "OAuth 2.0 + PKCE — POST /2/oauth2/token" },
  { label: "Account profile", value: "GET /2/users/me (name, username, avatar)" },
  { label: "Publish post", value: "POST /2/tweets" },
  { label: "Media upload", value: "Media endpoint — media_category: tweet_image" },
  { label: "Requested scopes", value: "tweet.read · tweet.write · users.read · offline.access" },
];

const WORKFLOW = [
  { icon: PenLine, title: "Draft", body: "A team member drafts a post with AI-assisted copy and media." },
  { icon: ClipboardCheck, title: "Review", body: "Reviewers check tone, claims, and brand rules before it can go live." },
  { icon: ShieldCheck, title: "Approve", body: "An approver signs off. Every decision is recorded as evidence." },
  { icon: Send, title: "Publish", body: "The approved post is published to X through the X API." },
];

const AI_FEATURES = [
  { icon: Sparkles, title: "Caption generation", body: "Generate on-brand post copy tailored to X in seconds." },
  { icon: Hash, title: "Hashtag suggestions", body: "Get relevant, non-spammy hashtags to extend reach." },
  { icon: ImageIcon, title: "Media management", body: "Attach and manage images that publish alongside the post." },
];

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 mb-4">
      <span className="w-5 h-px bg-[#C9A84C]" />
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C9A84C]">{children}</span>
    </div>
  );
}

export default function XIntegrationPage() {
  return (
    <main style={PAGE_BG} className="text-slate-300 font-sans antialiased">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-24 pb-16 md:pt-32 md:pb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#20E7F2]" />
            <span className="text-[11px] font-semibold tracking-wide text-slate-300">
              Publicly accessible — no login required
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-bold tracking-tight text-white leading-[1.08] max-w-4xl">
            ZoikoVertex Publisher
            <span className="block text-[#20E7F2]">AI-powered publishing, built for X.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed">
            ZoikoVertex Publisher helps individuals and teams create, review, schedule, and publish
            social content. It connects to X so authorized users can prepare posts, preview them, and
            publish directly through the X API — with AI-assisted captions, media, and a full approval
            workflow.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/request-demo"
              className="inline-flex items-center gap-2 rounded-lg bg-[#20E7F2] px-5 py-3 text-sm font-semibold text-[#04121a]"
            >
              <Link2 className="w-4 h-4" /> Request a demo
            </Link>
            <Link
              href="/x/docs"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:border-white/30 transition-colors"
            >
              View documentation <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5" /> OAuth 2.0 only. ZoikoVertex never sees or stores your X password.
          </p>
        </div>
      </section>

      {/* ===== X Integration: workflow + live mockup ===== */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 md:py-24">
          <SectionTag>X Integration</SectionTag>
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black leading-tight text-white max-w-3xl">
            Connect X, compose, preview, and publish through the X API.
          </h2>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Steps */}
            <ol className="space-y-5">
              {X_STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[#20E7F2]/10 border border-[#20E7F2]/25 flex items-center justify-center">
                    <s.icon className="w-5 h-5 text-[#20E7F2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#20E7F2]">0{i + 1}</span>
                      <h3 className="text-white font-semibold">{s.title}</h3>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            {/* Composer mockup */}
            <div className="rounded-2xl border border-white/10 bg-[#0A1120] overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-[11px] text-slate-500 font-mono">ZoikoVertex Publisher — Compose</span>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#20E7F2] to-[#3b82f6]" />
                    <div>
                      <div className="text-sm font-semibold text-white">ZoikoVertex</div>
                      <div className="text-xs text-slate-500">@zoikovertex · connected to X</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#20E7F2]/10 border border-[#20E7F2]/25 px-2 py-1 text-[10px] font-semibold text-[#20E7F2]">
                    <Check className="w-3 h-3" /> X connected
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-[15px] text-slate-200 leading-relaxed">
                    Governed autonomous execution is here. ZoikoVertex Publisher lets teams draft,
                    review, and publish to X — with every decision recorded.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-[13px] text-[#20E7F2]">#AI</span>
                    <span className="text-[13px] text-[#20E7F2]">#Governance</span>
                    <span className="text-[13px] text-[#20E7F2]">#SocialMedia</span>
                  </div>
                  <div className="mt-3 h-24 rounded-lg border border-dashed border-white/15 bg-white/[0.02] flex items-center justify-center text-slate-600 text-xs">
                    <ImageIcon className="w-4 h-4 mr-2" /> Attached media
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-slate-500">
                    <Sparkles className="w-4 h-4 text-[#C9A84C]" />
                    <span className="text-xs">AI caption · hashtags</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-mono">198 / 280</span>
                    <span className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black">
                      <Send className="w-4 h-4" /> Publish to X
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* API usage evidence */}
          <div className="mt-12 rounded-2xl border border-[#20E7F2]/20 bg-[#20E7F2]/[0.04] p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[#20E7F2]" />
              <h3 className="text-white font-bold">How ZoikoVertex uses the X API</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {API_EVIDENCE.map((r) => (
                <div key={r.label} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#20E7F2]">{r.label}</div>
                  <div className="text-[13px] text-slate-300 font-mono mt-1 break-words">{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== AI features ===== */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 md:py-24">
          <SectionTag>AI-powered content</SectionTag>
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black leading-tight text-white max-w-3xl">
            Draft faster, on brand, ready for X.
          </h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
            {AI_FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="w-11 h-11 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/25 flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-[#C9A84C]" />
                </div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Publishing workflow ===== */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 md:py-24">
          <SectionTag>Publishing workflow</SectionTag>
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black leading-tight text-white max-w-3xl">
            Draft, review, approve, publish — with an evidence trail.
          </h2>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WORKFLOW.map((w, i) => (
              <div key={w.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-[#20E7F2]/10 border border-[#20E7F2]/25 flex items-center justify-center">
                    <w.icon className="w-5 h-5 text-[#20E7F2]" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-600">STEP {i + 1}</span>
                </div>
                <h3 className="text-white font-semibold mb-2">{w.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== See it in action: rendered end-to-end flow ===== */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 md:py-24">
          <SectionTag>See it in action</SectionTag>
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black leading-tight text-white max-w-3xl">
            The X publishing flow, end to end.
          </h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1 · Connect X */}
            <div className="rounded-2xl border border-white/10 bg-[#0A1120] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/10 text-[11px] font-mono text-slate-500">1 · Connect X</div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-black">X</span>
                  <span className="text-sm text-slate-300">Authorize ZoikoVertex</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">ZoikoVertex Publisher requests access to:</p>
                <ul className="space-y-2 mb-5">
                  {["tweet.read", "tweet.write", "users.read", "offline.access"].map((s) => (
                    <li key={s} className="flex items-center gap-2 text-[13px] text-slate-300 font-mono">
                      <Check className="w-3.5 h-3.5 text-[#20E7F2]" />
                      {s}
                    </li>
                  ))}
                </ul>
                <span className="block text-center rounded-lg bg-white py-2 text-sm font-bold text-black">Authorize app</span>
              </div>
            </div>

            {/* 2 · Compose */}
            <div className="rounded-2xl border border-white/10 bg-[#0A1120] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/10 text-[11px] font-mono text-slate-500">2 · Compose with AI</div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#C9A84C]" />
                  <span className="text-xs text-slate-400">AI caption + hashtags</span>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-[13px] text-slate-200 leading-relaxed">
                  Governed autonomous execution is here — draft, review, and publish to X with every
                  decision recorded.
                  <div className="mt-2 text-[#20E7F2]">#AI #Governance</div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">198 / 280</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black">
                    <Send className="w-3.5 h-3.5" /> Publish to X
                  </span>
                </div>
              </div>
            </div>

            {/* 3 · Published */}
            <div className="rounded-2xl border border-white/10 bg-[#0A1120] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/10 text-[11px] font-mono text-slate-500">3 · Published to X</div>
              <div className="p-5">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#20E7F2] to-[#3b82f6]" />
                    <div className="leading-tight">
                      <div className="text-sm font-semibold text-white">ZoikoVertex</div>
                      <div className="text-xs text-slate-500">@zoikovertex</div>
                    </div>
                    <span className="ml-auto w-7 h-7 rounded bg-white text-black flex items-center justify-center font-black text-sm">X</span>
                  </div>
                  <p className="text-[13px] text-slate-200 leading-relaxed">
                    Governed autonomous execution is here — draft, review, and publish to X with every
                    decision recorded. <span className="text-[#20E7F2]">#AI #Governance</span>
                  </p>
                  <div className="mt-3 flex items-center gap-5 text-slate-600 text-xs">
                    <span>Reply</span>
                    <span>Repost</span>
                    <span>Like</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-[#28c840]">
                  <Check className="w-3.5 h-3.5" /> Published via the X API — recorded in history
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Closing CTA ===== */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 md:py-24 text-center">
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black leading-tight text-white">
            Publish to X with governance built in.
          </h2>
          <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
            Connect your X account, let AI help you draft, review and approve, then publish directly
            through the X API — all from ZoikoVertex Publisher.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/request-demo"
              className="inline-flex items-center gap-2 rounded-lg bg-[#20E7F2] px-6 py-3 text-sm font-bold text-[#04121a]"
            >
              Request a demo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/x/docs"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:border-white/30 transition-colors"
            >
              Read the X integration docs
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
