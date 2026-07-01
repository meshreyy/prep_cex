import { createClient, type RedisClientType } from "redis";
import { env } from "../utils/config";
import { dispatchCommand } from "../dispatch";
import { recoverConsumerPel } from "../utils/streamPel";

let brokerClient: RedisClientType | null = null;
let responseClient: RedisClientType | null = null;

export function getResponseClient(): RedisClientType {
    if (!responseClient) {
        throw new Error("Redis response client not connected");
    }
    return responseClient;
}

export async function startRedisConsumer(): Promise<void> {
    brokerClient = createClient({
        url: env.redisUrl,
        socket: {
            tls: false,
            reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
        },
    });

    responseClient = createClient({
        url: env.redisUrl,
        socket: {
            tls: false,
            reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
        },
    });

    await Promise.all([brokerClient.connect(), responseClient.connect()]);
    console.log("[engine] Redis connected");

    try {
        await brokerClient.xGroupCreate(env.incomingQueue, "engine", "$", {
            MKSTREAM: true,
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.includes("BUSYGROUP")) throw error;
        console.log("consumer group already exists");
    }

    const STREAM_KEY = env.incomingQueue;
    const GROUP_NAME = "engine";
    const CONSUMER_NAME = "engine-worker-1";

    await recoverConsumerPel(
        brokerClient,
        STREAM_KEY,
        GROUP_NAME,
        CONSUMER_NAME,
        "engine",
    );

    console.log("[engine] Redis consumer started");

    while (true) {
        try {
            const messages = await brokerClient.xReadGroup(
                GROUP_NAME,
                CONSUMER_NAME,
                [{ key: STREAM_KEY, id: ">" }],
                { BLOCK: 2000 },
            );

            if (!messages) continue;

            for (const stream of messages) {
                for (const message of stream.messages) {
                    try {
                        const { correlationId, type, payload } = message.message;

                        if (!correlationId || !type || !payload) {
                            await brokerClient.xAck(
                                STREAM_KEY,
                                GROUP_NAME,
                                message.id,
                            );
                            continue;
                        }

                        const parsedPayload = JSON.parse(payload);
                        const result = await dispatchCommand(type, parsedPayload);

                        await responseClient.xAdd(env.responseQueue, "*", {
                            correlationId,
                            result: JSON.stringify(result),
                        });

                        await brokerClient.xAck(
                            STREAM_KEY,
                            GROUP_NAME,
                            message.id,
                        );
                    } catch (err) {
                        console.error(
                            `Error processing message ${message.id}:`,
                            err,
                        );
                        try {
                            await brokerClient.xAck(
                                STREAM_KEY,
                                GROUP_NAME,
                                message.id,
                            );
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
}
