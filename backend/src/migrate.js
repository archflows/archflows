import { assertConfig } from "./config.js";
import { closePool, migrate } from "./db.js";
import { assertKeysReady, seedApiKeysFromEnv } from "./lib/api-keys.js";

assertConfig();
await migrate();
await seedApiKeysFromEnv();
await assertKeysReady();
console.log("[arcflow-api] schema and api_keys ready");
await closePool();
