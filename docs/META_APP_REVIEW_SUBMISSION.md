# ZoikoVertex — Meta App Review Submission Guide

**App:** ZoikoVertex (App ID `1009863218371260`)
**Purpose:** Governed, autonomous social-media management platform for agencies and regulated enterprises.
**Prepared:** 2026-07-17
**Scope of this submission:** Everything EXCEPT the Inbox / Engagement (messaging) use cases — those are deferred to a later review round.

---

## 0. Before you submit — three prerequisites

**Every submitted permission needs a screen recording** showing a real person granting the permission and the app using it. Recordings must be in **English**, show the **full flow** (login → consent screen → the feature working), and clearly show the app's name/URL.

> **Default permissions — no review needed:** `email`, `public_profile`. Do not submit these.

---

## 1. Submission order (recommended)

Submit as a single review round covering these five use cases. Ordered by strength of evidence / likelihood of fast approval:

| # | Use case | Core permissions | Readiness |
|---|----------|------------------|-----------|
| 1 | **Ads Management** | `ads_management`, `ads_read`, `pages_manage_ads` | ✅ Proven live (full campaign, 21/21 steps) |
| 2 | **Business Asset Management** | `business_management` | ✅ Ready (used by campaign flow) |
| 3 | **Page Management & Publishing** | `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` | ✅ Ready |
| 4 | **Instagram Content Publishing** | `instagram_basic`, `instagram_content_publish` | ✅ Ready |
| 5 | **Insights & Analytics** | `read_insights`, `instagram_manage_insights` | ✅ Ready |

**Deferred to a later round (Inbox / Engagement):**
`pages_manage_engagement`, `pages_read_user_content`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_messaging`.

---

## 2. Use Case 1 — Ads Management

**Permissions:** `ads_management`, `ads_read`, `pages_manage_ads`
**Access level required:** Advanced Access (requires Business Verification)

### What the feature does
ZoikoVertex is an agency platform. The agency connects its own Meta ad account once. Clients create and boost campaigns inside ZoikoVertex; the platform builds the campaign, ad set, creative, and ad on the agency's ad account via the Marketing API and activates it. Clients never touch ad-account credentials.

### Video to record (~2–3 min)
1. Log into ZoikoVertex and show the dashboard (app name/URL visible).
2. Show connecting a Meta account — the Facebook consent screen listing the ads permissions.
3. Open **Campaign Creator** → create a Traffic campaign (name, small budget e.g. ₹500/$5, an image, a landing URL, basic targeting).
4. Click **Publish/Launch**. Show the success state.
5. Switch to **Meta Ads Manager** in another tab and show the campaign, ad set, and ad that were just created — proving `ads_management` wrote real objects.
6. (Optional) Show a reporting/analytics screen reading spend/results back via `ads_read`.

### Description / justification text (paste into Meta form)
> ZoikoVertex uses `ads_management` and `pages_manage_ads` to programmatically create and manage advertising campaigns, ad sets, ad creatives, and ads on the ad accounts connected by our agency users, and to promote their Facebook Pages. `ads_read` is used to retrieve campaign performance metrics (spend, reach, results) which we display in the user's reporting dashboard. All ad objects are created only in response to an explicit user action inside our campaign builder, on ad accounts the user owns or manages. We do not create ads without user initiation.

---

## 3. Use Case 2 — Business Asset Management

**Permission:** `business_management`
**Access level required:** Advanced Access (requires Business Verification)

### What the feature does
Resolves the agency's Business Manager assets — ad accounts, Pages, and the links between them — so campaigns are published to the correct, authorized ad account and Page.

### Video to record (~1–2 min)
1. In ZoikoVertex admin/settings, show connecting the Meta account (consent screen listing `business_management`).
2. Show the app listing the Business Manager's ad accounts / Pages available to the user.
3. Show selecting the ad account + Page used for campaigns (ties into the Ads Management flow above — you can record this as part of the same session).

### Description / justification text
> ZoikoVertex uses `business_management` to read the Business Manager assets (ad accounts and Pages, and the authorization links between them) that the connecting user administers, so that campaigns are published to the correct, authorized ad account and Page. We only read assets the user already manages and use them solely to configure and execute campaigns the user initiates.

---

## 4. Use Case 3 — Page Management & Publishing

**Permissions:** `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
**Access level required:** Advanced Access

### What the feature does
Users connect their Facebook Page(s) to ZoikoVertex, then create and publish posts (immediately or scheduled) through the platform's content composer, and see basic page engagement.

