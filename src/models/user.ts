import { integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const userTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 50 }).notNull(),
  username: varchar({ length: 255 }).notNull().unique(),
  hashedPassword: varchar({ length: 256 }).notNull(),
});

export const newUserSchema = createInsertSchema(userTable);
export const getUserSchema = createSelectSchema(userTable).omit({
  hashedPassword: true,
  id: true,
});

export const User = typeof userTable.$inferSelect;
