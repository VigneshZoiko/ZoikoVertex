import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "ZoikoVertex Publisher — X Integration Docs",
  description:
    "Public documentation for the ZoikoVertex Publisher X integration: OAuth 2.0 connection, requested scopes, publishing through the X API, media handling, and data usage.",
};

const PAGE_BG = {
  background:
    "radial-gradient(circle at 15% 10%, rgba(201,168,76,0.05) 0%, rgba(201,168,76,0) 38%), linear-gradient(180deg, #050A17 0%, #08101F 100%)",
};

const SECTIONS = [
  {
    id: "overview",
    heading: "Overview",
    body: [
      "ZoikoVertex Publisher is an AI-powered social media management platform. It lets individuals and teams create, review, schedule, and publish social content, with a governed approval workflow and an evidence trail for every action.",
      "The X integration lets an authorized user connect their X account, prepare posts, preview them, and publish directly through the X API.",
    ],
  },
  {
    id: "connect",
    heading: "Connecting an X account (OAuth 2.0)",
    body: [
      "Users connect X through the OAuth 2.0 authorization-code flow with PKCE. ZoikoVertex never receives or stores an X password — only a scoped access token issued by X.",
      "Token exchange uses POST /2/oauth2/token. After authorization, the connected account profile (name, username, avatar) is read with GET /2/users/me.",
    ],
  },
  {
    id: "scopes",
    heading: "Requested scopes",
    list: [
      "tweet.read — read post metadata used for previews and history.",
      "tweet.write — publish posts created by the user.",
      "users.read — read the connected account profile.",
      "offline.access — refresh the access token so the connection stays valid.",
    ],
  },
  {
    id: "publish",
    heading: "Creating and publishing a post",
    body: [
      "A user composes post text and optional media inside the ZoikoVertex composer, then previews how it will appear on X.",
      "On publish, the post is created with POST /2/tweets. The returned post id and status are stored in the user's publishing history.",
    ],
  },
  {
    id: "media",
    heading: "Media handling",
    body: [
      "Images attached to a post are uploaded to X before publishing and referenced by media id when the post is created. Uploads use the media_category tweet_image.",
    ],
  },
  {
    id: "workflow",
    heading: "Approval workflow",
    body: [
      "Posts move through draft, review, and approval before they can be published. Each decision is recorded, so teams have an auditable record of who approved what and when.",
    ],
  },
  {
    id: "data",
    heading: "Data usage and revocation",
    body: [
      "ZoikoVertex stores only the access token and the minimum profile data needed to show the connected account and publishing history. A user can disconnect X at any time, which removes the stored token. Access can also be revoked from the X account settings.",
    ],
  },
];

export default function XDocsPage() {
  return (
    <main style={PAGE_BG} className="text-slate-300 font-sans antialiased">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 pt-24 pb-24 md:pt-32">
        <Link
          href="/x"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to X integration
        </Link>

        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-5 h-px bg-[#C9A84C]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C9A84C]">Documentation</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
          X Integration
        </h1>
        <p className="mt-4 text-slate-400 leading-relaxed">
          How ZoikoVertex Publisher connects to X and publishes through the X API. This page is
          publicly accessible and requires no login.
        </p>

        <div className="mt-12 space-y-12">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4">{s.heading}</h2>
              {s.body?.map((p, i) => (
                <p key={i} className="text-[15px] text-slate-400 leading-relaxed mb-3">
                  {p}
                </p>
              ))}
              {s.list && (
                <ul className="space-y-2 mt-2">
                  {s.list.map((item, i) => (
                    <li key={i} className="flex gap-3 text-[15px] text-slate-400 leading-relaxed">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#20E7F2] shrink-0" />
                      <span className="font-mono text-[13px] break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
