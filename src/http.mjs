// Mode remote: server HTTP biasa. Endpoint MCP-nya di POST /mcp, cek hidup di GET /health.
import { createServer as createHttpServer } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { hostHeaderValidation, originValidation, toNodeHandler } from "@modelcontextprotocol/node";
import { createServer } from "./create-server.mjs";
import { isAuthorized } from "./auth.mjs";

const TOKEN = process.env.MCP_TOKEN;
if (!TOKEN) {
  console.error("MCP_TOKEN belum diisi. Server HTTP nggak mau jalan tanpa auth.");
  process.exit(1);
}
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";

// Opsional: kalau ALLOWED_HOSTS diisi, request dengan Host/Origin lain ditolak (403).
const allowedHosts = (process.env.ALLOWED_HOSTS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const checkHost = allowedHosts.length ? hostHeaderValidation(allowedHosts) : null;
const checkOrigin = allowedHosts.length ? originValidation(allowedHosts) : null;

// Tiap request dapet McpServer baru dari factory (stateless), jadi gampang di-scale.
const mcp = createMcpHandler(() => createServer());
const handleMcp = toNodeHandler(mcp, { onerror: (e) => console.error("mcp error:", e) });

const server = createHttpServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");

  if (pathname === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end("ok");
  }
  if (pathname !== "/mcp") {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("not found");
  }

  if (checkHost && !checkHost(req, res)) return;
  if (checkOrigin && !checkOrigin(req, res)) return;

  if (!(await isAuthorized(req.headers.authorization, TOKEN))) {
    res.writeHead(401, {
      "content-type": "application/json",
      "www-authenticate": 'Bearer realm="sanity-ala-ala"',
    });
    return res.end(JSON.stringify({ error: "unauthorized" }));
  }

  await handleMcp(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`sanity-ala-ala (HTTP) jalan di http://${HOST}:${PORT}/mcp`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    server.close();
    await mcp.close();
    process.exit(0);
  });
}
