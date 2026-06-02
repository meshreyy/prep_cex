// main express server

//create express app
//connect to redis
//connect to postgres
//register routes(/auth, /perps)
//start listening on port

import express from "express";
import "dotenv/config";
import { env } from "./utils/config";
import router from "./route/auth.route";
import perpsRouter from "./route/perps.route";
import { connectRedis, redisClient } from "./utils/redis";
import { pendingResponses } from "./store/pending_response";


const app = express();
app.use(express.json());

app.use("/api/auth", router);
app.use("/api/perps", perpsRouter);



async function main() {
    await connectRedis();

    app.listen(env.port, () => {
        console.log(`Backend running on the port ${env.port}`);
    })

    //CREATE CONSUMER GROUP
    try {
        await redisClient.xGroupCreate(
            "stream:responses",
            "backend",
            "$",
            {MKSTREAM : true}
        )

    } catch (error: any) {
    if (error.message.includes("BUSYGROUP")) {
        console.log("consumer group already exists");
    }
    else {
        throw error; //re-throw if there is a different error
    }

}

    while (true) {
    const messages = await redisClient.xReadGroup(
        "backend",  //consumer grp
        "backend-worker-1", //consumer name
        [{ key: env.responseQueue, id: ">" }], // only read new msgs
        { BLOCK: 2000 }
        //waits for 2 sec for new messages

        


    );
    if (!messages) continue;
    //means : no messages right now, loop again and check later

    for (const stream of messages) {
        for (const msg of stream.messages) {
            //extract fields from msg
            const correlationId = msg.message.correlationId;
            const resultStr = msg.message.result;

            if (!correlationId || !resultStr) continue;
            const result = JSON.parse(resultStr);

            const pending = pendingResponses.get(correlationId);
            if (!pending) continue;
            pending.resolve(result);
            pendingResponses.delete(correlationId);
        }

    }




}
}

main();

//background listener : runs forever in bkg, checking for engine's response





//backend needs :
//auth routes : /signup, /signin (hit Postgres directly)
//preps routes : /order, /ramp (forward to engine via redis)

