export function databaseUrlFromEnv() {
  return `postgresql://${process.env.DB_USER}:${
    process.env.DB_PASSWORD
  }@${process.env.DB_URL}/${process.env.DB_NAME}`;
}
