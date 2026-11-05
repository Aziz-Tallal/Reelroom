import { Router, type IRouter } from "express";
import {
  CreateMovieNightPlanBody,
  CreateMovieNightPlanResponse,
} from "@workspace/api-zod";
import { createMovieNightPlan } from "../lib/movie-night";

const router: IRouter = Router();

router.post("/movie-night/plan", async (req, res) => {
  const parsedRequest = CreateMovieNightPlanBody.safeParse(req.body);
  if (!parsedRequest.success) {
    res.status(400).json({
      error: "Please check your movie-night preferences and try again.",
    });
    return;
  }

  try {
    const plan = await createMovieNightPlan(parsedRequest.data);
    res.json(CreateMovieNightPlanResponse.parse(plan));
  } catch (error) {
    req.log.error({ err: error }, "Movie night curation failed");
    res.status(503).json({
      error: "Our curator is temporarily unavailable. Please try again.",
    });
  }
});

export default router;
