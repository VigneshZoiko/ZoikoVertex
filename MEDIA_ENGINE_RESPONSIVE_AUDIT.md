# Media Engine — Responsive Audit

**Date:** 2026-06-22  
**Breakpoint targets:** 320px · 375px · 390px · 414px · 768px · 1024px · 1280px · 1440px · 1920px

---

## Routes Audited

| Route | File | Status |
|-------|------|--------|
| `/library` | `app/(dashboard)/library/page.tsx` | ⚠ Issues found |
| `/library/upload` | `app/(dashboard)/library/upload/page.tsx` | ⚠ Issues found |
| `/campaigns` | `app/(dashboard)/campaigns/page.tsx` | 🔴 Critical issues |
| `/calendar` | `app/(dashboard)/calendar/page.tsx` | ⚠ Issues found |
| `/inbox` | `app/(dashboard)/inbox/page.tsx` | 🔴 Critical issues |
| `/publish` | `app/(dashboard)/publish/page.tsx` | ⚠ Issues found |
| `/returned` | `app/(dashboard)/returned/page.tsx` | ✅ Mostly good |

---

## Issues Discovered

### 🔴 Critical

#### `campaigns/page.tsx`
- **Sub-sidebar never hides on mobile**: `<aside>` with `w-48 | w-10` is always inline — on 320px it consumes 40px of the viewport leaving only 280px for content
- **Pixel table overflow**: `grid grid-cols-[auto_2fr_1fr_1fr_1fr_auto]` fixed 6-column grid with no `overflow-x-auto` wrapper — overflows page at any width below ~640px
- **Content header overflow**: `flex items-center justify-between` row contains AccountSelector + filter select + refresh button + create button — wraps badly on narrow screens

#### `inbox/page.tsx`
- **Three-panel layout with no mobile collapse**: Filter panel (collapsible, `w-44|w-0`) + Message list (`w-64`, fixed) + Detail panel (`flex-1`) — on 320px the message list alone exceeds viewport width
- **No mobile navigation flow**: No back button in detail panel, no way to return to list on mobile

---

### ⚠ Moderate

#### `library/page.tsx`
- **Fixed `p-8` padding**: Outer container `p-8 max-w-7xl mx-auto` — `p-8` (32px) on 320px leaves only 256px content width
- **Preview modal min-width**: `min-w-[min(100%,600px)]` — the 600px target can force overflow at very small widths due to flex behavior

#### `library/upload/page.tsx`
- **Fixed `p-8` padding**: Root wrapper `max-w-4xl mx-auto p-8` — same 32px padding issue on mobile
- **Upload card inner padding**: Card has `p-8` — too aggressive on 320px

#### `calendar/page.tsx`
- **7-column grid not scrollable**: `grid grid-cols-7` with `min-h-[120px]` cells — at 320px each cell is ~45px wide, event pills are unreadable, day numbers overlap
- **Edit modal not bottom-sheet**: Modal uses `items-center justify-center` on all sizes — on mobile a centered modal with heavy padding can feel cramped

#### `publish/page.tsx`
- **Fixed `px-6` outer padding**: `max-w-6xl mx-auto pb-20 px-6` — `px-6` (24px) on 320px leaves 272px content — slightly aggressive for smallest screens

#### `returned/page.tsx`
- **Tab overflow**: `flex gap-1 w-fit` tab group — could overflow viewport on 320px if tabs are numerous
- **Card action row**: `flex items-start justify-between` in ReviewCard header — wraps with `flex-wrap` already present ✅

#### `components/publish/SchedulingPanel.tsx`
- **Fixed 2-column grid**: `grid grid-cols-2 gap-4` for Region + Age Group selects — on 320px each column is ~110px, inputs very narrow

---

## Shared Components — Status

| Component | Status |
|-----------|--------|
| `Sidebar.tsx` | ✅ Mobile drawer fully implemented |
| `layout.tsx` | ✅ `min-w-0` flex safety, responsive padding |
| `Header.tsx` | ✅ Mobile hamburger, hidden breadcrumbs |
| `ConfirmActionModal.tsx` | ✅ `px-4` mobile gutter |
| `MediaVaultPicker.tsx` | ✅ `grid-cols-3 sm:grid-cols-4` |
| `MediaPreview.tsx` | ✅ Adapts to container |
| `MediaUploader.tsx` | ✅ Full-width, no fixed widths |
| `PlatformSelector.tsx` | ✅ Already `flex-wrap` |
| `PendingPostItem.tsx` | ✅ Responsive cards |
| `AIWriterPanel.tsx` | ✅ No fixed widths |
| `MediaPackManager.tsx` | ✅ Responsive |

---

## Priority List

| Priority | File | Fix |
|----------|------|-----|
| P0 | `campaigns/page.tsx` | Sub-sidebar mobile overlay + pixel table scroll + header wrap |
| P0 | `inbox/page.tsx` | Single-panel mobile with back navigation (2-panel at md) |
| P1 | `calendar/page.tsx` | Horizontal scroll on calendar grid + bottom-sheet modal |
| P1 | `library/page.tsx` | Responsive padding + modal width fix |
| P1 | `publish/page.tsx` | Responsive outer padding |
| P2 | `library/upload/page.tsx` | Responsive padding on containers |
| P2 | `returned/page.tsx` | Tab overflow + padding check |
| P2 | `SchedulingPanel.tsx` | Grid columns responsive |
