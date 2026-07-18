import { Router, type IRouter } from "express";
import healthRouter from "./health";
import loansRouter from "./loans";
import paymentsRouter from "./payments";
import refineNoteRouter from "./refine-note";

const router: IRouter = Router();

router.use(healthRouter);
router.use(loansRouter);
router.use(paymentsRouter);
router.use(refineNoteRouter);

export default router;
