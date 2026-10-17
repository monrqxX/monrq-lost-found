import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = loadEnv("development", root, "VITE_");
const apiTarget = process.env.VITE_API_PROXY || env.VITE_API_PROXY || "http://localhost:8787";
const healthUrl = new URL("/api/health", apiTarget).toString();
const apiEntry = path.join(root, "server", "index.js");
const viteEntry = path.join(root, "node_modules", "vite", "bin", "vite.js");
const children = new Set();
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) child.kill();
}

function start(name, args, cwd) {
  const child = spawn(process.execPath, args, { cwd, stdio: "inherit", windowsHide: true });
  children.add(child);
  child.once("error", error => {
    console.error(`[${name}] could not start: ${error.message}`);
    stop(1);
  });
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (!stopping) {
      console.error(`[${name}] stopped${signal ? ` (${signal})` : ` with exit code ${code ?? 1}`}.`);
      stop(code ?? 1);
    }
  });
  return child;
}

async function apiIsReady(timeoutMs = 1500) {
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return false;
    const health = await response.json();
    return health?.ok === true;
  } catch {
    return false;
  }
}

async function waitForApi(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !stopping) {
    if (await apiIsReady()) return true;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  return false;
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

if (await apiIsReady()) {
  console.log(`[api] already available at ${new URL(healthUrl).origin}`);
} else {
  console.log("[api] starting MongoDB API and waiting for its health check...");
  start("api", ["--watch", apiEntry], path.join(root, "server"));
  if (!(await waitForApi())) {
    console.error("[api] did not become ready within 30 seconds. Check the API and MongoDB startup output above.");
    stop(1);
  }
}

if (!stopping) {
  console.log("[web] starting Vite...");
  start("web", [viteEntry, ...process.argv.slice(2)], root);
}
