import express from "express";
import {
  clearDocsCookie,
  getSwaggerAuth,
  requireSwaggerAuth,
  setDocsCookie,
  swaggerConfigured,
} from "./middleware/swagger-auth.js";
import { findDocsUser, touchDocsUser } from "./lib/docs-users.js";
import { docsLoginPage, docsSwaggerPage } from "./swagger-pages.js";
import { asyncHandler } from "./middleware/async-handler.js";

const address = { type: "string", pattern: "^0x[a-fA-F0-9]{40}$", example: "0x3600000000000000000000000000000000000000" };
const amount = { type: "string", pattern: "^\\d+$", example: "1000000" };
const id = { type: "string", pattern: "^\\d+$", example: "1" };
const unix = { type: "integer", minimum: 0, example: 1770000000 };
const txHash = { type: "string", pattern: "^0x[a-fA-F0-9]{64}$" };

const ok = (schema) => ({
  description: "Success",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          data: schema,
        },
      },
    },
  },
});

const errors = {
  400: { description: "Bad request" },
  401: { description: "Missing or invalid API key" },
  404: { description: "Not found" },
  429: { description: "Rate limited" },
};

const page = {
  type: "object",
  properties: {
    total: { type: "integer" },
    limit: { type: "integer" },
    offset: { type: "integer" },
  },
};

