"use client";

export function useAuth() {
  return {
    supabase: null,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => ({ error: null })
  };
}
