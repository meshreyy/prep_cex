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
  res.json({ ok: true, engineTransport: env.engineTransport });
});

app.use("/api/auth", router);
app.use("/api/perps", perpsRouter);

const STREAM_KEY = env.responseQueue;
const GROUP_NAME = "backend";
const CONSUMER_NAME = "backend-worker-1";

async function startResponseConsumer(): Promise<void> {
  try {
    await redisClient.xGroupCreate(STREAM_KEY, GROUP_NAME, "$", {
      MKSTREAM: true,
    });
    console.log("Consumer group created");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("BUSYGROUP")) {
      console.log("consumer group already exists");
    } else {
      throw error;
    }
  }

  console.log("Response consumer started");

  while (true) {
    try {
      const messages = await redisClient.xReadGroup(
        GROUP_NAME,
        CONSUMER_NAME,
        [{ key: env.responseQueue, id: ">" }],
        { BLOCK: 2000 },
      );

      if (!messages) continue;

      for (const stream of messages) {
        for (const msg of stream.messages) {
          try {
            const correlationId = msg.message.correlationId;
            const resultStr = msg.message.result;

            if (!correlationId || !resultStr) {
              await redisClient.xAck(env.responseQueue, GROUP_NAME, msg.id);
              continue;
            }

            const result = JSON.parse(resultStr);
            const pending = pendingResponses.get(correlationId);

            if (pending) {
              pending.resolve(result);
              pendingResponses.delete(correlationId);
            }

            await redisClient.xAck(env.responseQueue, GROUP_NAME, msg.id);
          } catch (err) {
            console.error(`Error processing message ${msg.id}:`, err);
            try {
              await redisClient.xAck(env.responseQueue, GROUP_NAME, msg.id);
            } catch (ackErr) {
              console.error(`Failed to ack ${msg.id}:`, ackErr);
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

async function main() {
  if (env.engineTransport === "redis") {
    await connectRedis();
  } else {
    console.log(`Engine transport: HTTP → ${env.engineHttpUrl}`);
  }

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(env.port, () => {
      console.log(`Backend running on the port ${env.port}`);
      resolve();
    });
    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        reject(
          new Error(
            `Port ${env.port} is already in use. Stop the other backend (Ctrl+C) and try again.`,
          ),
        );
        return;
      }
      reject(err);
    });
  });

  if (env.engineTransport === "redis") {
    await startResponseConsumer();
  }
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
