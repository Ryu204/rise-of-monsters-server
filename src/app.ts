import { type Server } from "bun";
import { Context, Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { cors } from "hono/cors";
import { StatusCodes } from "http-status-codes";
import { gameRouter } from "./routes/game";
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

export function createApp({ isProd, host, port }: AppConfig) {
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
