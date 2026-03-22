import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import exercisesRouter from "./exercises";
import worklogsRouter from "./worklogs";
import plansRouter from "./plans";
import ragRouter from "./rag";
import { requireAuth } from "../middleware/require-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/exercises", requireAuth, exercisesRouter);
router.use("/worklogs", requireAuth, worklogsRouter);
router.use("/plans", requireAuth, plansRouter);
router.use("/rag", requireAuth, ragRouter);

export default router;
