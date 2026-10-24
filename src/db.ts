import { drizzle } from "drizzle-orm/node-postgres";
import { databaseUrlFromEnv } from "../database";

const databaseUrl = databaseUrlFromEnv();
export const database = drizzle(databaseUrl);
