import { Hono } from "hono";
import { InsertedUser, LoggingInUser, ResponsedUser } from "../models/user";
import { convertZod } from "../utils";
import { AuthService } from "../services/auth";
import { StatusCodes } from "http-status-codes";
import { setCookie } from "hono/cookie";
import { AUTH_CONFIG } from "../config";

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
  const result = await convertZod(LoggingInUser.safeParse(body)).asyncAndThen(
    (user) => AuthService.login(user, c),
  );
  if (result.isErr()) return c.json(result.error, result.error.status);

  setCookie(
    c,
    AUTH_CONFIG.jwt.cookieAccessToken,
    result.value.jwt.accessToken,
    {
      httpOnly: true,
      secure: true,
      maxAge: AUTH_CONFIG.jwt.accessTtl,
      sameSite: "Lax",
      path: "/",
    },
  );

  setCookie(
    c,
    AUTH_CONFIG.jwt.cookieRefreshToken,
    result.value.jwt.refreshToken,
    {
      httpOnly: true,
      secure: true,
      maxAge: AUTH_CONFIG.jwt.refreshTtl,
      sameSite: "Lax",
      path: "/auth",
    },
  );

  const responseBody = ResponsedUser.parse(result.value);
  return c.json(responseBody, StatusCodes.OK);
});
