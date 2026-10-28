import { randomBytes, randomUUID } from "node:crypto";
import { err, ok, okAsync, Result, ResultAsync } from "neverthrow";
import {
  and,
  eq,
  gt,
  isNotNull,
  isNull,
  type TablesRelationalConfig,
} from "drizzle-orm";
import type { ReadonlyDeep } from "type-fest";
import { sign } from "hono/jwt";
import type { Context } from "hono";
import {
  JwtSchema,
  LoggedInUser,
  LoggingInUser,
  ResponsedUser,
  SelectedUser,
  userTable,
  type InsertedUser,
} from "../models/user";
import { database } from "../db";
import {
  InternalError,
  RefreshTokenInvalidError,
  UsernameExistsError,
  WrongCredentialsError,
  type LoginError,
  type RotateRefreshTokenError,
  type SignupError,
} from "../error";
import { convertZod, sequential } from "../utils";
import { AUTH_CONFIG } from "../config";
import {
  refreshTokenTable,
  SelectedRefreshToken,
} from "../models/refreshToken";
import type { PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";

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

  function randomRefreshToken(): string {
    return randomBytes(AUTH_CONFIG.jwt.refreshTokenBytes).toString("hex");
  }

  function createNewSession(
    user: ReadonlyDeep<ResponsedUser>,
  ): ResultAsync<string, InternalError> {
    const randomToken = randomRefreshToken();
    const randomFamilyId = randomUUID();
    const now = Date.now();
    return ResultAsync.fromPromise(
      Bun.password.hash(randomToken),
      InternalError,
    )
      .andThen((tokenHash) =>
        ResultAsync.fromPromise(
          database.insert(refreshTokenTable).values({
            tokenHash,
            userId: user.id,
            expiresAt: new Date(now + AUTH_CONFIG.jwt.refreshTtl.each * 1000),
            familyId: randomFamilyId,
            familyExpiresAt: new Date(
              now + AUTH_CONFIG.jwt.refreshTtl.family * 1000,
            ),
            revokedAt: null,
          }),
          InternalError,
        ),
      )
      .map(() => randomToken);
  }

  function signAccessToken(
    userId: number,
    now: ReadonlyDeep<Date>,
  ): ResultAsync<string, InternalError> {
    return ResultAsync.fromPromise(
      sign(
        {
          sub: userId,
          iss: AUTH_CONFIG.jwt.iss,
          exp: Math.floor(now.getTime() / 1000) + AUTH_CONFIG.jwt.accessTtl,
        },
        AUTH_CONFIG.jwt.secret,
        AUTH_CONFIG.jwt.algo,
      ),
      InternalError,
    );
  }

  function signJwtOnLogin(
    user: ReadonlyDeep<ResponsedUser>,
  ): ResultAsync<LoggedInUser, InternalError> {
    const now = new Date();
    return sequential([
      () => signAccessToken(user.id, now),
      () => createNewSession(user),
    ]).map(([accessToken, refreshToken]) => ({
      ...user,
      jwt: {
        accessToken: accessToken!,
        refreshToken: refreshToken!,
      },
    }));
  }

  function getTokenFamilyIdIfConsumed<
    C extends PgQueryResultHKT,
    P extends Record<string, unknown>,
    T extends TablesRelationalConfig,
  >(
    tokenHash: string,
    tx: PgTransaction<C, P, T>,
  ): ResultAsync<string | undefined, InternalError> {
    return ResultAsync.fromPromise(
      tx
        .select({ familyId: refreshTokenTable.familyId })
        .from(refreshTokenTable)
        .where(
          and(
            eq(refreshTokenTable.tokenHash, tokenHash),
            isNotNull(refreshTokenTable.consumedAt),
          ),
        ),
      InternalError,
    ).andThen(([tokenRecord]) =>
      tokenRecord ? ok(tokenRecord.familyId) : ok(undefined),
    );
  }

  function revokeRefreshTokenFamily<
    C extends PgQueryResultHKT,
    P extends Record<string, unknown>,
    T extends TablesRelationalConfig,
  >(
    now: ReadonlyDeep<Date>,
    familyId: string,
    tx: PgTransaction<C, P, T>,
  ): ResultAsync<void, InternalError> {
    return ResultAsync.fromPromise(
      tx
        .update(refreshTokenTable)
        .set({ consumedAt: now })
        .where(
          and(
            eq(refreshTokenTable.familyId, familyId),
            isNull(refreshTokenTable.revokedAt),
          ),
        ),
      InternalError,
    ).map(() => {});
  }

  function consumeRefreshToken<
    C extends PgQueryResultHKT,
    P extends Record<string, unknown>,
    T extends TablesRelationalConfig,
  >(
    tokenHash: string,
    now: ReadonlyDeep<Date>,
    tx: PgTransaction<C, P, T>,
  ): ResultAsync<ReadonlyDeep<SelectedRefreshToken>, RotateRefreshTokenError> {
    return ResultAsync.fromPromise(
      database
        .update(refreshTokenTable)
        .set({ consumedAt: now })
        .where(
          and(
            eq(refreshTokenTable.tokenHash, tokenHash),
            isNull(refreshTokenTable.consumedAt),
            isNull(refreshTokenTable.revokedAt),
            gt(refreshTokenTable.expiresAt, now),
            gt(refreshTokenTable.familyExpiresAt, now),
          ),
        )
        .returning(),
      InternalError,
    )
      .andThrough(([updated]) => {
        if (updated) return ok();
        return getTokenFamilyIdIfConsumed(tokenHash, tx).andThrough(
          (maybeFamilyId) => {
            if (!maybeFamilyId) return okAsync();
            return revokeRefreshTokenFamily(now, maybeFamilyId, tx);
          },
        );
      })
      .andThen(([updated]) =>
        updated ? ok(updated) : err(RefreshTokenInvalidError),
      );
  }

  function rotateRefreshToken<
    C extends PgQueryResultHKT,
    P extends Record<string, unknown>,
    T extends TablesRelationalConfig,
  >(
    oldTokenHash: string,
    now: ReadonlyDeep<Date>,
    tx: PgTransaction<C, P, T>,
  ): ResultAsync<{ userId: number; token: string }, RotateRefreshTokenError> {
    const randomToken = randomRefreshToken();
    return consumeRefreshToken(oldTokenHash, now, tx)
      .andThen((oldToken) =>
        ResultAsync.fromPromise(
          Bun.password.hash(randomToken),
          InternalError,
        ).map(
          (newTokenHash) =>
            [oldToken, newTokenHash] as [
              ReadonlyDeep<SelectedRefreshToken>,
              string,
            ],
        ),
      )
      .andThrough(([oldSelectedToken, newTokenHash]) =>
        ResultAsync.fromPromise(
          tx.insert(refreshTokenTable).values({
            ...oldSelectedToken,
            consumedAt: null,
            revokedAt: null,
            tokenHash: newTokenHash,
            expiresAt: new Date(
              Math.min(
                now.getTime() + AUTH_CONFIG.jwt.refreshTtl.each * 1000,
                oldSelectedToken!.familyExpiresAt.getTime(),
              ),
            ),
          }),
          InternalError,
        ),
      )
      .map(([oldSelectedToken]) => ({
        token: randomToken,
        userId: oldSelectedToken.userId,
      }));
  }

  export function refreshAccessToken(
    refreshToken: string,
  ): ResultAsync<JwtSchema, RotateRefreshTokenError> {
    const now = new Date();
    return ResultAsync.fromPromise(
      Bun.password.hash(refreshToken),
      InternalError,
    ).andThen((tokenHash) =>
      ResultAsync.fromPromise(
        database.transaction(
          async (tx) => await rotateRefreshToken(tokenHash, now, tx),
        ),
        InternalError,
      )
        .andThen((e) => e)
        .andThen(({ token, userId }) =>
          signAccessToken(userId, now).map((accessToken) => ({
            accessToken,
            refreshToken: token,
          })),
        ),
    );
  }

  export function signup(
    newUser: ReadonlyDeep<InsertedUser>,
  ): ResultAsync<ResponsedUser, SignupError> {
    return sequential([
      () => verifyUsernameNotExists(newUser.username),
      () => hashPassword(newUser.password),
    ])
      .andThen(([username, password]) =>
        insertUser(newUser.name, username!, password!),
      )
      .andThen((user) => convertZod(ResponsedUser.safeParse(user)));
  }

  export function login(
    user: ReadonlyDeep<LoggingInUser>,
    c: Context,
  ): ResultAsync<LoggedInUser, LoginError> {
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
      .andThen((user) => convertZod(ResponsedUser.safeParse(user)))
      .andThen(signJwtOnLogin);
  }
}
