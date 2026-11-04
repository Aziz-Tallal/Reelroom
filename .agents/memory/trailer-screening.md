---
name: Trailer screening
description: User requirements for trailer moderation and an OpenRouter video-input limitation.
---

## Screening requirement
Trailers sourced from Cinemeta must be screened for nudity and sexual scenes before being added. The user chose their own OpenRouter key and a free video-capable model instead of a paid Qwen route.

**Why:** The user requested this content restriction and selected the free-model option.

**How to apply:** Verify actual video access before scanning a batch. Do not approve trailers based only on metadata, prior model knowledge, failed requests, or uncertain analysis.

## OpenRouter video balance gate
OpenRouter can reject video requests with HTTP 402 requiring at least $1.00 in credit balance even when the selected model has a `:free` route.

**Why:** A capability test was rejected before inference with that explicit provider error.

**How to apply:** Check video-input availability before building or running a large review batch. Zero model token pricing does not establish that video requests work without a balance; provider requirements may change.
