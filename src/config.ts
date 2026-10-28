import type { SignatureAlgorithm } from "hono/utils/jwt/jwa";

export const USER_CONFIG = {
  maxNameLength: 256,
  minNameLength: 1,
  maxUsernameLength: 256,
  minUsernameLength: 6,
  minPasswordLength: 8,
  maxPasswordLength: 256,
};

export const GAME_CONFIG = {
  minNameLength: 3,
  maxNameLength: 100,
  codeLength: 6,
  minPlayers: 1,
  maxPlayers: 100,
  minPasswordLength: 6,
  maxPasswordLength: 256,
};

export const AUTH_CONFIG = {
  jwt: {
    iss: `${process.env.NODE_ENV}.rise-of-monsters`,
    accessTtl: 10 * 60,
    refreshTtl: {
      each: 2 * 7 * 24 * 60 * 60,
      family: 20 * 7 * 24 * 60 * 60,
    },
    secret: process.env.JWT_SECRET!,
    algo: "HS256" as SignatureAlgorithm,
    cookieAccessToken: "access_token",
    cookieRefreshToken: "refresh_token",
    hashLength: 256,
    refreshTokenBytes: 32,
  },
};

export const IS_PROD = process.env.NODE_ENV == "production";
