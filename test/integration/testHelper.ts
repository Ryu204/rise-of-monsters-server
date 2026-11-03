import { createApp } from "@src/app";

export function createTestApp() {
  return createApp({
    isProd: false,
    host: process.env.SERVE_HOST!,
    port: Number(process.env.SERVE_PORT),
  });
}
