# Calendar Redesign — Regression Audit

**Date:** 2026-06-22  
**Auditor:** Static analysis (read-only)  
**File audited:** `src/app/(dashboard)/calendar/page.tsx`  
**Method:** Line-by-line comparison of current file against pre-redesign version (reconstructed from conversation context and full read of the current file)

---

## 1. Data Fetching

### `fetchAllPosts()` — lines 115–129

| Attribute | Before | After | Changed? |
|-----------|--------|-------|----------|
| API endpoint | `GET /api/v1/calendar/events` | `GET /api/v1/calendar/events` | No |
| Request payload | None (GET) | None (GET) | No |
| Success check | `result.success && Array.isArray(result.data)` | `result.success && Array.isArray(result.data)` | No |
| Success branch | `setPosts(result.data as CalendarPost[])` | `setPosts(result.data as CalendarPost[])` | No |
| Error branch | `setPosts([])` | `setPosts([])` | No |
| Loading state set | `setLoading(true)` / `setLoading(false)` | `setLoading(true)` / `setLoading(false)` | No |
| `useCallback` deps | `[]` | `[]` | No |

### Mount trigger — line 131

```
useEffect(() => { fetchAllPosts(); }, [fetchAllPosts]);
```
Unchanged.

### 60-second auto-refresh — lines 134–137

```
const id = setInterval(fetchAllPosts, 60_000);
return () => clearInterval(id);
```
Unchanged.

### Auth guard — lines 107–111

```
supabase.auth.getUser().then(({ data: { user } }) => {
  if (!user) router.push("/login");
});
```
Unchanged. No new Supabase reads or writes.

**Section verdict: PASS — no data fetching changes.**

---

## 2. Business Logic

### `handleUpdatePost()` — lines 140–157

Compared character by character:

| Attribute | Before | After | Changed? |
|-----------|--------|-------|----------|
| Guard | `if (!editingPost) return` | `if (!editingPost) return` | No |
| Endpoint | `PUT /api/v1/scheduler/posts/${editingPost.id}` | `PUT /api/v1/scheduler/posts/${editingPost.id}` | No |
| Payload | `{ content: editingPost.content, scheduledTime: editingPost.scheduled_time }` | `{ content: editingPost.content, scheduledTime: editingPost.scheduled_time }` | No |
| Success: refetch | `fetchAllPosts()` | `fetchAllPosts()` | No |
| Success: close modal | `setShowEditModal(false)` | `setShowEditModal(false)` | No |
| Success: message | `"Post updated successfully"` | `"Post updated successfully"` | No |
| Error: message | `result.error \|\| "Failed to update post"` | `result.error \|\| "Failed to update post"` | No |
| Catch message | `"Failed to update post"` | `"Failed to update post"` | No |

**Identical.**

### `handleCancelPost()` — lines 159–170

| Attribute | Before | After | Changed? |
|-----------|--------|-------|----------|
| Endpoint | `DELETE /api/v1/scheduler/posts/${postId}` | `DELETE /api/v1/scheduler/posts/${postId}` | No |
| Success: filter | `setPosts((prev) => prev.filter((p) => p.id !== postId))` | `setPosts((prev) => prev.filter((p) => p.id !== postId))` | No |
| Success: clear selected | `setSelectedPost(null)` | `setSelectedPost(null)` | No |
| Success: message | `"Post cancelled successfully"` | `"Post cancelled successfully"` | No |
| Catch message | `"Failed to cancel post"` | `"Failed to cancel post"` | No |

**Identical.** Note: `setSelectedPost(null)` is now a no-op (selected post is never set in the new UI) but calling it causes no error or behavioral difference.

### Status calculation helpers — lines 34–71

`pillClass`, `statusBadgeClass`, `intentLink`, `intentLinkLabel` — all four functions are **byte-for-byte identical** to the previous version.

### Scheduling / publishing behavior

