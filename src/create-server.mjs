import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

// "Content Lake" ala ala: ganti sama DB / file / API lu sendiri.
// Sengaja di level modul (bukan di dalam createServer) karena di mode HTTP
// createServer() dipanggil ulang tiap request, jadi datanya harus tahan di luar.
const store = new Map([
  ["post-1", { _id: "post-1", _type: "post", title: "Halo MCP", body: "Tool = fungsi + deskripsi + schema input." }],
  ["post-2", { _id: "post-2", _type: "post", title: "Soal GROQ", body: "GROQ itu bahasa query-nya Sanity." }],
]);

const asText = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });

// Dipakai bareng sama stdio.mjs (lokal) dan http.mjs (remote).
export function createServer() {
  const server = new McpServer({ name: "sanity-ala-ala", version: "0.1.0" });

  server.registerTool(
    "query_documents",
    {
      description:
        "Cari dokumen. Balikin ringkasan (_id, _type, title) aja, bukan isi lengkap. " +
        "Pakai get_document kalau butuh body-nya.",
      inputSchema: z.object({
        type: z.string().optional().describe("Filter _type, mis. 'post'"),
        search: z.string().optional().describe("Kata yang dicari di title/body"),
      }),
    },
    async ({ type, search }) => {
      const q = search?.toLowerCase();
      const hits = [...store.values()]
        .filter((d) => !type || d._type === type)
        .filter((d) => !q || `${d.title} ${d.body}`.toLowerCase().includes(q))
        .map(({ _id, _type, title }) => ({ _id, _type, title }));
      return asText(hits);
    },
  );

  server.registerTool(
    "get_document",
    {
      description: "Ambil satu dokumen lengkap berdasarkan _id persis.",
      inputSchema: z.object({ id: z.string().describe("_id dokumen") }),
    },
    async ({ id }) => {
      const doc = store.get(id);
      return doc
        ? asText(doc)
        : { isError: true, content: [{ type: "text", text: `Dokumen '${id}' nggak ada.` }] };
    },
  );

  return server;
}
