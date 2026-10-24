import { pgTable, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, type GetZodType } from "drizzle-zod";

export const gameTable = pgTable("games", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull().unique(),
});

export const newGameSchema = createInsertSchema(gameTable);

export type GameData = typeof gameTable.$inferSelect;