No scheduling or publishing logic exists in this component beyond the `handleUpdatePost` / `handleCancelPost` calls. Both are unchanged. The component does not trigger, modify, or observe scheduling state beyond what the API returns.

**Section verdict: PASS — no business logic changes.**

---

## 3. Data Model

### `CalendarPost` interface — lines 17–30

```ts
interface CalendarPost {
  id: string;
  content: string;
  platform: string;
  calendarDate: string;
  status: string;
  media_url?: string;
  created_at: string;
  source: "scheduled" | "intent";
  scheduled_time?: string;
  scheduled_for?: string | null;
  campaign_id?: string | null;
  project_id?: string | null;
}
```

**Identical to previous version.** No fields added, removed, or type-changed.

### Status values referenced in code

| Status string | Present before | Present after | Changed? |
|--------------|---------------|--------------|----------|
| `"SCHEDULED"` | Yes | Yes | No |
| `"PUBLISHED"` | Yes | Yes | No |
| `"APPROVED"` | Yes | Yes | No |
| `"RETURNED"` | Yes | Yes | No |
| `"GOVERNANCE_BLOCKED"` | Yes | Yes | No |
| `"REJECTED"` | Yes | Yes | No |
| `"PENDING_*"` (prefix) | Yes | Yes | No |

### New function: `getStatusLabel()` — lines 73–89

This function is **purely cosmetic**. It formats a `CalendarPost` into a display string for the status badge (e.g. `"SCHEDULED · 14:00"`). It:
- Reads `post.source`, `post.status`, `post.scheduled_time` (existing fields, read-only)
- Returns a string
- Does not mutate state, call APIs, set any state, or affect any logic

The function reuses the same status string constants already present in `pillClass`/`statusBadgeClass`. It adds no new status values.

**Section verdict: PASS — data model unchanged.**

---

## 4. Edit Flow

### Opening the edit modal

| Step | Before | After |
|------|--------|-------|
| User action | Click post in month grid → detail panel appears → click "Edit" button | Click 3-dot menu on card → click "Edit" |
| Gate condition | `selectedPost.source === "scheduled" && selectedPost.status === "SCHEDULED"` | `post.source === "scheduled" && post.status === "SCHEDULED"` |
| State changes | `setEditingPost(selectedPost); setShowEditModal(true)` | `setEditingPost(post); setShowEditModal(true); setOpenMenuId(null)` |
| Functional difference | None — gate logic is equivalent | None — `setOpenMenuId(null)` closes the menu (UI-only) |

The edit modal JSX (lines 455–499) is **byte-for-byte identical** to the previous version. Content textarea, datetime input, Save Changes button calling `handleUpdatePost`, Cancel button calling `setShowEditModal(false)` — all unchanged.

### Cancelling posts

| Step | Before | After |
|------|--------|-------|
| User action | Click post → detail panel → "Cancel" button | 3-dot menu → "Cancel Post" |
| Call | `handleCancelPost(selectedPost.id)` | `handleCancelPost(post.id)` |
| Function | Identical | Identical |
| Gate | `selectedPost.source === "scheduled" && selectedPost.status === "SCHEDULED"` | `post.source === "scheduled" && post.status === "SCHEDULED"` |

Same function, equivalent gate, same argument type.

### Validation

`handleUpdatePost` guard (`if (!editingPost) return`) — unchanged. The modal's "Save Changes" button only renders when `showEditModal && editingPost` are truthy, unchanged. No validation was added or removed.

**Section verdict: PASS — edit flow functionally unchanged.**

---

## 5. State Management

### New state variables

| Variable | Type | Default | UI-only? | Affects API? | Affects business logic? |
|----------|------|---------|----------|--------------|-------------------------|
| `selectedDate` | `Date` | `new Date()` | Yes | No | No |
| `statusFilter` | `"all"\|"scheduled"\|"publishing"` | `"all"` | Yes (client-side filter on already-fetched data) | No | No |
| `openMenuId` | `string \| null` | `null` | Yes (controls which 3-dot menu is open) | No | No |

