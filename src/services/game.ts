import type { Game } from "../models/game";

export namespace GameService {
  export async function getAllActiveGames(): Promise<Game[]> {
    return [
      { id: 0, name: "Nice game" },
      { id: 24, name: "Bad game" },
    ];
  }
}
