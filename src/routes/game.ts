import { Hono } from "hono";
import { GameService } from "../services/game";

export const gameRouter = new Hono();

gameRouter.get("/", async (c) => {
  const games = await GameService.getAllActiveGames();
  return c.json(games);
});
