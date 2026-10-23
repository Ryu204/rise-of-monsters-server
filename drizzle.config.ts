import { defineConfig } from "drizzle-kit";
import { databaseUrlFromEnv } from "./database";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/models",
  out: "./migrations",
  dbCredentials: {
    url: databaseUrlFromEnv(),
  },
});
