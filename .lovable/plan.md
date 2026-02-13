

# Onboarding Walkthrough Tour

## Overview
We'll build a guided first-time user tour that highlights the key features of the dashboard -- document upload, timeline, calendar, and vault -- using tooltip-style popover steps. The tour uses `localStorage` to track whether the user has seen it, so it only appears once.

## How It Works
1. When a new user lands on the dashboard for the first time, a welcome dialog appears inviting them to take a quick tour
2. The tour steps through 4-5 key areas with highlighted tooltips that explain each feature
3. Users can skip the tour at any time, or navigate back and forth between steps
4. A subtle "Restart Tour" button in the header lets users replay it later

## Tour Steps

| Step | Target Element | Title | Description |
|------|---------------|-------|-------------|
| 1 | Document Upload section | Drop your documents here | We'll read your documents and pull out every deadline, obligation, and action item automatically. |
| 2 | Timeline section | Your Life Timeline | We organise everything by urgency so you always know what needs attention first. |
| 3 | Calendar nav link | Calendar View | We lay out your deadlines on a calendar so you can see what's coming up at a glance. |
| 4 | Vault nav link | Document Vault | We keep all your uploaded documents safe and searchable in one place. |
| 5 | Nudges sidebar | Smart Nudges | We'll gently remind you when something needs your attention -- no nagging, just helpful nudges. |

## New Files

### `src/hooks/useOnboardingTour.ts`
- Custom hook managing tour state (current step, active/inactive, visibility)
- Reads/writes `onboarding_tour_completed` flag in `localStorage`
- Exposes `startTour()`, `nextStep()`, `prevStep()`, `skipTour()`, `isActive`, `currentStep`

### `src/components/OnboardingTour.tsx`
- Renders the tour UI: a backdrop overlay with a spotlight cutout around the target element
- Each step shows a popover tooltip positioned relative to the target element
- Contains step content, progress dots, Back/Next/Skip buttons
- Uses `document.querySelector` with `data-tour` attributes to find target elements
- Smooth scroll to target element before showing each tooltip
- Welcome dialog for step 0 ("Welcome! Want a quick tour?")

## Modified Files

### `src/pages/Index.tsx`
- Add `data-tour="upload"` to the document upload section
- Add `data-tour="timeline"` to the timeline section
- Add `data-tour="nudges"` to the sidebar/nudges area
- Import and render the `<OnboardingTour />` component
- Wire up the `useOnboardingTour` hook

### `src/components/Header.tsx`
- Add `data-tour="calendar"` to the Calendar nav link
- Add `data-tour="vault"` to the Vault nav link
- Add a small "Tour" button (HelpCircle icon) visible when the user is logged in, allowing them to restart the tour

## Technical Details

### Tour Positioning
- Each step defines a `targetSelector` (e.g., `[data-tour="upload"]`) and a `placement` (top, bottom, left, right)
- The component uses `getBoundingClientRect()` to position the tooltip relative to the target
- A semi-transparent overlay with a CSS `clip-path` creates the spotlight effect around the target element
- `ResizeObserver` and scroll listeners reposition the tooltip if the page layout shifts

### State Persistence
- `localStorage.getItem('onboarding_tour_completed')` checked on mount
- Set to `'true'` when the user completes or skips the tour
- A "Restart Tour" action resets this flag and re-triggers the tour

### Mobile Responsiveness
- Tooltip width adapts to screen size (full-width on mobile with padding)
- Placement adjusts to `bottom` on small screens to avoid overflow
- Touch-friendly button sizes (min 44px targets)

### No Database Changes
This is entirely client-side using `localStorage`. No migrations or RLS changes needed.

### Voice Consistency
All tour copy uses first-person plural ("We'll read your documents...", "We organise everything...") to match the established brand voice.

