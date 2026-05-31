//auth routes :
//1. import the express router
//2. import your controller functions
//3. define the routes

import { Router } from "express";
import { signin, signup } from "../controller/auth.controller";




const router = Router();


router.post("/signin", signin);
router.post("/signup", signup);


export default router;

