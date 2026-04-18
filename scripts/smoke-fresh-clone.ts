/**
 * scripts/smoke-fresh-clone.ts
 *
 * Local smoke test for developers. Spins up an ephemeral Postgres container,
 * applies the schema via db:drizzle:push, boots the dev server, and runs a
 * minimal end-to-end POST → GET cycle against the WP REST API.
 *
 * Prerequisites: Docker must be running.
 * Usage: npm run smoke:fresh-clone
 * Exit 0 → PASS. Exit 1 → FAIL (reason printed).
 */

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

const SERVER_PORT = 3099; // Use a non-default port to avoid conflicts
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const ADMIN_TOKEN = "dev-admin-token";
const POLL_INTERVAL_MS = 500;
const SERVER_BOOT_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 5_000;

let serverProcess: ChildProcess | null = null;

// ── Helpers ────────────────────────────────────────────────────────────────

function log(msg: string): void {
  process.stdout.write(`  ${msg}\n`);
}

function fail(step: string, detail: string): never {
  process.stderr.write(`\n❌ FAIL [${step}]: ${detail}\n`);
  process.exit(1);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls a URL until it responds with a 200 that includes `expectedBody`
 * in its text response, or until timeout expires.
 */
async function pollUntil(
  url: string,
  expectedBody: string,
  timeoutMs: number,
  step: string,
  headers?: Record<string, string>,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: headers ?? {},
      });
      clearTimeout(tid);

      if (res.ok) {
        const text = await res.text();
        if (text.includes(expectedBody)) return;
        lastError = `Body did not include "${expectedBody}". Got: ${text.slice(0, 120)}`;
      } else {
        lastError = `HTTP ${res.status}`;
      }
    } catch (err) {
      lastError = (err as Error).message;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  fail(step, `Timeout after ${timeoutMs}ms. Last error: ${lastError}`);
}

/**
 * Sends a JSON request and returns the parsed body.
 */
async function jsonRequest(
  method: string,
  url: string,
  body?: unknown,
  bearerToken?: string,
): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: ctrl.signal,
  });
  clearTimeout(tid);
  return { status: res.status, body: await res.json() };
}

/**
 * Runs a root npm script and resolves/rejects based on exit code.
 */
async function runNpmScript(
  script: string,
  env: NodeJS.ProcessEnv,
  _step: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("npm", ["run", script], {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    proc.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`npm run ${script} exited ${code}.\n${stderr.slice(-800)}`),
        );
      }
    });
    proc.on("error", (err) => reject(err));
  });
}

/**
 * Spawns the dev server as a subprocess and returns the process handle.
 */
