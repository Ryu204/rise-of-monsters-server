import type { GameData } from "../models/game";

export namespace GameService {
  export async function getAllActiveGames(): Promise<GameData[]> {
    return [
      { id: 0, name: "Nice game" },
      { id: 24, name: "Bad game" },
    ];
  }
}
