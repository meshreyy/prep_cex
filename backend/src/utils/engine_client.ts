import { env } from "./config";
import { pendingResponses } from "../store/pending_response";
import { redisClient } from "./redis";

async function sendViaHttp(
    type: string,
    payload: Record<string, unknown>,
): Promise<unknown> {
    const res = await fetch(`${env.engineHttpUrl}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        const message =
            data && typeof data === "object" && "error" in data
                ? String((data as { error: string }).error)
                : `Engine HTTP ${res.status}`;
        throw new Error(message);
    }

    return data;
}

async function sendViaRedis(
    type: string,
    payload: Record<string, unknown>,
): Promise<unknown> {
    const correlationId = crypto.randomUUID();

    await redisClient.xAdd(env.incomingQueue, "*", {
        correlationId,
        type,
        payload: JSON.stringify(payload),
    });

    return new Promise((resolve, reject) => {
        pendingResponses.set(correlationId, { resolve, reject });

        setTimeout(() => {
            pendingResponses.delete(correlationId);
            reject(new Error("Engine timeout"));
        }, 5000);
    });
}

export async function sendToEngine(
    type: string,
    payload: Record<string, unknown>,
) {
    if (env.engineTransport === "http") {
        return sendViaHttp(type, payload);
    }
    return sendViaRedis(type, payload);
}
