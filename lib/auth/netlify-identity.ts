"use client";

import {
  AuthError,
  MissingIdentityError,
  getUser,
  handleAuthCallback,
  login as identityLogin,
  logout as identityLogout,
  onAuthChange,
  requestPasswordRecovery,
  signup as identitySignup,
  updateUser,
  type CallbackResult,
  type User
} from "@netlify/identity";

export type IdentityUser = User;
export type AuthCallbackResult = CallbackResult;

export {
  AuthError,
  MissingIdentityError,
  getUser,
  handleAuthCallback,
  onAuthChange,
  requestPasswordRecovery,
  updateUser
};

export async function loginWithEmail(email: string, password: string) {
  return identityLogin(email.trim(), password);
}

export async function signupWithEmail(email: string, password: string, name: string) {
  return identitySignup(email.trim(), password, name ? { full_name: name } : undefined);
}

export async function logout() {
  await identityLogout();
}

type JwtCapableUser = User & {
  jwt?: (forceRefresh?: boolean) => Promise<string>;
};

function getCookieValue(name: string) {
  if (typeof document === "undefined") return null;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export async function getIdentityToken(user?: IdentityUser | null) {
  const currentUser = user ?? (await getUser());
  const jwt = (currentUser as JwtCapableUser | null)?.jwt;

  if (typeof jwt === "function") {
    const token = await jwt.call(currentUser, true);
    if (token.trim()) return token;
  }

  return getCookieValue("nf_jwt");
}

export function describeAuthError(error: unknown): string {
  if (error instanceof MissingIdentityError) {
    return "Identity is not enabled on this site yet.";
  }
  if (error instanceof AuthError) {
    switch (error.status) {
      case 400:
        return "Invalid request. Please check your input and try again.";
      case 401:
        return "Invalid email or password.";
      case 403:
        return "Sign ups are currently disabled. Please contact support.";
      case 404:
        return "Account not found.";
      case 409:
      case 422:
        return error.message || "An account with that email may already exist.";
      default:
        return error.message || "Something went wrong. Please try again.";
    }
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
