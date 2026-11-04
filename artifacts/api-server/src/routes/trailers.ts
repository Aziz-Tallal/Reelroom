import { Router, type IRouter } from "express";
import { ListTrailerReviewsResponse, ReviewTrailerBatchResponse } from "@workspace/api-zod";
import { getTrailerCatalog, reviewNextTrailerBatch, ScreeningError } from "../lib/trailer-screening";

const router: IRouter = Router();
router.get("/trailers", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  try { res.json(ListTrailerReviewsResponse.parse(await getTrailerCatalog())); }
  catch (error) {
    req.log.warn({ message: error instanceof Error ? error.message : "Catalog unavailable" }, "Trailer catalog request failed");
    res.status(error instanceof ScreeningError ? error.status : 503).json({ error: error instanceof ScreeningError ? error.message : "Trailer review storage or catalog is unavailable." });
  }
});
router.post("/trailers/review", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const origin = req.get("origin");
  const host = req.get("x-forwarded-host") ?? req.get("host");
  if (origin) {
    let sameHost = false;
    try { sameHost = new URL(origin).host === host; } catch { /* Invalid origins are rejected. */ }
    if (!sameHost) { res.status(403).json({ error: "Cross-origin review requests are not allowed." }); return; }
  }
  try { res.json(ReviewTrailerBatchResponse.parse(await reviewNextTrailerBatch())); }
  catch (error) {
    req.log.warn({ message: error instanceof ScreeningError ? error.message : "Review unavailable" }, "Trailer text review failed");
    const status = error instanceof ScreeningError ? error.status : 502;
    if (status === 429) res.setHeader("Retry-After", "30");
    res.status(status).json({ error: error instanceof ScreeningError ? error.message : "Text review failed. No new trailers were enabled." });
  }
});
export default router;
