import { Hono } from "hono";
import {
  InsertedUser,
  JwtSchema,
  LoggingInUser,
  ResponsedUser,
} from "../models/user";
import { convertZod } from "../utils";
import { AuthService } from "../services/auth";
import { StatusCodes } from "http-status-codes";
import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { AUTH_CONFIG } from "../config";
import { err, ok, ResultAsync } from "neverthrow";
import { InternalError, RefreshTokenInvalidError } from "../error";
import type { ReadonlyDeep } from "type-fest";
import type { Context, Env, Input } from "hono";

export const authRouter = new Hono();

authRouter.post("/signup", async (c) => {
  const body = await c.req.json();
  const result = await convertZod(InsertedUser.safeParse(body)).asyncAndThen(
    AuthService.signup,
  );
  if (result.isErr()) return c.json(result.error, result.error.status);
  return c.json(result.value, StatusCodes.CREATED);
});

authRouter.post("/login", async (c) => {
  const body = await c.req.json();
  const result = await convertZod(LoggingInUser.safeParse(body))
    .asyncAndThen(AuthService.login)
    .andThrough(({ jwt }) => setSignedJwtCookies(c, jwt));

  if (result.isErr()) return c.json(result.error, result.error.status);
  const responseBody = ResponsedUser.parse(result.value);
  return c.json(responseBody, StatusCodes.OK);
});

authRouter.post("/refresh", async (c) => {
  const newTokenPair = await ResultAsync.fromPromise(
    getSignedCookie(
      c,
      AUTH_CONFIG.jwt.secret.refreshTokenCookie,
      AUTH_CONFIG.jwt.cookieRefreshToken,
    ),
    InternalError,
  )
    .andThen((token) =>
      typeof token == "string" ? ok(token) : err(RefreshTokenInvalidError),
    )
    .andThen(AuthService.refreshAccessToken)
    .andThen((jwt) => setSignedJwtCookies(c, jwt));
  if (newTokenPair.isErr())
    return c.json(newTokenPair.error, newTokenPair.error.status);
  return c.body(null, StatusCodes.OK);
});

function setSignedJwtCookies<T extends Context<Env, string, Input>>(
  c: T,
  tokens: ReadonlyDeep<JwtSchema>,
): ResultAsync<void, InternalError> {
  return ResultAsync.fromPromise(
    Promise.all([
      setSignedCookie(
        c,
        AUTH_CONFIG.jwt.cookieAccessToken,
        tokens.accessToken,
        AUTH_CONFIG.jwt.secret.accessTokenCookie,
        {
          httpOnly: true,
          secure: true,
          maxAge: AUTH_CONFIG.jwt.accessTtl,
          sameSite: "Lax",
          path: "/api",
        },
      ),

      setSignedCookie(
        c,
        AUTH_CONFIG.jwt.cookieRefreshToken,
        tokens.refreshToken,
        AUTH_CONFIG.jwt.secret.refreshTokenCookie,
        {
          httpOnly: true,
          secure: true,
          maxAge: AUTH_CONFIG.jwt.refreshTtl.each,
          sameSite: "Lax",
          path: "/auth",
        },
      ),
    ]),
    InternalError,
  ).map(() => {});
}
