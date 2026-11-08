---
name: REELROOM Supabase email confirmation
description: Signup confirmation and user-data ownership for REELROOM accounts.
---

REELROOM uses Supabase email-and-password authentication with email confirmation disabled so users can sign in immediately after signup. Supabase Auth owns email and password credentials; never store raw passwords in app tables. The profile display name belongs in `public.profiles`, populated from signup metadata by the existing Auth-user trigger.

**Why:** The user explicitly asked to keep signup simple and allow users to sign in without confirming email.

**How to apply:** Keep email/password auth in Supabase, disable its Confirm Email setting, and rely on the existing profile trigger for display names. Never store raw passwords in app tables.
