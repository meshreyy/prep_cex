//import ioredis
//create redis client using redisUrl from config
//export it so other files can use it 

import { createClient } from "redis";
import { env } from "./config";

export const redisClient = createClient({
    url: env.redisUrl,
    socket: {
        tls: false,
        reconnectStrategy: (retries) => Math.min(retries * 50, 2000)
    }
});

redisClient.on("error", (err) => console.log("Redis Error", err));

export async function connectRedis() {
    try {
        await redisClient.connect();
        await redisClient.ping();
        console.log("Redis connected");
        console.log("Connecting to:", env.redisUrl);
    } catch (err) {
        console.error("\nRedis connection failed.");
        console.error("Start local Redis first:");
        console.error("  1. Open Docker Desktop");
        console.error("  2. From repo root: docker compose up -d redis");
        console.error("Or set REDIS_URL in backend/.env to a reachable Redis instance.\n");
        throw err;
    }
}

