import { Hono } from "hono";
import { GameService } from "../services/game";
import { StatusCodes } from "http-status-codes";

export const gameRouter = new Hono();

gameRouter.get("/", async (c) => {
  const games = await GameService.getAllActiveGames(0, 0);
  if (games.isErr()) return c.json(games.error, games.error.status);
  return c.json(games.value, StatusCodes.OK);
});
