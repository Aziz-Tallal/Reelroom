import { Router, type IRouter } from "express";
import healthRouter from "./health";
import movieNightRouter from "./movie-night";

const router: IRouter = Router();

router.use(healthRouter);
router.use(movieNightRouter);

export default router;
