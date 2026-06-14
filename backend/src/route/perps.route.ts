import { Router } from "express";
import {
  cancelOrder,
  getBalance,
  getDepth,
  getTrades,
  getPositions,
  onramp,
  order,
} from "../controller/perps.controller";

const perpsRouter = Router();

perpsRouter.get("/depth", getDepth);
perpsRouter.get("/trades", getTrades);
perpsRouter.get("/balance", getBalance);
perpsRouter.get("/positions", getPositions);
perpsRouter.post("/order", order);
perpsRouter.post("/onramp", onramp);
perpsRouter.post("/cancel", cancelOrder);

export default perpsRouter;

