import { buildServer } from "./server.js";

// Railway (and most PaaS) inject PORT; fall back to API_PORT, then 4000.
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

const app = await buildServer();
app
  .listen({ port, host })
  .then(() => app.log.info(`Bellwether API on http://${host}:${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
