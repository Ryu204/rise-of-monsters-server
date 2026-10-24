import { IS_PROD } from "./config";

export type VerificationError = {
  reason: "invalid";
  field: "username" | "name" | "password";
};
export function VerificationError(
  field: VerificationError["field"],
): VerificationError {
  return { reason: "invalid", field };
}
export const UsernameExistsError = { reason: "username exists" } as const;
export type UsernameExistsError = typeof UsernameExistsError;
export type InternalError = { reason: "internal error" };
export function InternalError(message?: unknown): InternalError {
  return { reason: "internal error", ...(IS_PROD ? {} : { message }) };
}
export type SignupError =
  | ParseError
  | VerificationError
  | UsernameExistsError
  | InternalError;

export type ParseError = { message: unknown };
export function ParseError(message: unknown): ParseError {
  return { message };
}
