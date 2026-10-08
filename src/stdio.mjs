// Mode lokal: Claude Code nyalain proses ini sendiri dan ngobrol lewat stdin/stdout.
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./create-server.mjs";

await createServer().connect(new StdioServerTransport());
console.error("sanity-ala-ala jalan (stdio)"); // stderr aja, jangan console.log (stdout = protokol)
