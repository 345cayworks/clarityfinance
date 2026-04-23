import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/dashboard", "/onboarding", "/calculators", "/scenario", "/action-plan"];

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.get("sb-access-token") || request.cookies.get("sb:token");
  const isProtected = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/calculators/:path*", "/scenario/:path*", "/action-plan/:path*"]
};
