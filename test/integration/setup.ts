// tests/setup.ts
import { beforeAll, beforeEach } from "bun:test";
import { database } from "../../src/db";
import { userTable } from "../../src/models/user";
import { migrate } from "drizzle-orm/node-postgres/migrator";

beforeAll(async () => {
  if (process.env.NODE_ENV != "test") {
    console.error("CRITICAL ERROR: DO NOT TEST ON NON-TEST ENVIRONMENT");
    process.exit(-1);
  }
  await migrate(database, { migrationsFolder: "migrations" });
});

beforeEach(async () => {
  await database.delete(userTable);
});
