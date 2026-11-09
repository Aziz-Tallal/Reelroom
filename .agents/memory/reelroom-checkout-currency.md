---
name: REELROOM checkout currency
description: REELROOM catalog and payment checkout should remain in Kuwaiti dinars.
---

Keep REELROOM catalog prices and Stripe checkout in KWD. Do not silently convert prices to another currency. Stripe must have KWD enabled for the connected account before checkout can process.

**Why:** The user chose to enable KWD in Stripe so existing catalog pricing remains unchanged.

**How to apply:** Preserve KWD across catalog display, price quotes, and Stripe prices. Ask before changing the checkout currency or conversion approach.
