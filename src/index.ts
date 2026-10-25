import { serve, type Server } from "bun";
import { IS_PROD } from "./config";
import { createApp } from "./app";

function cleanup<T>(server: Server<T>) {
  console.log("Shutting down...");
  try {
    server.stop(true);
    console.log("All good, bye.");
    process.exit(0);
  } catch (e) {
    console.error(`Uh oh:\n${e}`);
    process.exit(1);
  }
}

function main() {
  const host = process.env.SERVE_HOST as string;
  const port = Number(process.env.SERVE_PORT);
  const app = createApp({ isProd: IS_PROD, host, port });
  const server = serve({
    fetch: app.fetch,
    port,
  });
  console.log(`Serving at ${host}:${port}`);
  console.log(`Build configuration: ${IS_PROD ? "production" : "development"}`);
  process.on("SIGTERM", () => cleanup(server));
  process.on("SIGINT", () => cleanup(server));
}

try {
  main();
} catch (e) {
  console.error(`Uncaught exception: ${e}`);
}
