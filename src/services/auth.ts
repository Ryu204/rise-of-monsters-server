import { err, ok, ResultAsync } from "neverthrow";
import { eq } from "drizzle-orm";
import type { ReadonlyDeep } from "type-fest";
import { SelectedUser, userTable, type InsertedUser } from "../models/user";
import { database } from "../db";
import { InternalError, UsernameExistsError, type SignupError } from "../error";
import { convertZod, sequential } from "../utils";

export namespace AuthService {
  function usernameExists(
    username: string,
  ): ResultAsync<boolean, InternalError> {
    return ResultAsync.fromPromise(
      database
        .select()
        .from(userTable)
        .where(eq(userTable.username, username))
        .limit(1),
      InternalError,
    ).map((users) => users.length > 0);
  }

  function verifyUsernameNotExists(
    username: string,
  ): ResultAsync<string, UsernameExistsError | InternalError> {
    return usernameExists(username).andThen((exists) =>
      exists ? err(UsernameExistsError) : ok(username),
    );
  }

  function hashPassword(password: string): ResultAsync<string, InternalError> {
    return ResultAsync.fromPromise(Bun.password.hash(password), InternalError);
  }

  function insertUser(
    name: string,
    username: string,
    hashedPassword: string,
  ): ResultAsync<SelectedUser, InternalError> {
    return ResultAsync.fromPromise(
      database
        .insert(userTable)
        .values({
          hashedPassword,
          name,
          username,
        })
        .returning(),
      InternalError,
    )
      .andThen((inserted) =>
        inserted.length == 1
          ? ok(inserted[0]!)
          : err(InternalError("Failed to insert")),
      )
      .andThen((user) =>
        convertZod(SelectedUser.safeParse(user)).mapErr(InternalError),
      );
  }

  export function signup(
    newUser: ReadonlyDeep<InsertedUser>,
  ): ResultAsync<SelectedUser, SignupError> {
    return sequential([
      () => verifyUsernameNotExists(newUser.username),
      () => hashPassword(newUser.password),
    ]).andThen(([username, password]) =>
      insertUser(newUser.name, username!, password!),
    );
  }
}
