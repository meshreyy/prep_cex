// main express server

//create express app
//connect to redis
//connect to postgres
//register routes(/auth, /perps)
//start listening on port

import express from "express";
import "dotenv/config";
import {env} from "./utils/config";
import router from "./route/auth.route";
import { connectRedis } from "./utils/redis";


const app = express();
app.use(express.json());

app.use("/api/auth", router);


async function main() {
    await connectRedis();

    app.listen(env.port, () => {
    console.log(`Backend running on the port ${env.port}`);
})
}

main();


//backend needs :
//auth routes : /signup, /signin (hit Postgres directly)
//preps routes : /order, /ramp (forward to engine via redis)

