import { serve, type Server } from "bun";
import { Context, Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { cors } from "hono/cors";
import { StatusCodes } from "http-status-codes";
import { gameRouter } from "./routes/game";
import { IS_PROD } from "./config";
import { authRouter } from "./routes/auth";

type AllowedOrigin =
  | { isProd: false; port: number }
  | { isProd: true; url: string };

function addMiddlewares(app: Hono, allowedOrigin: AllowedOrigin) {
  app.use("*", logger());
  app.use("*", prettyJSON());
  app.use(
    "*",
    cors({
      origin: allowedOrigin.isProd
        ? allowedOrigin.url
        : `http://localhost:${allowedOrigin.port}`,
      credentials: true,
    }),
  );
}

function onAppError(err: Error, c: Context, isProd: boolean) {
  console.error(`Unhandled Error: ${err.message}`);
  return c.json(
    {
      success: false,
      error: {
        message: err.message && !isProd ? err.message : "Internal Server Error",
        name: !isProd ? err.name : "Internal Server Error",
      },
    },
    StatusCodes.INTERNAL_SERVER_ERROR,
  );
}

function onNotFound(c: Context) {
  return c.json(
    {
      success: false,
      error: {
        message: `Not found`,
        status: StatusCodes.NOT_FOUND,
      },
    },
    StatusCodes.NOT_FOUND,
  );
}

function apiRouter() {
  const api = new Hono();
  api.route("/games", gameRouter);
  api.route("/auth", authRouter);
  return api;
}

function secondaryRouter() {
  const router = new Hono();
  router.get("/", (c) => c.text("Hello, try other APIs!"));
  return router;
}

type AppConfig = {
  isProd: boolean;
  host: string;
  port: number;
};

function createApp({ isProd, host, port }: AppConfig) {
  const app = new Hono();
  addMiddlewares(
    app,
    isProd ? { isProd, url: `https://${host}:${port}` } : { isProd, port },
  );
  app.onError((...args) => onAppError(...args, isProd));
  app.notFound(onNotFound);
  app.route("/api/v1", apiRouter());
  app.route("/", secondaryRouter());

  return app;
}

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