const listQuery = [
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 50 } },
  { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
];

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "ArcFlow API",
    version: "0.1.0",
    description:
      "Index API for ArcFlow locks, vests, streams, airdrops, escrow, and staking on Arc. Writes store on-chain activity; they do not replace wallet transactions. All `/v1` routes need an API key.",
  },
  servers: [{ url: "/", description: "This server" }],
  tags: [
    { name: "Health" },
    { name: "Config" },
    { name: "Stats" },
    { name: "Locks" },
    { name: "Streams" },
    { name: "Campaigns" },
    { name: "Escrow" },
    { name: "Staking" },
    { name: "Keys" },
  ],
  components: {
    securitySchemes: {
      ApiKey: { type: "apiKey", in: "header", name: "x-api-key" },
      Bearer: { type: "http", scheme: "bearer" },
    },
  },
  security: [{ ApiKey: [] }, { Bearer: [] }],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        security: [],
        summary: "Liveness plus database status",
        responses: {
          200: ok({
            type: "object",
            properties: {
              status: { type: "string", example: "up" },
              database: {
                type: "object",
                properties: {
                  status: { type: "string", example: "up" },
                  ms: { type: "integer", example: 12 },
                },
              },
            },
          }),
          503: { description: "Database unreachable" },
        },
      },
    },
    "/ready": {
      get: {
        tags: ["Health"],
        security: [],
        summary: "Postgres ping",
        responses: { 200: ok({ type: "object", properties: { status: { type: "string" }, dbMs: { type: "integer" } } }) },
      },
    },
    "/v1/config": {
      get: {
        tags: ["Config"],
        summary: "Chain, RPC, and contract addresses",
        responses: { 200: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/stats": {
      get: {
        tags: ["Stats"],
        summary: "Live totals, featured lock, daily series, recent activity",
        parameters: [
          { name: "wallet", in: "query", schema: address },
          { name: "days", in: "query", schema: { type: "integer", minimum: 7, maximum: 180, default: 90 } },
        ],
        responses: { 200: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/locks": {
      get: {
        tags: ["Locks"],
        summary: "List locks and vests",
        parameters: [
          ...listQuery,
          { name: "creator", in: "query", schema: address },
          { name: "beneficiary", in: "query", schema: address },
          { name: "token", in: "query", schema: address },
          { name: "kind", in: "query", schema: { type: "string", enum: ["lock", "vest"] } },
        ],
        responses: { 200: ok({ type: "object", properties: { items: { type: "array" }, page } }), ...errors },
      },
      post: {
        tags: ["Locks"],
        summary: "Create or upsert a lock/vest",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id", "token", "beneficiary", "creator", "amount", "start", "cliff", "end"],
                properties: {
                  id,
                  kind: { type: "string", enum: ["lock", "vest"] },
                  token: address,
                  beneficiary: address,
                  creator: address,
                  amount,
                  claimed: amount,
                  start: unix,
                  cliff: unix,
                  end: unix,
                  feeUsdc: amount,
                  txHash,
                  unlockTxHash: txHash,
                  meta: { type: "object" },
                },
              },
            },
          },
        },
        responses: { 201: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/locks/{id}": {
      get: {
        tags: ["Locks"],
        summary: "Get one lock by id or transaction hash",
        parameters: [{ name: "id", in: "path", required: true, schema: id }],
        responses: { 200: ok({ type: "object" }), ...errors },
      },
      patch: {
        tags: ["Locks"],
        summary: "Update claimed / metadata",
        parameters: [{ name: "id", in: "path", required: true, schema: id }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  claimed: amount,
                  kind: { type: "string", enum: ["lock", "vest"] },
                  txHash,
                  unlockTxHash: txHash,
                  meta: { type: "object" },
                },
              },
            },
          },
        },
        responses: { 200: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/streams": {
      get: {
        tags: ["Streams"],
        summary: "List streams",
        parameters: [
          ...listQuery,
          { name: "sender", in: "query", schema: address },
          { name: "recipient", in: "query", schema: address },
          { name: "token", in: "query", schema: address },
        ],
        responses: { 200: ok({ type: "object" }), ...errors },
      },
      post: {
        tags: ["Streams"],
        summary: "Create or upsert a stream",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id", "token", "sender", "recipient", "amount", "start", "cliff", "end"],
                properties: {
                  id,
                  token: address,
                  sender: address,
                  recipient: address,
                  amount,
                  withdrawn: amount,
                  start: unix,
                  cliff: unix,
                  end: unix,
                  period: { type: "integer" },
                  cancelable: { type: "boolean" },
                  transferable: { type: "boolean" },
                  canTopup: { type: "boolean" },
                  canceled: { type: "boolean" },
                  txHash,
                },
              },
            },
          },
        },
        responses: { 201: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/streams/batch": {
      post: {
        tags: ["Streams"],
        summary: "Upsert up to 200 streams (payroll)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { items: { type: "array", maxItems: 200, items: { type: "object" } } },
              },
            },
          },
        },
        responses: { 201: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/streams/{id}": {
      get: {
        tags: ["Streams"],
        parameters: [{ name: "id", in: "path", required: true, schema: id }],
        responses: { 200: ok({ type: "object" }), ...errors },
      },
      patch: {
        tags: ["Streams"],
        parameters: [{ name: "id", in: "path", required: true, schema: id }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { amount, withdrawn: amount, recipient: address, canceled: { type: "boolean" }, txHash },
              },
            },
          },
        },
        responses: { 200: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/campaigns": {
      get: {
        tags: ["Campaigns"],
        summary: "List airdrop campaigns",
        parameters: [...listQuery, { name: "funder", in: "query", schema: address }, { name: "token", in: "query", schema: address }],
        responses: { 200: ok({ type: "object" }), ...errors },
      },
      post: {
        tags: ["Campaigns"],
        summary: "Create or upsert a campaign",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id", "token", "funder", "merkleRoot", "deposited", "claimStart", "claimEnd"],
                properties: {
                  id,
                  token: address,
                  funder: address,
                  merkleRoot: { type: "string" },
                  deposited: amount,
                  claimed: amount,
                  claimStart: unix,
                  claimEnd: unix,
                  vestDuration: { type: "integer" },
                  vestCliffDelay: { type: "integer" },
                  canceled: { type: "boolean" },
                  txHash,
                },
              },
            },
          },
        },
        responses: { 201: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/campaigns/{id}": {
      get: {
        tags: ["Campaigns"],
        parameters: [{ name: "id", in: "path", required: true, schema: id }],
        responses: { 200: ok({ type: "object" }), ...errors },
      },
      patch: {
        tags: ["Campaigns"],
        parameters: [{ name: "id", in: "path", required: true, schema: id }],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { deposited: amount, claimed: amount, canceled: { type: "boolean" }, txHash } },
            },
          },
        },
        responses: { 200: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/campaigns/{id}/claims": {
      get: {
        tags: ["Campaigns"],
        parameters: [
          { name: "id", in: "path", required: true, schema: id },
          ...listQuery,
          { name: "account", in: "query", schema: address },
        ],
        responses: { 200: ok({ type: "object" }), ...errors },
      },
      post: {
        tags: ["Campaigns"],
        summary: "Record an airdrop claim",
        parameters: [{ name: "id", in: "path", required: true, schema: id }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["index", "account", "amount"],
                properties: { index: id, account: address, receiver: address, amount, streamId: id, txHash },
              },
            },
          },
        },
        responses: { 201: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/escrow": {
      get: {
        tags: ["Escrow"],
        parameters: [
          ...listQuery,
          { name: "buyer", in: "query", schema: address },
          { name: "seller", in: "query", schema: address },
          { name: "token", in: "query", schema: address },
          { name: "status", in: "query", schema: { type: "string", enum: ["open", "released", "refunded"] } },
        ],
        responses: { 200: ok({ type: "object" }), ...errors },
      },
      post: {
        tags: ["Escrow"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id", "token", "buyer", "seller", "amount", "unlockAt"],
                properties: {
                  id,
                  token: address,
                  buyer: address,
                  seller: address,
                  amount,
                  unlockAt: unix,
                  termsHash: { type: "string" },
                  status: { type: "string", enum: ["open", "released", "refunded"] },
                  txHash,
                },
              },
            },
          },
        },
        responses: { 201: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/escrow/{id}": {
      get: {
        tags: ["Escrow"],
        parameters: [{ name: "id", in: "path", required: true, schema: id }],
        responses: { 200: ok({ type: "object" }), ...errors },
      },
      patch: {
        tags: ["Escrow"],
        parameters: [{ name: "id", in: "path", required: true, schema: id }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { status: { type: "string", enum: ["open", "released", "refunded"] }, txHash },
              },
            },
          },
        },
        responses: { 200: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/pools": {
      get: {
        tags: ["Staking"],
        parameters: [
          ...listQuery,
          { name: "owner", in: "query", schema: address },
          { name: "stakeToken", in: "query", schema: address },
          { name: "rewardToken", in: "query", schema: address },
        ],
        responses: { 200: ok({ type: "object" }), ...errors },
      },
      post: {
        tags: ["Staking"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id", "stakeToken", "rewardToken", "owner"],
                properties: {
                  id,
                  stakeToken: address,
                  rewardToken: address,
                  owner: address,
                  minLock: { type: "integer" },
                  totalStaked: amount,
                  cap: amount,
                  expiresAt: unix,
                  paused: { type: "boolean" },
                  txHash,
                },
              },
            },
          },
        },
        responses: { 201: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/pools/{id}": {
      get: {
        tags: ["Staking"],
        parameters: [{ name: "id", in: "path", required: true, schema: id }],
        responses: { 200: ok({ type: "object" }), ...errors },
      },
      patch: {
        tags: ["Staking"],
        parameters: [{ name: "id", in: "path", required: true, schema: id }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { totalStaked: amount, cap: amount, expiresAt: unix, paused: { type: "boolean" }, txHash },
              },
            },
          },
        },
        responses: { 200: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/pools/{id}/stakes": {
      get: {
        tags: ["Staking"],
        parameters: [...listQuery, { name: "id", in: "path", required: true, schema: id }],
        responses: { 200: ok({ type: "object" }), ...errors },
      },
      post: {
        tags: ["Staking"],
        summary: "Upsert a stake position",
        parameters: [{ name: "id", in: "path", required: true, schema: id }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["account", "amount"],
                properties: { account: address, amount, unlockAt: unix, rewards: amount, txHash },
              },
            },
          },
        },
        responses: { 201: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/keys": {
      get: {
        tags: ["Keys"],
        summary: "List API keys (admin)",
        responses: { 200: ok({ type: "object" }), ...errors },
      },
      post: {
        tags: ["Keys"],
        summary: "Create a public API key (admin)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "partner" },
                  role: { type: "string", enum: ["client", "admin"] },
                  secret: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/docs-users": {
      get: {
        tags: ["Keys"],
        summary: "List Swagger /docs logins (admin)",
        responses: { 200: ok({ type: "object" }), ...errors },
      },
      post: {
        tags: ["Keys"],
        summary: "Create a Swagger /docs login (admin)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string", example: "partner" },
                  password: { type: "string" },
                  name: { type: "string", example: "Partner" },
                  role: { type: "string", enum: ["admin", "partner", "viewer"] },
                },
              },
            },
          },
        },
        responses: { 201: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/docs-users/{id}": {
      patch: {
        tags: ["Keys"],
        summary: "Update or revoke a /docs login (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  active: { type: "boolean" },
                  password: { type: "string" },
                  name: { type: "string" },
                  role: { type: "string", enum: ["admin", "partner", "viewer"] },
                },
              },
            },
          },
        },
        responses: { 200: ok({ type: "object" }), ...errors },
      },
    },
    "/v1/keys/{id}": {
      patch: {
        tags: ["Keys"],
        summary: "Activate or revoke a key (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["active"], properties: { active: { type: "boolean" } } },
            },
          },
        },
        responses: { 200: ok({ type: "object" }), ...errors },
      },
    },
  },
};

