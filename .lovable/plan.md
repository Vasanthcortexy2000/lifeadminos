

# Push Notifications with Opt-in Permission

## Overview

This plan adds native push notifications to the app so you'll receive alerts on your phone even when the app is closed. Importantly, the app will **ask for your permission first** before enabling notifications.

---

## How It Will Work

1. **First time you open the app**: A friendly dialog appears asking if you'd like to receive push notifications
2. **If you say yes**: The app registers your device and you'll get notifications for upcoming deadlines
3. **If you say no**: No problem - you can always enable them later from settings
4. **When a reminder is due**: Your phone buzzes/vibrates with the reminder message, even if the app is closed

---

## What Gets Built

### 1. Permission Prompt Dialog
A welcoming dialog that appears on first app launch (after login):

```text
+----------------------------------+
|  [Bell icon]                     |
|                                  |
|  Stay on top of deadlines        |
|                                  |
|  Get a gentle nudge when         |
|  something important is coming   |
|  up - even when you're not       |
|  using the app.                  |
|                                  |
|  [Enable notifications]          |
|  [Maybe later]                   |
+----------------------------------+
```

### 2. Settings Integration
- Add a "Push notifications" toggle to the existing Reminder Preferences dialog
- Shows current permission status
- Allows re-enabling if previously declined

### 3. Backend Notification Delivery
- When reminders are due, send push notifications to registered devices
- Works alongside existing in-app nudges

---

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/usePushNotifications.ts` | Core hook for registering/managing push notifications |
| `src/components/NotificationPermissionDialog.tsx` | The opt-in permission prompt |
| `supabase/functions/send-push-notification/index.ts` | Backend function to send notifications via FCM |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Show permission dialog on first login |
| `src/components/ReminderPreferencesDialog.tsx` | Add push notification toggle |
| `supabase/functions/process-reminders/index.ts` | Trigger push notifications when creating nudges |
| `capacitor.config.ts` | Add push notification plugin config |

### Database Changes

Add columns to `profiles` table:
- `push_enabled` (boolean) - User preference for push notifications
- `push_token` (text) - Device token for sending notifications
- `push_permission_asked` (boolean) - Track if we've asked for permission

---

## Dependencies to Install

```bash
# Capacitor Push Notifications plugin
@capacitor/push-notifications
```

---

## User Flow

```text
User logs in
     |
     v
Has permission been asked before?
     |
     +-- No --> Show permission dialog
     |              |
     |              +-- "Enable" --> Request OS permission
     |              |                    |
     |              |                    +-- Granted --> Register token, save to DB
     |              |                    +-- Denied --> Save preference, hide dialog
     |              |
     |              +-- "Maybe later" --> Save preference, hide dialog
     |
     +-- Yes --> Check if push_enabled
                    |
                    +-- Continue to dashboard
```

---

## Backend Push Flow

```text
Hourly cron triggers process-reminders
     |
     v
Create nudge in database
     |
     v
Check if user has push_enabled = true
     |
     +-- No --> Done (in-app only)
     |
     +-- Yes --> Get push_token from profiles
                    |
                    v
              Call send-push-notification function
                    |
                    v
              Send via Firebase Cloud Messaging
```

---

## Permission Dialog Behavior

1. **Shown once per user** (tracked via `push_permission_asked`)
2. **Appears after login**, not before (user must be authenticated)
3. **Non-blocking** - user can dismiss and continue using the app
4. **Re-accessible** from settings if they want to enable later

---

## Security Considerations

- Push tokens are stored per-user and protected by RLS
- Only the backend (service role) can read tokens to send notifications
- Users can revoke permission at any time from settings

---

## What You'll Need

For push notifications to work on a real device, you'll need:
1. **For iOS**: An Apple Developer account and push certificate
2. **For Android**: A Firebase project with Cloud Messaging enabled

After implementation, I'll provide step-by-step instructions for setting these up when you're ready to test on a real device.