function spawnServer(env: NodeJS.ProcessEnv): ChildProcess {
  const proc = spawn("npm", ["run", "dev"], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  proc.stdout?.on("data", (_d: Buffer) => {
    // Suppress noisy server output; errors surface via poll timeout.
  });
  proc.stderr?.on("data", (_d: Buffer) => {
    // Same — only surface if poll fails.
  });
  return proc;
}

/**
 * Kills the server process (SIGTERM then SIGKILL after 3s).
 */
async function killServer(): Promise<void> {
  if (!serverProcess) return;
  serverProcess.kill("SIGTERM");
  await sleep(3_000);
  if (!serverProcess.killed) serverProcess.kill("SIGKILL");
  serverProcess = null;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startedAt = Date.now();
  log("smoke:fresh-clone starting…");

  // Check Docker availability early with a short timeout
  log("Step 0 — checking Docker availability…");
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("docker", ["info"], { stdio: "ignore" });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            "Docker is not running or not in PATH. Start Docker Desktop and retry.",
          ),
        );
    });
    proc.on("error", () =>
      reject(
        new Error(
          "docker binary not found. Install Docker and make sure it is in PATH.",
        ),
      ),
    );
  }).catch((err: Error) => fail("docker-check", err.message));

  // Step 1 — start ephemeral Postgres container
  log("Step 1 — starting ephemeral Postgres container…");
  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .start()
    .catch((err: Error) =>
      fail(
        "container-start",
        `Failed to start Postgres container: ${err.message}`,
      ),
    );

  const DATABASE_URL = container.getConnectionUri();
  log(
    `         DATABASE_URL set (container port ${container.getFirstMappedPort()})`,
  );

  const serverEnv: NodeJS.ProcessEnv = {
    DATABASE_URL,
    PORT: String(SERVER_PORT),
    NODEPRESS_ADMIN_TOKEN: ADMIN_TOKEN,
  };

  try {
    // Step 2 — apply schema via drizzle push
    log("Step 2 — running db:drizzle:push…");
    await runNpmScript(
      "db:drizzle:push",
      { DATABASE_URL },
      "db:drizzle:push",
    ).catch((err: Error) =>
      fail(
        "db:drizzle:push",
        `Schema push failed. Is packages/db/drizzle.config.ts correct? ${err.message}`,
      ),
    );

    // Step 3 — spawn dev server
    log("Step 3 — spawning dev server on port " + SERVER_PORT + "…");
    serverProcess = spawnServer(serverEnv);
    serverProcess.on("error", (err) =>
      fail("server-spawn", `Failed to spawn dev server: ${err.message}`),
    );

    // Step 4 — wait for server to respond with "Hello NodePress"
    log(
      `Step 4 — polling ${SERVER_URL}/ (timeout ${SERVER_BOOT_TIMEOUT_MS / 1000}s)…`,
    );
    await pollUntil(
      `${SERVER_URL}/`,
      "Hello NodePress",
      SERVER_BOOT_TIMEOUT_MS,
      "server-boot",
    );
    log("         Server up.");

    // Step 5 — GET /wp/v2/posts must return empty array
    log("Step 5 — GET /wp/v2/posts → expect []…");
    const listResult = (await jsonRequest(
      "GET",
      `${SERVER_URL}/wp/v2/posts`,
    ).catch((err: Error) =>
      fail("get-posts-empty", `Request failed: ${err.message}`),
    )) as { status: number; body: unknown };

    if (listResult.status !== 200)
      fail("get-posts-empty", `Expected 200, got ${listResult.status}`);
    if (!Array.isArray(listResult.body) || listResult.body.length !== 0)
      fail(
        "get-posts-empty",
        `Expected [], got: ${JSON.stringify(listResult.body).slice(0, 200)}`,
      );
    log("         OK — empty list.");

    // Step 6 — POST a new post
    log("Step 6 — POST /wp/v2/posts with bearer token…");
    const createResult = (await jsonRequest(
      "POST",
      `${SERVER_URL}/wp/v2/posts`,
      { title: "smoke", content: "test" },
      ADMIN_TOKEN,
    ).catch((err: Error) =>
      fail("post-create", `Request failed: ${err.message}`),
    )) as { status: number; body: Record<string, unknown> };

    if (createResult.status !== 201)
      fail(
        "post-create",
        `Expected 201, got ${createResult.status}. Body: ${JSON.stringify(createResult.body).slice(0, 300)}`,
      );

    const postId = createResult.body["id"];
    if (typeof postId !== "number")
      fail(
        "post-create",
        `Response missing numeric 'id'. Got: ${JSON.stringify(createResult.body).slice(0, 200)}`,
      );
    log(`         Created post id=${postId}.`);

    // Step 7 — GET the created post and verify shape
    log(`Step 7 — GET /wp/v2/posts/${postId} and verify shape…`);
    const getResult = (await jsonRequest(
      "GET",
      `${SERVER_URL}/wp/v2/posts/${postId}`,
    ).catch((err: Error) =>
      fail("post-get", `Request failed: ${err.message}`),
    )) as { status: number; body: Record<string, unknown> };

    if (getResult.status !== 200)
      fail("post-get", `Expected 200, got ${getResult.status}`);

    const post = getResult.body;
    const requiredFields = ["id", "title", "content", "status", "date", "slug"];
    for (const field of requiredFields) {
      if (!(field in post))
        fail(
          "post-shape",
          `Missing required field '${field}' in GET response. Keys present: ${Object.keys(post).join(", ")}`,
        );
    }

    // Verify title rendered object (DIV-002)
    const title = post["title"] as Record<string, unknown>;
    if (typeof title !== "object" || typeof title["rendered"] !== "string")
      fail(
        "post-shape",
        `'title' must be {rendered: string, ...} (DIV-002). Got: ${JSON.stringify(title)}`,
      );

    // Verify _nodepress namespace (DIV-005)
    if (typeof post["_nodepress"] !== "object")
      fail(
        "post-shape",
        `'_nodepress' namespace missing (DIV-005). Keys present: ${Object.keys(post).join(", ")}`,
      );

    log("         Shape OK.");

    const ttfa = ((Date.now() - startedAt) / 1000).toFixed(1);
    process.stdout.write(`\n✅ PASS — TTFA ${ttfa}s\n\n`);
  } finally {
    log("Cleanup — stopping server and container…");
    await killServer();
    await container.stop().catch(() => {
      /* best-effort */
    });
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`\n❌ FAIL [unexpected]: ${msg}\n`);
  process.exit(1);
});
