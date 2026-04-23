import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const normalizeSupabaseUrl = (rawUrl: string) => rawUrl.replace(/\/rest\/v1\/?$/, "");

export const createClient = () =>
  createSupabaseClient(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
