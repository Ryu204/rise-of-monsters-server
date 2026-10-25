import { err, ok, Result, ResultAsync } from "neverthrow";
import { eq } from "drizzle-orm";
import type { ReadonlyDeep } from "type-fest";
import {
  LoggingInUser,
  ResponseUser,
  SelectedUser,
  userTable,
  type InsertedUser,
} from "../models/user";
import { database } from "../db";
import {
  InternalError,
  UsernameExistsError,
  WrongCredentialsError,
  type LoginError,
  type SignupError,
} from "../error";
import { convertZod, sequential } from "../utils";

export namespace AuthService {
  function usernameExists(
    username: string,
  ): ResultAsync<Result<SelectedUser, void>, InternalError> {
    return ResultAsync.fromPromise(
      database
        .select()
        .from(userTable)
        .where(eq(userTable.username, username))
        .limit(1),
      InternalError,
    ).map(([user]) => (user ? ok(user) : err()));
  }

  function verifyUsernameNotExists(
    username: string,
  ): ResultAsync<string, UsernameExistsError | InternalError> {
    return usernameExists(username).andThen((result) =>
      result.isOk() ? err(UsernameExistsError) : ok(username),
    );
  }

  function hashPassword(password: string): ResultAsync<string, InternalError> {
    return ResultAsync.fromPromise(Bun.password.hash(password), InternalError);
  }

  function verifyPassword(
    password: string,
    hashedPassword: string,
  ): ResultAsync<boolean, InternalError> {
    return ResultAsync.fromPromise(
      Bun.password.verify(password, hashedPassword),
      InternalError,
    );
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
  ): ResultAsync<ResponseUser, SignupError> {
    return sequential([
      () => verifyUsernameNotExists(newUser.username),
      () => hashPassword(newUser.password),
    ])
      .andThen(([username, password]) =>
        insertUser(newUser.name, username!, password!),
      )
      .andThen((user) => convertZod(ResponseUser.safeParse(user)));
  }

  export function login(
    user: ReadonlyDeep<LoggingInUser>,
  ): ResultAsync<ResponseUser, LoginError> {
    return usernameExists(user.username)
      .andThen((result) =>
        result.isOk() ? ok(result.value) : err(WrongCredentialsError),
      )
      .andThen((selectedUser) =>
        verifyPassword(user.password, selectedUser.hashedPassword).andThen(
          (passwordOk) =>
            passwordOk ? ok(selectedUser) : err(WrongCredentialsError),
        ),
      )
      .andThen((user) => convertZod(ResponseUser.safeParse(user)));
  }
}
