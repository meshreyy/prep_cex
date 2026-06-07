import { Router } from "express";
import {
  cancelOrder,
  getBalance,
  getPositions,
  onramp,
  order,
} from "../controller/perps.controller";

const perpsRouter = Router();

perpsRouter.get("/balance", getBalance);
perpsRouter.get("/positions", getPositions);
perpsRouter.post("/order", order);
perpsRouter.post("/onramp", onramp);
perpsRouter.post("/cancel", cancelOrder);

export default perpsRouter;

