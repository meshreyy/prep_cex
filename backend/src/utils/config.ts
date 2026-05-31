//defines the shape of env variable
import {z} from "zod";
const envSchema = z.object({
    databaseUrl : z.string(),
    redisUrl : z.string(),
    jwtSecret : z.string(),
    incomingQueue : z.string(),
    responseQueue : z.string(),
    port : z.number()
    
});

const rawEnv = {
    databaseUrl : process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL ?? "",
    jwtSecret: process.env.JWT_SECRET ?? "",
    incomingQueue: process.env.INCOMING_QUEUE ?? "",
    responseQueue: process.env.RESPONSE_QUEUE ?? "",
    port : Number(process.env.PORT) || 3000
};

export const env = envSchema.parse(rawEnv);