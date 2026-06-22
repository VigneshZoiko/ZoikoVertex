# Calendar Redesign Report

**Date:** 2026-06-22  
**File modified:** `src/app/(dashboard)/calendar/page.tsx`  
**TypeScript errors introduced:** 0

---

## Verified Data Model Fields

`CalendarPost` interface (unchanged):

| Field | Type | Observed values |
|-------|------|-----------------|
| `id` | `string` | UUID |
| `content` | `string` | Post body text |
| `platform` | `string` | e.g. `"LinkedIn"`, `"Twitter"` — plain string, not enum |
| `calendarDate` | `string` | ISO date string e.g. `"2026-06-22T14:00:00.000Z"` — filtered with `startsWith(YYYY-MM-DD)` |
| `status` | `string` | `"SCHEDULED"`, `"PUBLISHED"`, `"APPROVED"`, `"RETURNED"`, `"GOVERNANCE_BLOCKED"`, `"REJECTED"`, or `"PENDING_*"` prefix (not an enum) |
| `source` | `"scheduled" \| "intent"` | Literal union |
| `media_url` | `string \| undefined` | CDN URL or absent |
| `scheduled_time` | `string \| undefined` | ISO datetime, only present for `source=scheduled` |
| `scheduled_for` | `string \| null \| undefined` | Target date for intents |
| `created_at` | `string` | ISO datetime |

No engagement stats (likes/shares) exist in the API response — the mockup's "♥ 1.2k ↗ 84" row was omitted.

---

## UI Changes Made

### Replaced

| Removed | Replaced with |
|---------|---------------|
| Full-month 7-column grid (`grid grid-cols-7`, `min-h-[120px]` cells) | 7-day horizontal week strip with day-of-week + date + post-dot indicator |
| Right sidebar (Upcoming + Completed panels) | Inline content list below the strip, grouped by UPCOMING / COMPLETED |
| `selectedPost` detail panel | 3-dot (`MoreVertical`) context menu per card |
| Month navigation by ±1 month | Week navigation by ±7 days |

### Preserved unchanged

- All API calls (`/api/v1/calendar/events`, 60s auto-refresh)
- `handleUpdatePost`, `handleCancelPost` handlers — zero changes
- Edit modal JSX — zero changes (bottom-sheet on mobile, centered on sm+)
- All helper functions: `pillClass`, `statusBadgeClass`, `intentLink`, `intentLinkLabel`, `getDaysInMonth`, `getPostsForDay`, `navigateMonth`
- `selectedPost` state declaration (setter still used in `handleCancelPost`)
- Loading state, message toast

### Added

- `getStatusLabel(post)` — formats status badge text (e.g. `"SCHEDULED · 14:00"`, `"PUBLISHED · 2:30 PM"`)
- `navigateWeek(dir)` — shifts `currentDate` + `selectedDate` by ±7 days
- `getWeekStart(d)` — returns the Monday of the week containing `d`
- States: `selectedDate`, `statusFilter`, `openMenuId`
- Menu backdrop `<div fixed inset-0 z-10>` — closes open 3-dot menus on outside click
- FAB "+" button (`md:hidden`) linking to `/publish`

---

## Assumptions Discovered During Implementation

1. **`status` is a plain string, not an enum.** The existing helper functions already handle this with string comparisons and `startsWith("PENDING_")`. The new `getStatusLabel` follows the same pattern.

2. **`calendarDate` is a full ISO string, not a date-only string.** The `startsWith(YYYY-MM-DD)` filter used in `getPostsForDay` already accounts for this — carried over unchanged.

3. **No "PUBLISHING · NOW" status exists.** In the mockup this appeared for active publishes. The closest equivalent is `source=intent, status=APPROVED`. These display as `"PUBLISHING · READY"` in the badge.

4. **`platform` is a single string, not an array.** Displayed as-is. If it contains commas (e.g. `"LinkedIn, Twitter"`), it renders fine as a single text node.

5. **`navigateMonth` remains declared but unused in the new render.** Kept to avoid any risk from removing an existing function. No TypeScript warning because it was not exported and the linting config does not flag this.

---

## Remaining Notes

- The week strip starts on Monday (ISO week standard).
- On desktop (`md+`), the layout constrains to `max-w-2xl` — the card list reads better at this width than spanning a 4-column grid.
- The FAB is `md:hidden` — desktop users access `/publish` via sidebar nav.
- Selecting "today" button was removed from the new header; clicking today's date in the strip serves the same purpose. If desired, a "Today" link can be added to the month header row.
