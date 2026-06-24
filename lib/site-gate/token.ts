const GATE_PAYLOAD = "aftertheparks-site-gate-v1";

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function timingSafeEqualString(a: string, b: string): boolean {
  return timingSafeEqual(a, b);
}

async function hmacHex(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(GATE_PAYLOAD));
  return bytesToHex(sig);
}

export async function createGateCookieValue(password: string): Promise<string> {
  return hmacHex(password);
}

export async function isValidGateCookie(
  value: string | undefined,
  password: string | undefined
): Promise<boolean> {
  if (!value || !password) return false;
  const expected = await createGateCookieValue(password);
  return timingSafeEqual(value, expected);
}
