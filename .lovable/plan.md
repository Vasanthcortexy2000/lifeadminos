
# Plan: Add "We remember so you don't have to." Tagline with First-Person Voice

## Overview
We'll update all messaging across the app to use the new tagline and consistently speak in first-person plural ("we", "us", "our"). This creates a warmer, more personal brand identity where Life Admin OS feels like a supportive team standing behind the user.

---

## Files to Update

### 1. SEO & Meta Tags (`index.html`)
- **New Title**: "Life Admin OS - We Remember So You Don't Have To"
- **New Meta Description**: "We turn confusing documents into clear responsibilities. We track your deadlines and make sure nothing critical slips through."
- **Open Graph & Twitter Cards**: Update all descriptions to first-person
- **Structured Data**: Update Organization description

### 2. Auth Page (`src/pages/Auth.tsx`)
- **Main Tagline** (line 147): Change "Everything you need to remember. Handled." to **"We remember so you don't have to."**
- **Supporting Text** (line 150-151): Change to "When life gets busy, we make sure nothing slips through."
- **Value Props**:
  - "Deadlines and action items extracted instantly" → "We extract deadlines and action items instantly"
  - "Know exactly what to do and when" → "We tell you exactly what to do and when"
  - "Reminders that follow up until it's done" → "We follow up until it's done"
- **Universal tagline** (line 188-189): "If you need to remember it, we track it."
- **Trust message** (line 321): "Your documents stay private and secure. We never sell or share your data."

### 3. Header (`src/components/Header.tsx`)
- **Subtitle** (line 79): Change "Your responsibility guardian" to **"We remember so you don't have to."**

### 4. Dashboard (`src/pages/Index.tsx`)
- **Welcome messages** (lines 131-136):
  - Stressed: "Let's take this step by step." → **"We've got this. Let's take it step by step."**
  - Calm: "I have your back." → **"We have your back."**
  - Supporting text: "You don't need to remember everything. I will." → **"You don't need to remember everything. We will."**
- **Empty state** (line 188): "I'll help you keep on top..." → "We'll help you keep on top..."
- **Trust message** (line 287): "We do not sell..." (already correct)

### 5. Stress Awareness Hook (`src/hooks/useStressAwareness.ts`)
Update all reassurance messages to first-person plural:
- "You're on track. One step at a time." → "You're on track. We're with you."
- "Everything's manageable. You've got this." → "Everything's manageable. We've got this together."
- "A few priorities need attention. We'll tackle them together." (already correct)
- "Let's take this step by step." → "We'll take this step by step."
- "We'll work through this together..." (already correct)
- "Let's simplify what's on your plate." → "We'll simplify what's on your plate."

### 6. AI Chat Widget (`src/components/AIChatWidget.tsx`)
- **Header subtitle** (line 128): "Ask about your obligations" → "We're here to help"
- **Empty state text** (line 147-148): "I can help you understand..." → "We can help you understand your obligations. Try asking:"

### 7. AI Chat Edge Function (`supabase/functions/ai-chat/index.ts`)
- Update system prompt to use first-person plural: "We are a helpful, calm, and supportive team..." and "We have access to your obligations..."

---

## Voice Guidelines Summary

| Before (Mixed Voice) | After (First-Person Plural) |
|---------------------|----------------------------|
| "Your responsibility guardian" | "We remember so you don't have to." |
| "I have your back" | "We have your back" |
| "I will remember" | "We will remember" |
| "I'll help you" | "We'll help you" |
| "Track deadlines" | "We track your deadlines" |

---

## Technical Details

### Files Modified
1. `index.html` - SEO meta tags and structured data
2. `src/pages/Auth.tsx` - Login/signup page messaging
3. `src/components/Header.tsx` - App header subtitle
4. `src/pages/Index.tsx` - Dashboard welcome messages
5. `src/hooks/useStressAwareness.ts` - Reassurance messages
6. `src/components/AIChatWidget.tsx` - Chat widget labels
7. `supabase/functions/ai-chat/index.ts` - AI assistant personality

### No Database Changes
This is a messaging-only update with no schema or RLS changes required.

### Deployment
The AI chat edge function will be automatically deployed after changes.
