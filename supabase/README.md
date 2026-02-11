# Supabase SQL Run Order

Run these SQL files in Supabase SQL Editor in this order:

1. `profiles.sql` (required)
2. `02_duas.sql` (required for cloud sync of dua library)
3. `03_user_preferences.sql` (recommended for synced onboarding/preferences)
4. `04_subscriptions.sql` (recommended for real premium state)

## What each table is for

- `profiles`: one row per auth user.
- `duas`: user-created dua items (`arabic`, `translation`, `category`, `source`, `is_favorite`).
- `user_preferences`: user-level app state you want cross-device (`has_completed_onboarding`).
- `subscriptions`: premium status (should be managed by backend/webhooks, not client writes).

## Notes

- `profiles.sql` already adds an auth trigger so profile rows are created when a user signs up.
- `03_user_preferences.sql` adds a similar auth trigger for default preferences.
- `04_subscriptions.sql` only includes a read policy for users by design; write through service role.