const ADMIN_ONLY_PATHS = new Set(["/v1/keys", "/v1/keys/{id}", "/v1/docs-users", "/v1/docs-users/{id}"]);

export function specForRole(role) {
  if (role === "admin") return openApiSpec;
  const paths = Object.fromEntries(
    Object.entries(openApiSpec.paths).filter(([path]) => !ADMIN_ONLY_PATHS.has(path)),
  );
  return {
    ...openApiSpec,
    paths,
    tags: openApiSpec.tags.filter((tag) => tag.name !== "Keys"),
  };
}

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 12;

function loginLimited(ip) {
  const now = Date.now();
  let bucket = loginAttempts.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(ip, bucket);
  }
  bucket.count += 1;
  return bucket.count > LOGIN_MAX;
}

function sendHtml(res, html, status = 200) {
  res.status(status).type("html").set("Cache-Control", "no-store").send(html);
}

export function mountSwagger(app) {
  const form = express.urlencoded({ extended: false, limit: "8kb" });

  app.get("/docs.json", requireSwaggerAuth, (req, res) => {
    res.json(specForRole(req.docsUser?.role));
  });

  app.get(
    "/docs",
    asyncHandler(async (req, res) => {
      if (!(await swaggerConfigured())) {
        res.status(503).json({
          ok: false,
          error: { code: "swagger_disabled", message: "No active docs users" },
        });
        return;
      }
      if (await getSwaggerAuth(req)) {
        sendHtml(res, docsSwaggerPage());
        return;
      }
      sendHtml(res, docsLoginPage({ error: req.query.error === "1" }));
    }),
  );

  app.post(
    "/docs/login",
    form,
    asyncHandler(async (req, res) => {
      if (!(await swaggerConfigured())) {
        res.status(503).json({
          ok: false,
          error: { code: "swagger_disabled", message: "No active docs users" },
        });
        return;
      }
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      if (loginLimited(ip)) {
        sendHtml(res, docsLoginPage({ error: true }), 429);
        return;
      }
      const user = typeof req.body?.username === "string" ? req.body.username : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const row = await findDocsUser(user, password);
      if (!row) {
        sendHtml(res, docsLoginPage({ error: true }), 401);
        return;
      }
      touchDocsUser(row.id);
      setDocsCookie(req, res, row);
      res.redirect(303, "/docs");
    }),
  );

  app.get("/docs/logout", (_req, res) => {
    clearDocsCookie(res);
    res.redirect(303, "/docs");
  });
}
