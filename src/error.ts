import { StatusCodes } from "http-status-codes";
import { IS_PROD } from "./config";

export type VerificationError = {
  reason: "invalid";
  field: "username" | "name" | "password";
  status: StatusCodes.BAD_REQUEST;
};
export function VerificationError(
  field: VerificationError["field"],
): VerificationError {
  return { reason: "invalid", field, status: StatusCodes.BAD_REQUEST };
}

export const UsernameExistsError = {
  reason: "username exists",
  status: StatusCodes.BAD_REQUEST,
} as const;
export type UsernameExistsError = typeof UsernameExistsError;

export type InternalError = {
  reason: "internal error";
  status: StatusCodes.INTERNAL_SERVER_ERROR;
};
export function InternalError(message?: unknown): InternalError {
  return {
    reason: "internal error",
    status: StatusCodes.INTERNAL_SERVER_ERROR,
    ...(IS_PROD ? {} : { message }),
  };
}

export type ParseError = { message: unknown; status: StatusCodes.BAD_REQUEST };
export function ParseError(message: unknown): ParseError {
  return { message, status: StatusCodes.BAD_REQUEST };
}

export type SignupError =
  | ParseError
  | VerificationError
  | UsernameExistsError
  | InternalError;

export const WrongCredentialsError = {
  reason: "Wrong credentials",
  status: StatusCodes.UNAUTHORIZED,
} as const;
export type WrongCredentialsError = typeof WrongCredentialsError;

export type LoginError =
  | ParseError
  | VerificationError
  | WrongCredentialsError
  | InternalError;

export const UnauthorizedError = {
  reason: "Unauthorized",
  status: StatusCodes.UNAUTHORIZED,
} as const;
export type UnauthorizedError = typeof UnauthorizedError;

export const RefreshTokenInvalidError = {
  reason: "invalid refresh token",
  status: StatusCodes.UNAUTHORIZED,
} as const;
export type RefreshTokenInvalidError = typeof RefreshTokenInvalidError;

export type RotateRefreshTokenError = RefreshTokenInvalidError | InternalError;

export type GetGameError = ParseError | UnauthorizedError | InternalError;
