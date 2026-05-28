//connects to redis
//starts listening for commands from backend
//calls hydrateEngine() on startup

import {createClient} from "redis";
import { env } from "./utils/config";
import { hydrateEngine } from "./bootstrap/hydrate";
import {onramp, openPosition, cancelPosition, getEquity, getOpenPosition} from "./handler/perbs.handler.js";



const brokerClient = createClient({url : env.redisUrl});
//listens for commands from backend(XREADGROUP)
const responseClient = createClient({url : env.redisUrl});
//sends responses back to backend and emits events to DB pollar(XADD)


await Promise.all([brokerClient.connect(), responseClient.connect()]);


//call hydrateEngine to load balances
await hydrateEngine();


//consumer grp 
try {
    await brokerClient.xGroupCreate(
    
    "stream:commands",
    "engine",
    "$",
    {MKSTREAM : true} //create stream if doesn't exist
    ) 
}
catch (error: any) {
    if(error.message.includes("BUSYGROUP")) {
        console.log("consumer group already exists");
    }
    else {
        throw error; //re-throw if there is a different error
    }
}

//send response back to backend via redis
while(true) {
    const messages = await brokerClient.xReadGroup(
        "engine",
        "engine-worker-1",
        [{key : "stream:commands", id: ">"}],
        {BLOCK : 2000}  //waits up to 2 seconds, then return null if no messages
    );
    //process messages
    if(!messages) continue;

    for(const stream of messages) {
        for(const message of stream.messages) {
            const {correlationId, type, payload} = message.message;
            //parse payload JSON, handle command, send response
            if(!correlationId || type || !payload) continue;
            const parsedPayload = JSON.parse(payload);

            let result : unknown;

            switch(type) {
                case "onramp" :
                    //call onramp handler
                    result = await onramp(parsedPayload);

                    break;
                case "open_position" :
                    //call openPosititon handler
                    result = await openPosition(parsedPayload);
                    break;
                case "cancel_position" :
                    //user cancellling an order
                    result = await cancelPosition(parsedPayload);
                    break;

                case "get_equity" :
                    //user checking their balance
                    result = getEquity(parsedPayload);
                    break;

                case "get_open_positions" :
                    //user viewing their open positions
                    result = getOpenPosition(parsedPayload);
                    break;

                default :
                throw new Error(`Unknown command : ${type}`);

            }
            
        }
    }
}
