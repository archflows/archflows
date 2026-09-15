import cluster from "node:cluster";

import os from "node:os";
import { createApp } from "./app.js";
import { assertConfig, config } from "./config.js";
import { closePool, migrate } from "./db.js";
import { assertKeysReady, seedApiKeysFromEnv } from "./lib/api-keys.js";
import { seedDocsUsersFromEnv } from "./lib/docs-users.js";

const workers = Number.parseInt(process.env.CLUSTER_WORKERS || "0", 10);

async function startWorker() {
  assertConfig();
  await migrate();
  await seedApiKeysFromEnv();
  await seedDocsUsersFromEnv();
  await assertKeysReady();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(
      `[arcflow-api] listening on :${config.port} mode=${config.mode} chain=${config.chainId} pid=${process.pid}`,
    );
  });

  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  server.requestTimeout = 30_000;

  const shutdown = async (signal) => {
    console.log(`[arcflow-api] ${signal}, shutting down`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

async function main() {
  if (workers > 1 && cluster.isPrimary) {
    assertConfig();
    await migrate();
    await seedApiKeysFromEnv();
    await seedDocsUsersFromEnv();
    await assertKeysReady();
    await closePool();
    const n = Math.min(workers, os.cpus().length);
    console.log(`[arcflow-api] primary ${process.pid} forking ${n} workers`);
    for (let i = 0; i < n; i += 1) cluster.fork();
    cluster.on("exit", (worker) => {
      console.error(`[arcflow-api] worker ${worker.process.pid} exited, forking replacement`);
      cluster.fork();
    });
    return;
  }

  await startWorker();
}

main().catch((error) => {
  console.error("[arcflow-api] failed to start", error);
  process.exit(1);
});
