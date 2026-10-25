import { drizzle } from "drizzle-orm/node-postgres";
import { databaseUrlFromEnv } from "./dbHelper";

export const database = drizzle(databaseUrlFromEnv());
