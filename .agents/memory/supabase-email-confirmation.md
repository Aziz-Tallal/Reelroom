---
name: REELROOM Supabase email confirmation
description: Signup confirmation and user-data ownership for REELROOM accounts.
---

REELROOM uses Supabase email-and-password authentication with email confirmation enabled. Supabase Auth owns email and password credentials; never store raw passwords in app tables. The profile display name belongs in `public.profiles`, populated from signup metadata by the existing Auth-user trigger. The confirmation screen is app-branded, while confirmation delivery remains a Supabase Auth responsibility.

**Why:** The user explicitly asked for Supabase email confirmation and for account information to be stored there, reversing the earlier prototype-only choice to skip confirmation.

**How to apply:** Keep Supabase's Confirm Email setting enabled, use an allowlisted confirmation redirect URL, and remember that the built-in sender's rate limits still apply.
