import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const normalizeSupabaseUrl = (rawUrl: string) => rawUrl.replace(/\/rest\/v1\/?$/, "");

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...(options ?? {}) });
          } catch {
            // Server Components can read cookies but may not write them.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
          } catch {
            // Server Components can read cookies but may not write them.
          }
        }
      }
    }
  );
}
