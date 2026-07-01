//auth routes :
//1. import the express router
//2. import your controller functions
//3. define the routes

import { Router } from "express";
import { signin, signup, guest } from "../controller/auth.controller";




const router = Router();


router.post("/signin", signin);
router.post("/signup", signup);
router.post("/guest", guest);


export default router;