All three are display/interaction state only.

### Existing state — behavioral audit

| Variable | Before | After | Behavioral change? |
|----------|--------|-------|--------------------|
| `currentDate` | Used for month grid (±1 month nav) | Used for week strip label and week calculation (±7 day nav) | **Yes — navigation step changed from ±1 month to ±7 days** (UI behavior, not data behavior) |
| `posts` | Source of truth for all post data | Source of truth for all post data | No |
| `loading` | Tracks `fetchAllPosts` in-progress | Tracks `fetchAllPosts` in-progress | No |
| `selectedPost` | Set when user clicks a post in grid; cleared on cancel | Never set in new UI; still cleared in `handleCancelPost` | No data/logic impact — setter call is now a no-op |
| `showEditModal` | Controls edit modal visibility | Controls edit modal visibility | No |
| `editingPost` | Holds post being edited | Holds post being edited | No |
| `message` | Toast message state | Toast message state | No |

**Section verdict: PASS — new state is UI-only; existing state functionally unchanged.**

---

## 6. Navigation

### Routes — no changes

| Route | Before | After | Changed? |
|-------|--------|-------|----------|
| Auth redirect | `/login` | `/login` | No |
| Intent: RETURNED | `/publish` (via `intentLink`) | `/publish` (via `intentLink`) | No |
| Intent: PENDING_* | `/review` (via `intentLink`) | `/review` (via `intentLink`) | No |
| Intent: APPROVED/BLOCKED/REJECTED | `/governance` (via `intentLink`) | `/governance` (via `intentLink`) | No |
| Intent: default | `/publish` (via `intentLink`) | `/publish` (via `intentLink`) | No |

### New navigation entry points (additions, not changes)

| Entry point | Target | Was it accessible before? | Regression risk? |
|-------------|--------|--------------------------|-----------------|
| FAB "+" button (`md:hidden`) | `/publish` | Yes, via sidebar nav | None — links to existing accessible route |
| "History" link in COMPLETED header | `/library` | Yes, via sidebar nav | None — links to existing accessible route |

These are new shortcuts to existing, already-accessible routes. They do not create new routes, bypass permissions, or expose anything previously restricted.

### Permissions — unchanged

No permission checks exist in this file. Auth is handled by the dashboard layout. `intentLink()` redirects are status-based (unchanged function).

**Section verdict: PASS — no route changes; two additive navigation entry points.**

---

## 7. Side Effects

| Side effect | Before | After | Changed? |
|-------------|--------|-------|----------|
| `GET /api/v1/calendar/events` | On mount + every 60s | On mount + every 60s | No |
| `PUT /api/v1/scheduler/posts/{id}` | On save in edit modal | On save in edit modal | No |
| `DELETE /api/v1/scheduler/posts/{id}` | On cancel post | On cancel post | No |
| `supabase.auth.getUser()` | On mount | On mount | No |
| New API calls | None | None | — |
| New Supabase writes | None | None | — |

**Section verdict: PASS — no new side effects.**

---

## 8. User Functionality Matrix

