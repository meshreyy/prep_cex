import { env } from "./utils/config";
import { hydrateEngine } from "./bootstrap/hydrate";
import { initMarkets } from "./bootstrap/markets";
import { startSimulation } from "./workers/simulation-worker.js";
import { startHttpServer } from "./transport/http";
import { startRedisConsumer } from "./transport/redis";

await hydrateEngine();

initMarkets(env.simulation.markets);
startSimulation(env.simulation);

if (env.transport === "http") {
    startHttpServer(env.httpPort);
} else {
    await startRedisConsumer();
}
