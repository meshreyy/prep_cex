// main express server

import express from "express";
import "dotenv/config";

import { env } from "./utils/config";
import router from "./route/auth.route";
import perpsRouter from "./route/perps.route";
import { connectRedis, redisClient } from "./utils/redis";
import { pendingResponses } from "./store/pending_response";
import { corsMiddleware } from "./middleware/cors";


const app = express();

app.use(corsMiddleware);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", router);
app.use("/api/perps", perpsRouter);

const STREAM_KEY = env.responseQueue;
const GROUP_NAME = "backend";
const CONSUMER_NAME = "backend-worker-1";

async function main() {
  await connectRedis();


    

    app.listen(env.port, () => {
        console.log(`Backend running on the port ${env.port}`);
    });


  // Create consumer group
  try {
    await redisClient.xGroupCreate(
      STREAM_KEY,
      GROUP_NAME,
      "$",
      { MKSTREAM: true }
    );

    console.log("Consumer group created");
  } catch (error: any) {
    if (error.message.includes("BUSYGROUP")) {
      console.log("consumer group already exists");
    } else {
      throw error;
    }
  }

 
  console.log("Response consumer started");

while (true) {
  try {
    const messages = await redisClient.xReadGroup(
      "backend",
      "backend-worker-1",
      [{ key: env.responseQueue, id: ">" }],
      { BLOCK: 2000 }
    );

    if (!messages) continue;

    for (const stream of messages) {
      for (const msg of stream.messages) {
        try {
          const correlationId = msg.message.correlationId;
          const resultStr = msg.message.result;

          if (!correlationId || !resultStr) {
            await redisClient.xAck(
              env.responseQueue,
              "backend",
              msg.id
            );
            continue;
          }

          const result = JSON.parse(resultStr);

          const pending = pendingResponses.get(correlationId);

          if (pending) {
            pending.resolve(result);
            pendingResponses.delete(correlationId);
          }

          // IMPORTANT: remove from PEL
          await redisClient.xAck(
            env.responseQueue,
            "backend",
            msg.id
          );

          // Optional: remove from stream completely
          // await redisClient.xDel(
          //   env.responseQueue,
          //   msg.id
          // );

        } catch (err) {
          console.error(
            `Error processing message ${msg.id}:`,
            err
          );

          // Prevent PEL from filling up
          try {
            await redisClient.xAck(
              env.responseQueue,
              "backend",
              msg.id
            );
          } catch (ackErr) {
            console.error(
              `Failed to ack ${msg.id}:`,
              ackErr
            );
          }
        }
      }
    }
  } catch (err) {
    console.error("Consumer loop error:", err);

    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );
  }
}
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});