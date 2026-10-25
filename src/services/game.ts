import { errAsync, type ResultAsync } from "neverthrow";
import type { InsertedGame, ResponsedGame } from "../models/game";
import { UnauthorizedError, type GetGameError } from "../error";

export namespace GameService {
  export function getAllActiveGames(
    offset: number,
    count: number,
  ): ResultAsync<ResponsedGame[], GetGameError> {
    return errAsync(UnauthorizedError);
  }
}
