import { z } from "zod";

const simulationSchema = z.object({
    enabled: z.boolean(),
    intervalMs: z.number().positive(),
    markets: z.array(z.string()).min(1),
    tickSize: z.number().positive(),
    levels: z.number().int().positive(),
    qtyMin: z.number().positive(),
    qtyMax: z.number().positive(),
    ordersPerLevel: z.number().int().positive(),
    takerProbability: z.number().min(0).max(1),
    noiseProbability: z.number().min(0).max(1),
});

export type SimulationConfig = z.infer<typeof simulationSchema>;

const envSchema = z.object({
    transport: z.enum(["redis", "http"]),
    httpPort: z.number().int().positive(),
    redisUrl: z.string().optional(),
    incomingQueue: z.string(),
    responseQueue: z.string(),
    eventsQueue: z.string(),
    simulation: simulationSchema,
});

function parseBool(value: string | undefined, fallback: boolean): boolean {
    if (!value?.trim()) return fallback;
    return value === "1" || value.toLowerCase() === "true";
}

function parseSimulation(): SimulationConfig {
    const markets =
        process.env.SIMULATION_MARKETS?.split(",")
            .map((s) => s.trim())
            .filter(Boolean) ?? ["BTC-PERP", "ETH-PERP"];

    const qtyMin = Number(process.env.SIMULATION_QTY_MIN) || 0.005;
    const qtyMax = Number(process.env.SIMULATION_QTY_MAX) || 0.05;

    return simulationSchema.parse({
        enabled: parseBool(process.env.SIMULATION_ENABLED, true),
        intervalMs: Number(process.env.SIMULATION_INTERVAL_MS) || 2000,
        markets,
        tickSize: Number(process.env.SIMULATION_TICK_SIZE) || 10,
        levels: Number(process.env.SIMULATION_LEVELS) || 20,
        qtyMin,
        qtyMax: Math.max(qtyMax, qtyMin),
        ordersPerLevel: Number(process.env.SIMULATION_ORDERS_PER_LEVEL) || 2,
        takerProbability: Number(process.env.SIMULATION_TAKER_PROB) || 0.55,
        noiseProbability: Number(process.env.SIMULATION_NOISE_PROB) || 0.15,
    });
}

export const env = envSchema.parse({
    transport:
        process.env.ENGINE_TRANSPORT === "redis" ? "redis" : "http",
    httpPort: Number(process.env.ENGINE_HTTP_PORT) || 3001,
    redisUrl: process.env.REDIS_URL || undefined,
    incomingQueue: process.env.INCOMING_QUEUE ?? "stream:commands",
    responseQueue: process.env.RESPONSE_QUEUE ?? "stream:responses",
    eventsQueue: process.env.EVENTS_QUEUE ?? "stream:events",
    simulation: parseSimulation(),
});
