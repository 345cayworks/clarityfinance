export const USER_ID_HEADER = "x-clarity-user";
export const BROWSER_USER_KEY = "clarity-finance-user-id";

export function getBrowserUserId() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(BROWSER_USER_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(BROWSER_USER_KEY, created);
  return created;
}
