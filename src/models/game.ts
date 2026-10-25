import { pgTable, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";
import { GAME_CONFIG } from "../config";
import type { Except } from "type-fest";

export const gameTable = pgTable("games", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  code: varchar({ length: GAME_CONFIG.codeLength }).unique().notNull(),
  name: varchar({ length: GAME_CONFIG.maxNameLength }).notNull(),
  maxPlayers: integer().notNull(),
  hashedPassword: varchar({ length: 256 }),
});

export const SelectedGame = createSelectSchema(gameTable);
export const InsertedGame = createInsertSchema(gameTable, {
  name: z
    .string()
    .trim()
    .min(GAME_CONFIG.minNameLength)
    .max(GAME_CONFIG.maxNameLength),
  maxPlayers: z.int().min(GAME_CONFIG.minPlayers).max(GAME_CONFIG.maxPlayers),
})
  .omit({ code: true, hashedPassword: true })
  .extend({
    password: z
      .string()
      .min(GAME_CONFIG.minPasswordLength)
      .max(GAME_CONFIG.maxPasswordLength)
      .nullish(),
  });
export const ResponsedGame = SelectedGame.omit({
  hashedPassword: true,
});

export type SelectedGame = typeof gameTable.$inferSelect;
export type InsertedGame = z.infer<typeof InsertedGame>;
export type ResponsedGame = Except<
  SelectedGame,
  "hashedPassword",
  { requireExactProps: true }
>;
