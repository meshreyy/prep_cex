//import ioredis
//create redis client using redisUrl from config
//export it so other files can use it 

import {createClient} from "redis";
import { env } from "./config";

export const redisClient = createClient({url : env.redisUrl});

redisClient.on("error", (err) => console.log("Redis Error", err));

export async function connectRedis() {
    await redisClient.connect();
    console.log("Redis connected");
}