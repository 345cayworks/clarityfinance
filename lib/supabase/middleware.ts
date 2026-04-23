import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const normalizeSupabaseUrl = (rawUrl: string) => rawUrl.replace(/\/rest\/v1\/?$/, "");

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...(options ?? {}) });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...(options ?? {}) });
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
        }
      }
    }
  );

  await supabase.auth.getUser();
  return response;
}
