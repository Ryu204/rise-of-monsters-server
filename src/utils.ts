import {
  Err,
  err,
  errAsync,
  Ok,
  ok,
  okAsync,
  Result,
  ResultAsync,
} from "neverthrow";
import type { ZodSafeParseResult } from "zod";
import { ParseError } from "./error";

/** @description Helper method to convert Err of the same error type */
export function resErr<T, E, OldT>(input: Err<OldT, E>): Err<T, E> {
  return err(input.error);
}

export function convertZod<T>(
  result: ZodSafeParseResult<T>,
): Result<T, ParseError> {
  return result.success
    ? ok(result.data)
    : err(
        ParseError(
          result.error.issues.map(({ path, message }) => ({
            field: path.join("."),
            message,
          })),
        ),
      );
}

export function toAsync<T, E>(res: Result<T, E>): ResultAsync<T, E> {
  return res.match(
    (val) => okAsync(val),
    (err) => errAsync(err),
  );
}

export function sequential<Ts, Es>(
  callables: (() => ResultAsync<Ts, Es>)[],
): ResultAsync<Ts[], Es> {
  return ResultAsync.fromPromise(
    (async () => {
      const collectedOks: Ts[] = [];
      for (const func of callables) {
        const res = await func();
        if (res.isErr()) throw res.error;
        collectedOks.push(res.value);
      }
      return collectedOks;
    })(),
    (e) => e as Es,
  );
}
