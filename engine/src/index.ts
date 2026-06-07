//connects to redis
//starts listening for commands from backend
//calls hydrateEngine() on startup

import { createClient } from "redis";
import { env } from "./utils/config";
import { hydrateEngine } from "./bootstrap/hydrate";
import { onramp, openPosition, cancelPosition, getEquity, getOpenPosition } from "./handler/perbs.handler.js";
import { recoverConsumerPel } from "./utils/streamPel";



export const brokerClient = createClient({ 
    url: env.redisUrl,
    socket: { tls: true, rejectUnauthorized: false }
});

export const responseClient = createClient({ 
    url: env.redisUrl,
    socket: { tls: true, rejectUnauthorized: false }
});


await Promise.all([brokerClient.connect(), responseClient.connect()]);


//call hydrateEngine to load balances
await hydrateEngine();


//consumer grp 
try {
    await brokerClient.xGroupCreate(

        "stream:commands",
        "engine",
        "$",
        { MKSTREAM: true } //create stream if doesn't exist
    )
}

catch (error: any) {
    if (error.message.includes("BUSYGROUP")) {
        console.log("consumer group already exists");
    }
    else {
        throw error; //re-throw if there is a different error
    }
}

const STREAM_KEY = "stream:commands";
const GROUP_NAME = "engine";
const CONSUMER_NAME = "engine-worker-1";

await recoverConsumerPel(brokerClient, STREAM_KEY, GROUP_NAME, CONSUMER_NAME, "engine");

//send response back to backend via redis
while (true) {
    try {
        const messages = await brokerClient.xReadGroup(
            GROUP_NAME,
            CONSUMER_NAME,
            [{ key: STREAM_KEY, id: ">" }],
            { BLOCK: 2000 }  //waits up to 2 seconds, then return null if no messages
        );
        if (!messages) continue;

        for (const stream of messages) {
            for (const message of stream.messages) {
                try {
                    const { correlationId, type, payload } = message.message;

                    if (!correlationId || !type || !payload) {
                        await brokerClient.xAck(STREAM_KEY, GROUP_NAME, message.id);
                        continue;
                    }

                    const parsedPayload = JSON.parse(payload);
                    let result: unknown;

                    switch (type) {
                        case "USER_BALANCE":
                            result = await onramp(parsedPayload);
                            break;

                        case "CREATE_ORDER":
                            result = await openPosition(parsedPayload);
                            break;

                        case "cancel_position":
                            result = await cancelPosition(parsedPayload);
                            break;

                        case "get_equity":
                            result = await getEquity(parsedPayload);
                            break;

                        case "get_open_positions":
                            result = await getOpenPosition(parsedPayload);
                            break;

                        default:
                            throw new Error(`Unknown command : ${type}`);
                    }

                    await responseClient.xAdd(env.responseQueue, "*", {
                        correlationId,
                        result: JSON.stringify(result),
                    });

                    await brokerClient.xAck(STREAM_KEY, GROUP_NAME, message.id);
                } catch (err) {
                    console.error(`Error processing message ${message.id}:`, err);

                    try {
                        await brokerClient.xAck(STREAM_KEY, GROUP_NAME, message.id);
                    } catch (ackErr) {
                        console.error(`Failed to ack ${message.id}:`, ackErr);
                    }
                }
            }
        }
    } catch (err) {
        console.error("Consumer loop error:", err);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}
