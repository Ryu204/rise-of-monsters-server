import { cleanupRefreshTokens } from "./removeObsoleteTokens";

const JOBS = [
  {
    func: cleanupRefreshTokens,
    schedule: "0 12 * * *",
    name: "cleanup refresh tokens",
  },
] as const;

function startJobs() {
  for (const job of JOBS) {
    Bun.cron(
      job.schedule,
      async () => {
        console.log(`Executing "${job.name}"`);
        const result = await job.func();
        if (result.isOk()) {
          console.log(`[Succeed] ${job.name}`);
        } else {
          console.error(`[Fail] ${job.name} - ${result.error}`);
        }
        console.log(
          `Reschedule "${job.name}" at ${Bun.cron.parse(job.schedule)}`,
        );
      },
      { tz: "Etc/UTC" },
    );
    console.log(`Scheduled "${job.name}" at ${Bun.cron.parse(job.schedule)}`);
  }
}

function startHealthServer(port: number) {
  Bun.serve({
    port,
    fetch: (req) =>
      new URL(req.url).pathname === "/health"
        ? new Response("ok")
        : new Response("not found", { status: 404 }),
  });
}

async function runHealthCheck(port: number) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    process.exit(res.ok ? 0 : 1);
  } catch (e) {
    console.error(`Health check failed:\n${e}`);
    process.exit(1);
  }
}

function main() {
  const port = Number(process.env.HEALTH_CHECK_PORT);
  if (!Number.isSafeInteger(port)) {
    console.error("Missing health check port config");
    process.exit(1);
  }
  if (process.argv.includes("--health-check")) {
    runHealthCheck(port);
    return;
  }
  process.on("unhandledRejection", (err) => {
    console.error(`Unhandled rejection:\n${err}`);
  });
  startHealthServer(port);
  startJobs();
}

try {
  main();
} catch (e) {
  console.error(`Uncaught exception:\n${e}`);
  process.exit(1);
}
