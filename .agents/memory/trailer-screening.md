---
name: Trailer screening
description: User requirements for trailer moderation and an OpenRouter video-input limitation.
---

## Screening requirement
The user changed the requested screening from trailer video analysis to analysis of textual context for nudity and sexual activity. They accepted Cinemeta movie synopses as the available text source after being told these are not trailer-specific descriptions. They want their own OpenRouter key with a free model.

**Why:** The user explicitly requested text-context screening instead of video scanning, retained the free-model requirement, and agreed to proceed after the synopsis-only limitation was explained.

**How to apply:** Distinguish text screening from visual review. Report no textual flags rather than certifying a video as safe. Missing descriptions and movie synopses do not establish what appears in a particular trailer.

## OpenRouter video balance gate
OpenRouter can reject video requests with HTTP 402 requiring at least $1.00 in credit balance even when the selected model has a `:free` route.

**Why:** A capability test was rejected before inference with that explicit provider error.

**How to apply:** Check video-input availability before building or running a large review batch. Zero model token pricing does not establish that video requests work without a balance; provider requirements may change.

## Video modality versus URL support
A model listing video input does not guarantee that any active provider endpoint accepts video URLs, especially YouTube links.

**Why:** A free video-capable model returned HTTP 404, “No endpoints found that support video URLs,” while other free video routes returned the balance gate.

**How to apply:** Test the exact model route with the intended input type before recommending it as usable. Do not treat advertised video modality as verified YouTube access.
