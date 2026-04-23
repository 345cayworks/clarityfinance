import { createBrowserClient } from "@supabase/ssr";

const normalizeSupabaseUrl = (rawUrl: string) => rawUrl.replace(/\/rest\/v1\/?$/, "");

export function createClient() {
  return createBrowserClient(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}
