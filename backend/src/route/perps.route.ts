


import { Router } from "express";
import { onramp, order } from "../controller/perps.controller";



const perpsRouter = Router();

perpsRouter.post("/order", order);
perpsRouter.post("/onramp", onramp);



export default perpsRouter;