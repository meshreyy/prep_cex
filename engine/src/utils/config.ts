//defines the shape of env variable
import { response } from "express";
import {z} from "zod";
const envSchema = z.object({
    redisUrl : z.string(),
    incomingQueue : z.string(),
    responseQueue : z.string(),
    eventsQueue : z.string(),
});

const rawEnv = {
    redisUrl: process.env.REDIS_URL ?? "",
    incomingQueue: process.env.INCOMING_QUEUE ?? "",
    responseQueue: process.env.RESPONSE_QUEUE ?? "",
    eventsQueue: process.env.EVENTS_QUEUE ?? "",
};

export const env = envSchema.parse(rawEnv);