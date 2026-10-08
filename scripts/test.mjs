// `npm test`: nyalain server HTTP di port & token acak, jalanin skenario smoke, lalu matiin server.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";

const token = randomBytes(16).toString("hex");

// Minta port kosong ke OS
const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});

const server = spawn(process.execPath, ["src/http.mjs"], {
  env: { ...process.env, MCP_TOKEN: token, PORT: String(port), HOST: "127.0.0.1", ALLOWED_HOSTS: "" },
  stdio: ["ignore", "inherit", "inherit"],
});
let serverExited = false;
server.once("exit", () => { serverExited = true; });

const base = `http://127.0.0.1:${port}`;
let up = false;
for (let i = 0; i < 50 && !serverExited; i++) {
  try {
    if ((await fetch(`${base}/health`)).ok) { up = true; break; }
  } catch { /* belum naik */ }
  await new Promise((r) => setTimeout(r, 200));
}
if (!up) {
  console.error("Server HTTP nggak naik.");
  server.kill();
  process.exit(1);
}

const smoke = spawn(process.execPath, ["scripts/smoke.mjs"], {
  env: { ...process.env, MCP_URL: `${base}/mcp`, MCP_TOKEN: token },
  stdio: "inherit",
});
const code = await new Promise((resolve) => smoke.once("exit", resolve));
server.kill();
process.exit(code ?? 1);
