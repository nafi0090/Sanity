// Cek header "Authorization: Bearer <token>" tanpa bocor lewat selisih waktu:
// kedua sisi di-hash dulu biar panjangnya sama, baru dibandingin penuh.
const sha256 = async (s) =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));

export async function isAuthorized(authorizationHeader, expectedToken) {
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader ?? "");
  if (!match) return false;
  const [a, b] = await Promise.all([sha256(match[1]), sha256(expectedToken)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
