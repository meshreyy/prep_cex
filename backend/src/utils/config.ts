import { z } from "zod";

const envSchema = z.object({
  databaseUrl: z.string(),
  engineTransport: z.enum(["redis", "http"]),
  engineHttpUrl: z.string().url(),
  redisUrl: z.string().optional(),
  jwtSecret: z.string(),
  incomingQueue: z.string(),
  responseQueue: z.string(),
  port: z.number(),
  corsOrigins: z.array(z.string()),
});

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === "*") {
    return ["http://localhost:5173", "http://127.0.0.1:5173"];
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

const engineTransport =
  process.env.ENGINE_TRANSPORT === "redis" ? "redis" : "http";

const rawEnv = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  engineTransport,
  engineHttpUrl: process.env.ENGINE_HTTP_URL ?? "http://localhost:3001",
  redisUrl: process.env.REDIS_URL || undefined,
  jwtSecret: process.env.JWT_SECRET ?? "",
  incomingQueue: process.env.INCOMING_QUEUE ?? "stream:commands",
  responseQueue: process.env.RESPONSE_QUEUE ?? "stream:responses",
  port: Number(process.env.PORT) || 3000,
  corsOrigins: parseCorsOrigins(),
};

export const env = envSchema.parse(rawEnv);
