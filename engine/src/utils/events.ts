//this emits events to redis for the db pollar

import { responseClient } from "../index.js";
import { env } from "./config.js";

export async function emitEvent(
    type : string,
    payload : Record<string, unknown>
): Promise <void> {
    await responseClient.xAdd(
        env.eventsQueue,
        "*",
        {
            type,
            payload : JSON.stringify(payload),
            createdAt : String(Date.now());
        }
    );
}