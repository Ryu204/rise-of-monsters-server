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
export const LoggingInUser = InsertedUser.omit({ name: true });
export const SelectedUser = createSelectSchema(userTable);
export const ResponsedUser = SelectedUser.omit({ hashedPassword: true });
export const LoggedInUser = ResponsedUser.extend({
  jwt: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

export type InsertedUser = z.infer<typeof InsertedUser>;
export type LoggingInUser = z.infer<typeof LoggingInUser>;
export type SelectedUser = z.infer<typeof SelectedUser>;
// This does not use z.infer because we do not want the hashed password to ever be sent
export type ResponsedUser = Except<
  SelectedUser,
  "hashedPassword",
  { requireExactProps: true }
>;
export type LoggedInUser = z.infer<typeof LoggedInUser>;
