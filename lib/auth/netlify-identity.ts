"use client";

type IdentityUser = {
  jwt: () => Promise<string>;
};

type IdentityEvent = "login" | "signup" | "init";

type IdentityWidget = {
  init: () => void;
  open: (panel: "login" | "signup") => void;
  logout: () => void;
  currentUser: () => IdentityUser | null;
  on: (event: IdentityEvent, cb: (user?: IdentityUser | null) => void) => void;
  off: (event: IdentityEvent, cb: (user?: IdentityUser | null) => void) => void;
};

declare global {
  interface Window {
    netlifyIdentity?: IdentityWidget;
  }
}

let identity: IdentityWidget | null = null;
let initialized = false;

export async function initIdentity() {
  if (typeof window === "undefined") return null;

  if (!window.netlifyIdentity) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://identity.netlify.com/v1/netlify-identity-widget.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Netlify Identity widget."));
      document.head.appendChild(script);
    }).catch(() => undefined);
  }

  if (!window.netlifyIdentity) return null;

  identity = window.netlifyIdentity;

  if (!initialized) {
    identity.init();
    initialized = true;
  }

  return identity;
}

export function getCurrentUser() {
  return identity?.currentUser() ?? null;
}

export async function getIdentityToken() {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  try {
    return await currentUser.jwt();
  } catch {
    return null;
  }
}

async function openWidget(screen: "login" | "signup") {
  const widget = await initIdentity();
  if (!widget) return;
  widget.open(screen);
}

export async function openLogin() {
  await openWidget("login");
}

export async function openSignup() {
  await openWidget("signup");
}

export async function logoutIdentity() {
  const widget = await initIdentity();
  if (!widget) return;
  widget.logout();
}

export async function onIdentityEvent(event: IdentityEvent, cb: (user?: IdentityUser | null) => void) {
  const widget = await initIdentity();
  if (!widget) return () => undefined;

  widget.on(event, cb);
  return () => {
    widget.off(event, cb);
  };
}
