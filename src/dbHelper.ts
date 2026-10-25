export function databaseUrlFromEnv() {
  if (process.env.NODE_ENV == "test") {
    return `postgresql://${process.env.TEST_DB_USER}:${
      process.env.TEST_DB_PASSWORD
    }@${process.env.TEST_DB_URL}/${process.env.TEST_DB_NAME}`;
  }
  return `postgresql://${process.env.DB_USER}:${
    process.env.DB_PASSWORD
  }@${process.env.DB_URL}/${process.env.DB_NAME}`;
}
