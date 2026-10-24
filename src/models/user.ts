import { integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { USER_CONFIG } from "../config";
import type { Except } from "type-fest";
import z from "zod";

export const userTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: USER_CONFIG.maxNameLength }).notNull(),
  username: varchar({ length: USER_CONFIG.maxNameLength }).notNull().unique(),
  hashedPassword: varchar({ length: 256 }).notNull(),
});

export const InsertedUser = createInsertSchema(userTable, {
  name: z
    .string()
    .trim()
    .min(USER_CONFIG.minNameLength)
    .max(USER_CONFIG.maxNameLength),
  username: z
    .string()
    .trim()
    .min(USER_CONFIG.minUsernameLength)
    .max(USER_CONFIG.maxUsernameLength)
    .regex(/^\S+$/, "Must not contain whitespaces"),
})
  .omit({ hashedPassword: true })
  .extend({
    password: z
      .string()
      .min(USER_CONFIG.minPasswordLength)
      .max(USER_CONFIG.maxPasswordLength),
  });
export const SelectedUser = createSelectSchema(userTable).omit({
  hashedPassword: true,
});

export type User = typeof userTable.$inferSelect;
export type InsertedUser = z.infer<typeof InsertedUser>;
export type SelectedUser = z.infer<typeof SelectedUser>;
