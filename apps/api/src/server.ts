import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health.js";
import { industryRoutes } from "./routes/industries.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { qualityRoutes } from "./routes/quality.js";

export async function buildServer() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });

  await app.register(cors, { origin: true });
  await app.register(healthRoutes);
  await app.register(industryRoutes);
  await app.register(dashboardRoutes);
  await app.register(qualityRoutes);

  return app;
}
