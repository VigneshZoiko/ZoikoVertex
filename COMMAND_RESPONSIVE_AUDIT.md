# Command Section — Responsive Audit

**Pages in scope:** Dashboard (`/`) · Resource Monitoring (`/resources`)  
**Audited:** 2026-06-22

---

## Files Audited

| File | Role |
|---|---|
| `frontend/src/app/(dashboard)/layout.tsx` | Shell layout — sidebar + header + content |
| `frontend/src/components/Sidebar.tsx` | Navigation sidebar |
| `frontend/src/components/Header.tsx` | Top header bar |
| `frontend/src/app/(dashboard)/page.tsx` | Dashboard (Command Center) |
| `frontend/src/app/(dashboard)/resources/page.tsx` | Resource Monitoring |

---

## Issues Found

### 1. Sidebar — No Mobile Drawer (Critical)

- Sidebar always renders as inline block (`static` in flow)
- On `<768px`, sidebar steals layout width; content area is crushed
- No hamburger / overlay / drawer for mobile
- No backdrop or close affordance

**Fix:** Make sidebar `fixed` + slide-in overlay on `<md`. Add hamburger to Header. Add backdrop in layout.

---

### 2. Layout — Content Padding Too Large on Mobile (High)

- `p-8` applied to all page content containers
- On 320 px this is `32px × 4 = 128px` wasted per axis, leaving ~`64px` of usable width

**Fix:** `p-4 sm:p-6 lg:p-8`

---

### 3. Layout — Loading Skeleton: Hardcoded `grid-cols-4` (Medium)

- Skeleton card grid uses `grid-cols-4` with no responsive variant
- On mobile, 4 tiny skeletons overflow or crush to nothing

**Fix:** `grid-cols-2 sm:grid-cols-4`

---

### 4. Header — No Hamburger for Mobile (Critical, blocks sidebar fix)

- Header has no menu-toggle button
- `px-8` is excessive on mobile

**Fix:** Add `<Menu>` icon button (`md:hidden`). Reduce padding `px-4 sm:px-6 md:px-8`.

---

### 5. Dashboard — Second Section: Missing `md` Breakpoint (Medium)

- `grid grid-cols-1 lg:grid-cols-3` — jumps from 1-col (mobile) to 3-col (desktop)
- At tablet (768–1023 px), Campaign Status and Agent Ops stack in one column, wasting horizontal space

**Fix:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

---

### 6. Dashboard — Card Padding Too Large on Mobile (Low)

- Status Distribution and Ops Quick Stats cards use `p-8` unconditionally

**Fix:** `p-5 sm:p-6 lg:p-8`

---

### 7. Dashboard — Heading Typography Not Scaled for Mobile (Low)

- `text-3xl` heading and `mb-8` margin are over-sized on 320 px

**Fix:** `text-2xl sm:text-3xl`, `mb-5 sm:mb-8`

---

### 8. Resource Monitoring — Header Overflows on Mobile (Critical)

- `flex items-center justify-between` puts "Resource Monitoring" h1 and the "This Cycle Spend" widget + Refresh button on one row
- On 320–414 px the row is too wide; h1 clips or wraps awkwardly

**Fix:** `flex-col sm:flex-row` with `gap-4`, add `shrink-0` to right widget group

---

### 9. Resource Monitoring — Resource Cards Skip `lg` Breakpoint (Medium)

- `grid-cols-1 md:grid-cols-2 xl:grid-cols-4` — at 1024–1279 px still 2 columns
- Leaves a lot of empty space at laptop breakpoints

**Fix:** `md:grid-cols-2 lg:grid-cols-4`

---

### 10. Resource Monitoring — Consumption Feed Table: No Horizontal Scroll (High)

- 5-column table (`Type · Resource · Quantity · Cost · Time`) inside a container with no `overflow-x-auto`
- On mobile, table overflows the card and the page viewport

**Fix:** Add `overflow-x-auto` to table container. Add `min-w-[600px]` to `<table>`.

---

### 11. Resource Monitoring — Heading Not Scaled for Mobile (Low)

- `text-3xl` on the Resource Monitoring h1

**Fix:** `text-2xl sm:text-3xl`

---

### 12. ManageStoragePanel — Toolbar May Squeeze on 320 px (Low)

- `flex items-center gap-3` with search (`flex-1`) + type filter — can get narrow

**Fix:** `flex-wrap`, `min-w-[160px]` on search, `px-4 sm:px-6`

---

## Summary Matrix

| # | Area | Severity | Type |
|---|---|---|---|
| 1 | Sidebar — no mobile drawer | Critical | Layout |
| 2 | Layout — `p-8` on mobile | High | Spacing |
| 3 | Skeleton — `grid-cols-4` | Medium | Visual |
| 4 | Header — no hamburger | Critical | Layout |
| 5 | Dashboard — missing `md` breakpoint | Medium | Grid |
| 6 | Dashboard — card `p-8` | Low | Spacing |
| 7 | Dashboard — heading size | Low | Typography |
| 8 | Resources — header overflow | Critical | Layout |
| 9 | Resources — cards skip `lg` | Medium | Grid |
| 10 | Resources — table no scroll | High | Table |
| 11 | Resources — heading size | Low | Typography |
| 12 | ManageStorage — toolbar squeeze | Low | Spacing |
