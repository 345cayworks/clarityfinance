import { createHash, timingSafeEqual } from "crypto";

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string) {
  const input = Buffer.from(hashPassword(password));
  const stored = Buffer.from(hash);
  if (input.length !== stored.length) return false;
  return timingSafeEqual(input, stored);
}
