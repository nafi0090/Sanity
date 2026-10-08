// Tes cepat server HTTP (lokal maupun yang udah di-deploy).
//   PowerShell: $env:MCP_URL='https://host/mcp'; $env:MCP_TOKEN='...'; npm run smoke
const url = process.env.MCP_URL ?? "http://127.0.0.1:3000/mcp";
const token = process.env.MCP_TOKEN;
if (!token) {
  console.error("Isi MCP_TOKEN dulu.");
  process.exit(1);
}

let nextId = 0;
async function rpc(method, params, { auth = true } = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(auth && { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++nextId, method, params }),
  });
  const text = await res.text();
  // Respons bisa JSON biasa atau SSE ("data: {...}")
  let payload = null;
  if (text) {
    const raw = res.headers.get("content-type")?.includes("text/event-stream")
      ? text.split("\n").find((l) => l.startsWith("data:"))?.slice(5)
      : text;
    try { payload = raw ? JSON.parse(raw) : null; } catch { payload = { unparsable: text.slice(0, 200) }; }
  }
  return { status: res.status, payload };
}

let failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "OK   " : "GAGAL"} ${name}${extra ? "  " + extra : ""}`);
  if (!ok) failed++;
};

const health = await fetch(new URL("/health", url));
check("GET /health", health.status === 200);

const noToken = await rpc("tools/list", {}, { auth: false });
check("tanpa token ditolak (401)", noToken.status === 401, `status=${noToken.status}`);

const init = await rpc("initialize", {
  protocolVersion: "2025-11-25",
  capabilities: {},
  clientInfo: { name: "smoke", version: "0" },
});
check("initialize", init.payload?.result?.serverInfo?.name === "sanity-ala-ala", `status=${init.status}`);

const list = await rpc("tools/list", {});
const names = list.payload?.result?.tools?.map((t) => t.name) ?? [];
check("tools/list", names.includes("query_documents") && names.includes("get_document"), JSON.stringify(names));

const q = await rpc("tools/call", { name: "query_documents", arguments: { search: "groq" } });
check("query_documents", q.payload?.result?.content?.[0]?.text?.includes("post-2") === true);

const ok = await rpc("tools/call", { name: "get_document", arguments: { id: "post-1" } });
check("get_document (ada)", ok.payload?.result?.content?.[0]?.text?.includes("Halo MCP") === true);

const miss = await rpc("tools/call", { name: "get_document", arguments: { id: "nope" } });
check("get_document (nggak ada) -> isError", miss.payload?.result?.isError === true);

console.log(failed ? `\n${failed} tes gagal` : "\nsemua lolos");
process.exit(failed ? 1 : 0);
