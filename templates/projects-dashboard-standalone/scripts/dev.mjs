import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sirv from "sirv";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT_ATTEMPTS = 10;

function requestedPort() {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--port") {
      const value = argv[++i];
      if (value !== undefined) return { port: Number(value), strict: true };
    } else if (arg.startsWith("--port=")) {
      return { port: Number(arg.slice("--port=".length)), strict: true };
    }
  }
  const fromEnv = process.env.PORT ? Number(process.env.PORT) : 8080;
  return { port: fromEnv, strict: false };
}

function isFree(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port, "localhost");
  });
}

// A second dev server must not fight the first one over a port: move up, and say so.
async function resolvePort() {
  const { port: requested, strict } = requestedPort();
  if (await isFree(requested)) return requested;

  if (strict) {
    console.error(
      `Port ${requested} is already in use - stop the other process, ` +
        "pass another --port, or omit --port to use the next free port.",
    );
    process.exit(1);
  }

  const last = requested + PORT_ATTEMPTS - 1;
  for (let candidate = requested + 1; candidate <= last; candidate++) {
    if (await isFree(candidate)) {
      console.log(`Port ${requested} is in use, using ${candidate} instead.`);
      return candidate;
    }
  }

  console.error(
    `Ports ${requested}-${last} are all in use - ` +
      "free one of them or pass --port <n>.",
  );
  process.exit(1);
}

const port = await resolvePort();
const entryUrl = "/src/index.tsx";

await import("./compile-i18n.mjs");

const extraOrigins = (process.env.CROWDIN_DEV_CORS_ORIGIN ?? "")
  .split(/[\s,]+/)
  .filter(Boolean)
  .map((origin) => origin.replace(/\/+$/, ""));
const corsAllowlist = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[^/]+\.bundle\.crowdin\.net$/,
  ...extraOrigins,
];
const originAllowed = (origin) =>
  corsAllowlist.some((rule) =>
    typeof rule === "string" ? rule === origin : rule.test(origin),
  );
const applyCors = (req, res) => {
  const origin = req.headers.origin;
  if (typeof origin === "string" && originAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
};

const server = http.createServer();

// Hand Vite this server so HMR shares the app's port instead of Vite's own fixed 24678.
const vite = await createServer({
  root,
  configFile: path.join(root, "vite.config.ts"),
  appType: "custom",
  server: {
    middlewareMode: true,
    ws: { server, host: "localhost", protocol: "ws" },
    cors: { origin: corsAllowlist },
  },
});

const locales = sirv(path.join(root, "dist"), { dev: true });

// The host loads /app.js via a classic <script>: hand-roll the react-refresh preamble + Vite client.
const bootstrap = `(async () => {
  const r = await import("http://localhost:${port}/@react-refresh");
  r.injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => (t) => t;
  window.__vite_plugin_react_preamble_installed__ = true;
  await import("http://localhost:${port}/@vite/client");
  await import("http://localhost:${port}${entryUrl}");
})();`;

server.on("request", (req, res) => {
  if (req.url === "/app.js") {
    res.setHeader("Content-Type", "text/javascript");
    applyCors(req, res);
    res.end(bootstrap);
    return;
  }
  if (req.url?.startsWith("/locales/")) {
    applyCors(req, res);
    return locales(req, res, () => vite.middlewares(req, res));
  }
  vite.middlewares(req, res);
});

const shutdown = () => {
  server.closeAllConnections();
  server.close();
  void vite.close().finally(() => process.exit(0));
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

server.once("error", (err) => {
  const message =
    err.code === "EADDRINUSE"
      ? `Port ${port} is already in use - stop the other process or pass --port <n>.`
      : err.message;
  console.error(message);
  void vite.close().finally(() => process.exit(1));
});

server.listen(port, "localhost", () =>
  console.log(`standalone dev server: http://localhost:${port}/app.js`),
);
