import { Router, type IRouter } from "express";
import healthRouter from "./health";
import movieNightRouter from "./movie-night";
import stripeCheckoutRouter from "./stripe-checkout";

const router: IRouter = Router();

router.use(healthRouter);
router.use(movieNightRouter);
router.use(stripeCheckoutRouter);

export default router;
