"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const supabase = useMemo(() => createClient(), []);

  async function signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signUp(email: string, password: string) {
    return supabase.auth.signUp({ email, password });
  }

  async function signOut() {
    return supabase.auth.signOut();
  }

  return { supabase, signIn, signUp, signOut };
}
