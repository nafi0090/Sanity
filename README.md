# sanity-ala-ala

MCP server mini "ala Sanity": nyediain dokumen lewat tools (`query_documents`, `get_document`) yang bisa dipanggil AI seperti Claude. Dibuat pakai TypeScript SDK MCP v2 (`@modelcontextprotocol/server`), butuh Node 20+.

Data-nya masih `Map` di memori (`src/create-server.mjs`). Ganti dengan DB/file/API lu sendiri.

## Jalanin

**Lokal (stdio)**: Claude Code yang nyalain prosesnya.

```bash
npm install
claude mcp add sanity-ala-ala -- node /path/ke/src/stdio.mjs
```

**Server HTTP (remote)**:

```bash
MCP_TOKEN=<token-acak> npm start     # http://127.0.0.1:3000/mcp, cek hidup di /health
```

| Env             | Default     | Keterangan                                                                  |
| --------------- | ----------- | --------------------------------------------------------------------------- |
| `MCP_TOKEN`     | (wajib)     | Bearer token. Server nolak start tanpa ini.                                 |
| `PORT`          | `3000`      |                                                                             |
| `HOST`          | `127.0.0.1` | Di container/PaaS biasanya `0.0.0.0` (sudah diset di Dockerfile).           |
| `ALLOWED_HOSTS` | kosong      | Hostname publik yang boleh, pisah koma. Kosong = Host/Origin nggak dicek.   |

Bikin token: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Pakai dari Claude Code:

```bash
claude mcp add --transport http sanity-ala-ala https://<host>/mcp --header "Authorization: Bearer <token>"
```

Taruh server di belakang HTTPS (reverse proxy atau platform hosting). Jangan kirim token lewat HTTP polos di internet.

## Tes

- `npm test`: nyalain server di port + token acak, jalanin skenario (auth, tools), lalu matiin.
- `MCP_URL=https://<host>/mcp MCP_TOKEN=<token> npm run smoke`: skenario yang sama ke server yang udah ke-deploy.

## CI/CD

Workflow: `.github/workflows/ci-cd.yml`

| Kapan                | Ngapain                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| PR dan push ke `main` | `npm test`, lalu build image Docker dan tes containernya                |
| push ke `main`       | publish image ke GHCR: `ghcr.io/nafi0090/sanity:latest` dan `:sha-xxxxxxx` |

Jalanin image di server mana pun yang ada Docker:

```bash
docker run -d --restart unless-stopped -p 127.0.0.1:3000:3000 \
  -e MCP_TOKEN=<token> ghcr.io/nafi0090/sanity:latest
```

Package GHCR default-nya private: `docker login ghcr.io` dulu (pakai token yang punya `read:packages`), atau ubah visibility package jadi Public di GitHub.

Platform seperti Render, Railway, atau Fly biasanya bisa connect langsung ke repo ini dan build dari `Dockerfile` (isi env `MCP_TOKEN`), jadi tiap push ke `main` ke-deploy otomatis.
