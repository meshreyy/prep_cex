import { env } from "./config.js";
import { getResponseClient } from "../transport/redis";

export async function emitEvent(
    type: string,
    payload: Record<string, unknown>,
): Promise<void> {
    if (env.transport === "http") return;

    const responseClient = getResponseClient();
    await responseClient.xAdd(env.eventsQueue, "*", {
        type,
        payload: JSON.stringify(payload),
        createdAt: String(Date.now()),
    });
}
