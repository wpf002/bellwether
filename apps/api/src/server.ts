import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAuth } from "./auth.js";
import { healthRoutes } from "./routes/health.js";
import { industryRoutes } from "./routes/industries.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { qualityRoutes } from "./routes/quality.js";
import { accountRoutes } from "./routes/accounts.js";
import { moduleRoutes } from "./routes/modules.js";

export async function buildServer() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });

  await app.register(cors, { origin: true });
  registerAuth(app); // global onRequest: key auth + per-plan rate limiting

  await app.register(healthRoutes);
  await app.register(industryRoutes);
  await app.register(dashboardRoutes);
  await app.register(qualityRoutes);
  await app.register(accountRoutes);
  await app.register(moduleRoutes);

  return app;
}
