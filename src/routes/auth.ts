import { Hono } from "hono";
import { InsertedUser } from "../models/user";
import { convertZod } from "../utils";
import { AuthService } from "../services/auth";
import { StatusCodes } from "http-status-codes";

export const authRouter = new Hono();

authRouter.post("/signup", async (c) => {
  const body = await c.req.json();
  const result = await convertZod(InsertedUser.safeParse(body)).asyncAndThen(
    AuthService.signup,
  );
  if (result.isErr()) return c.json(result.error, StatusCodes.BAD_REQUEST);
  return c.json(result.value, StatusCodes.OK);
});