### Video to record (~2 min)
1. Log in, go to **Accounts / Channels**, click **Connect Facebook**.
2. Show the consent screen listing `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`.
3. Show the list of Pages returned (`pages_show_list`) and selecting one to connect.
4. Open the **Composer / Publishing** screen, write a post with an image, and **Publish**.
5. Open the actual Facebook Page in another tab and show the newly published post (proves `pages_manage_posts`).
6. Show a screen where the app displays the post's engagement/read data (`pages_read_engagement`).

### Description / justification text
> ZoikoVertex uses `pages_show_list` to let users select which of their Facebook Pages to connect. `pages_manage_posts` is used to publish and schedule content (text, images, links) that the user composes in our publishing tool to their own Page. `pages_read_engagement` is used to read the Page's content and engagement metadata so we can display published posts and their performance in the user's dashboard. All actions occur only on Pages the user administers and are initiated explicitly by the user.

---

## 5. Use Case 4 — Instagram Content Publishing

**Permissions:** `instagram_basic`, `instagram_content_publish`
**Access level required:** Advanced Access

### What the feature does
For Instagram Business/Creator accounts linked to a connected Facebook Page, users publish images/videos to Instagram from the same composer.

### Video to record (~2 min)
1. Connect a Facebook Page that has a linked Instagram Business account (consent screen shows `instagram_basic`, `instagram_content_publish`).
2. Show the connected Instagram account appearing in **Accounts** (`instagram_basic` — reads username/profile).
3. In the **Composer**, select the Instagram account, add an image + caption, and **Publish**.
4. Open the Instagram profile in another tab and show the newly published post (proves `instagram_content_publish`).

### Description / justification text
> ZoikoVertex uses `instagram_basic` to read the profile of the Instagram Business/Creator account linked to the user's connected Facebook Page (username, profile picture, account ID) so we can display it and target publishing to it. `instagram_content_publish` is used to publish images and videos, with captions, that the user composes in our tool to their own Instagram account. Publishing only happens in response to an explicit user action.

---

## 6. Use Case 5 — Insights & Analytics

**Permissions:** `read_insights`, `instagram_manage_insights`
**Access level required:** Advanced Access

### What the feature does
Displays performance analytics for connected Facebook Pages and Instagram accounts (reach, impressions, engagement) in the platform's analytics dashboards.

### Video to record (~1–2 min)
1. With a Page + Instagram account already connected, open the **Analytics / Insights** dashboard.
2. Show Facebook Page metrics loading (reach, impressions, engagement) — `read_insights`.
3. Show Instagram account/media insights loading — `instagram_manage_insights`.
4. Make clear the data corresponds to the connected accounts.

### Description / justification text
> ZoikoVertex uses `read_insights` to retrieve Facebook Page performance metrics and `instagram_manage_insights` to retrieve Instagram account and media insights, which we display to the user in analytics dashboards so they can measure the performance of their own content and accounts. We only read insights for accounts the user administers.

---

## 7. Deferred — Inbox / Engagement (submit in a later round)

Do **not** submit these now. They belong to the Inbox & Engagement module and will be reviewed once that module is finalized for public users.

| Permission | Feature |
|------------|---------|
| `pages_read_user_content` | Read incoming comments/posts on the Page |
| `pages_manage_engagement` | Reply to / manage Facebook Page comments |
| `pages_messaging` | Facebook Page direct messages |
| `instagram_manage_comments` | Read & reply to Instagram comments |
| `instagram_manage_messages` | Instagram direct messages |

---

## 8. Reviewer instructions & test setup (fill in before submitting)

Meta reviewers must be able to reproduce every flow. Provide, in the submission notes:

- **Test URL:** `https://<your-live-app-url>`
- **Test login credentials:** a username + password that lands the reviewer in a workspace with a Meta account already connectable (or step-by-step connect instructions).
- **Step-by-step written instructions** mirroring each video above.
- Confirm the app is **Live**, the **Privacy Policy URL** and **Data Deletion** callback are set, and the OAuth redirect URI is whitelisted.

> Tip: give the reviewer an account that can complete the Facebook Login → consent flow themselves; screencasts alone are often not enough for `ads_management`.

---

## 9. Quick checklist

- [ ] Privacy Policy URL + Data Deletion callback configured
- [ ] Test credentials + written steps prepared
- [ ] Video 1 — Ads Management recorded
- [ ] Video 2 — Business Asset Management recorded
- [ ] Video 3 — Page Management & Publishing recorded
- [ ] Video 4 — Instagram Content Publishing recorded
- [ ] Video 5 — Insights & Analytics recorded
- [ ] Justification text pasted per permission
- [ ] Inbox permissions **excluded** from this round
