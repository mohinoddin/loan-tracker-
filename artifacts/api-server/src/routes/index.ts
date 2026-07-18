import { Router, type IRouter } from "express";
import healthRouter from "./health";
import loansRouter from "./loans";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(loansRouter);
router.use(paymentsRouter);

export default router;
