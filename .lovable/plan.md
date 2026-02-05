

# Auth Page Redesign: Mobile-First, Distilled Value Proposition

## The Problem

The current signup page has three issues:

1. **Mobile users see nothing** — The entire value proposition is hidden on mobile (`hidden lg:flex` on line 132)
2. **Too many words** — 4 bullet points with long descriptions overwhelm users
3. **Generic use case list** — "Assignments, exams, visa renewals, appointments, bills..." is exhaustive but forgettable

---

## The Solution

### New Messaging Framework

**Headline**: "Everything you need to remember. Handled."

**Pain point hook**: "When life gets busy, things slip through. This app makes sure they don't."

**3 Value Props** (icon + short title + one-liner):

| Icon | Title | Description |
|------|-------|-------------|
| FileUp | **Drop any document** | Deadlines and action items extracted instantly |
| ListChecks | **Get guided steps** | Know exactly what to do and when to do it |
| BellRing | **Never forget** | Reminders that follow up until it's done |

**No use case list** — Instead, one simple line: "If you need to remember it, we track it."

---

## Layout Changes

### Mobile View (Visible to all users)

```text
┌─────────────────────────────────┐
│ [Shield] Life Admin OS          │
├─────────────────────────────────┤
│ Everything you need to remember.│
│ Handled.                        │
│                                 │
│ When life gets busy, things     │
│ slip through. This app makes    │
│ sure they don't.                │
├─────────────────────────────────┤
│ [📄] Drop    [✓] Get   [🔔] Never│
│      doc        steps      forget│
├─────────────────────────────────┤
│ [Email input]                   │
│ [Password input]                │
│ [Create account]                │
└─────────────────────────────────┘
```

### Desktop View (Two-column)

Left panel keeps the same 3 value props with slightly expanded descriptions. Right panel has the auth form.

---

## Technical Changes

**File**: `src/pages/Auth.tsx`

1. **Remove `hidden lg:flex`** from left panel — make it visible on all screens
2. **Restructure layout** — Stack vertically on mobile, side-by-side on desktop
3. **Replace 4 bullet points** with 3 compact icon-driven props
4. **Update headline** to "Everything you need to remember. Handled."
5. **Remove the "Works for:" list** — Replace with "If you need to remember it, we track it."
6. **Add 3-icon horizontal row** for mobile (compact visual summary)

---

## Copy Changes Summary

| Current | New |
|---------|-----|
| "The last reminder app you'll ever need." | "Everything you need to remember. Handled." |
| 4 feature bullets with long descriptions | 3 icon props with one-liners |
| "Works for: Assignments, exams, visa renewals..." | "If you need to remember it, we track it." |
| Desktop-only value prop | Mobile-first, visible everywhere |

---

## Accessibility Maintained

- All icons remain decorative with `aria-hidden="true"`
- Minimum 44px touch targets preserved
- ARIA labels and semantic HTML unchanged
- High contrast text maintained

