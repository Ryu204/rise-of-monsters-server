import { Context, Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { cors } from "hono/cors";
import { StatusCodes } from "http-status-codes";
import { gameRouter } from "./routes/game";
import { authRouter } from "./routes/auth";
import { secureHeaders } from "hono/secure-headers";
import { csrf } from "hono/csrf";
import { jwt, type JwtVariables } from "hono/jwt";
import { AUTH_CONFIG } from "./config";

type AllowedOrigin =
  | { isProd: false; port: number }
  | { isProd: true; url: string };

function requireAccessToken() {
  return jwt({
    secret: AUTH_CONFIG.jwt.secret,
    alg: AUTH_CONFIG.jwt.algo,
    cookie: AUTH_CONFIG.jwt.cookieAccessToken,
    verification: {
      iss: AUTH_CONFIG.jwt.iss,
    },
  });
}

function addMiddlewares(app: Hono, allowedOrigin: AllowedOrigin) {
  const origin = allowedOrigin.isProd
    ? allowedOrigin.url
    : `http://localhost:${allowedOrigin.port}`;

  app.use("*", logger());
  app.use("*", prettyJSON());
  app.use(
    "*",
    cors({
      origin,
      credentials: true,
    }),
  );
  app.use("*", secureHeaders());
  app.use("*", csrf({ origin }));
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
  const api = new Hono<{ Variables: JwtVariables }>();
  api.route("/game", gameRouter);
  api.use("*", requireAccessToken());
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
  app.route("/auth", authRouter);
  app.use("/auth/refresh");
  app.route("/", secondaryRouter());

  return app;
}
