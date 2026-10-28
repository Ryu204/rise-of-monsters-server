import {
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { AUTH_CONFIG } from "../config";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const refreshTokenTable = pgTable("refreshTokens", {
  tokenHash: varchar({ length: AUTH_CONFIG.jwt.hashLength }).primaryKey(),
  familyId: uuid().unique().notNull(),
  userId: integer().notNull(),
  expiresAt: timestamp().notNull(),
  familyExpiresAt: timestamp().notNull(),
  revokedAt: timestamp(),
  consumedAt: timestamp(),
});

export const InsertedRefreshToken = createInsertSchema(refreshTokenTable);
export const SelectedRefreshToken = createSelectSchema(refreshTokenTable);

export type InsertedRefreshToken = typeof refreshTokenTable.$inferInsert;
export type SelectedRefreshToken = typeof refreshTokenTable.$inferSelect;