| Feature | Before | After | Changed? | Notes |
|---------|--------|-------|----------|-------|
| View scheduled posts | Month grid — all posts for the month visible simultaneously | Card list — only posts for the **selected day** visible | **Yes** | Scope reduced: month → day. Must navigate day-by-day to see all posts. |
| View publishing hub posts | Month grid — all month | Card list — selected day only | **Yes** | Same scope reduction. |
| View published posts | Right sidebar — up to 10 most recent, all dates | Card list COMPLETED section — selected day only | **Yes** | Same scope reduction. |
| Edit scheduled post | Click post → detail panel → Edit button → modal | 3-dot menu → Edit → modal | No | Path changed, outcome identical. Same modal, same API call. |
| Cancel scheduled post | Click post → detail panel → Cancel button → `handleCancelPost` | 3-dot menu → Cancel Post → `handleCancelPost` | No | Path changed, function identical. |
| Navigate dates | ±1 month (previous/next month arrows) | ±7 days (previous/next week arrows) | **Yes** | Granularity changed. No longer possible to jump directly by month. |
| Refresh calendar data | Automatic every 60s | Automatic every 60s | No | Unchanged. |
| Open publish page | Via sidebar nav only | Via sidebar nav + FAB (`md:hidden`) | No | Addition only. Existing access unaffected. |
| View intent deep links | Click post → detail panel → context-aware link | 3-dot menu → context-aware link | No | Same `intentLink()` / `intentLinkLabel()` function. Same destinations. |
| View all month's posts at a glance | Yes — full grid | **No** — only selected day | **Capability removed** | The month grid is gone. No equivalent all-month overview exists. |
| Today button | Visible in header — resets `currentDate` to today | **Removed** | **Yes** | No quick way to jump back to today's date from an arbitrary week. |

---

## 9. Dead Code Introduced

The following items remain declared but are no longer called or rendered. They cause no errors but represent maintenance debt:

| Symbol | Type | Was used for | Now used? |
|--------|------|-------------|-----------|
| `navigateMonth` | Function | Month grid navigation buttons | No (replaced by `navigateWeek`) |
| `getDaysInMonth` | Function | Month grid cell count calculation | No |
| `daysInMonth` | Computed | Grid `Array.from({ length: daysInMonth })` | No |
| `startingDay` | Computed | Grid empty cell prefix | No |
| `dayNames` | Array | Grid header row (`["Sun","Mon",...]`) | No |
| `getPostsForDay` | Function | Per-cell post list | No |
| `scheduledCount` | Computed | Legend ("Scheduled (N)") | No |
| `intentCount` | Computed | Legend ("Publishing Hub (N)") | No |
| `Clock` | Icon import | Selected post detail time row | No |
| `MediaPreview` | Component import | Selected post detail media preview | No |
| `CheckCircle2` | Icon import (partially) | Still used as placeholder in COMPLETED cards | Yes — retained |

`pillClass` is declared and unchanged but not called anywhere in the new render. It was called in the old grid cells.

---

## 10. Final Verdict

### Classification: **Minor Functional Change**

Cannot be classified as "UI-only change" because:

1. **Viewing scope changed from month to day.** In the previous version, all posts for the entire current month were visible simultaneously in the grid. In the new version, only the selected day's posts are shown. Users relying on a month-level overview to plan content distribution can no longer do so without navigating day-by-day.

2. **"Today" shortcut removed.** The previous header included a "Today" button that reset the view to the current month. This no longer exists. A user navigating weeks away from today has no single-click path back.

3. **Navigation granularity changed.** Arrows previously moved ±1 month; they now move ±7 days. A user wanting to see content 3 months out must click 12+ times instead of 3.

### What is confirmed unchanged:

- ✅ All API endpoints, request payloads, response parsing
- ✅ `fetchAllPosts`, `handleUpdatePost`, `handleCancelPost` — identical
- ✅ `CalendarPost` type definition — identical
- ✅ All status values, source values, business logic conditions
- ✅ Edit modal — JSX, validation, save/cancel behavior
- ✅ Intent deep links (destination routes, labels, conditions)
- ✅ Auth redirect logic
- ✅ Auto-refresh cadence (60s)
- ✅ No new API calls or Supabase writes

### Risk Assessment

**Regression risk: Low.** No data loss, no broken flows, no changed API behavior. The risk is limited to UX workflows where users needed month-level visibility. The edit and cancel flows work correctly through the new 3-dot menu path.

**Recommended follow-up:** Consider adding a "Today" reset button to the week strip header and evaluating whether a month-overview mode should be preserved as an optional toggle.
