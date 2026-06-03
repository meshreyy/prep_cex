import { z } from "zod";

const envSchema = z.object({
  databaseUrl: z.string(),
  redisUrl: z.string(),
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

const rawEnv = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  incomingQueue: process.env.INCOMING_QUEUE ?? "",
  responseQueue: process.env.RESPONSE_QUEUE ?? "",
  port: Number(process.env.PORT) || 3000,
  corsOrigins: parseCorsOrigins(),
};

export const env = envSchema.parse(rawEnv);
