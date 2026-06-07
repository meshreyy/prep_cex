//sends commands to engine and waits for responses
//BACKEND TALKS TO ENGINE 

//fn. - sendToEngine
//creates a correlationId
//sends command to stream:commands via XADD
//wait for response from stream:responses


import { redisClient } from "./redis";
import { env } from "./config";
import { pendingResponses } from "../store/pending_response";


export async function sendToEngine(type : string, payload : Record<string,unknown>) {

    const correlationId = crypto.randomUUID();

    //send to engine: 
    await redisClient.xAdd(env.incomingQueue, "*", {
        correlationId,
        type,
        payload : JSON.stringify(payload)
    });

    
    //wait for response
    //creating a promise that resolves when the engine responds

    return new Promise((resolve,reject) => {
        pendingResponses.set(correlationId, {resolve, reject});

        //timeout if engine doesn't respond
        setTimeout(() => {
            pendingResponses.delete(correlationId);
            reject(new Error("Engine timeout"));
        }, 5000);
    });

    
    

    

}

