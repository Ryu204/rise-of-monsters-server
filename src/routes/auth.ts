import { Hono } from "hono";
import { InsertedUser, LoggingInUser } from "../models/user";
import { convertZod } from "../utils";
import { AuthService } from "../services/auth";
import { StatusCodes } from "http-status-codes";

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
    AuthService.login,
  );
  if (result.isErr()) return c.json(result.error, result.error.status);
  return c.json(result.value, StatusCodes.OK);
});
