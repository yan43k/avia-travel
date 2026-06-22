import crypto from "crypto";

export function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}
