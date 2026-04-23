import { createHash, timingSafeEqual } from "crypto";

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, passwordHash: string) {
  const incoming = Buffer.from(hashPassword(password));
  const stored = Buffer.from(passwordHash);
  if (incoming.length !== stored.length) return false;
  return timingSafeEqual(incoming, stored);
}
