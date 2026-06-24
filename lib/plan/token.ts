import { createHash, randomBytes } from "crypto";

const TOKEN_BYTES = 32;

export function generateShareToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function redactTokenFromPath(pathname: string): string {
  return pathname.replace(/\/p\/[^/]+/, "/p/[redacted]");
}
