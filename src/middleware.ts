import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Maintenance mode ──────────────────────────────────────────────
  // Redirect every page request to /maintenance when flag is enabled.
  // Excludes: /maintenance itself, /api/* routes, static assets.
  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE === "true";
  const isMaintenancePage = pathname === "/maintenance";
  const isApi = pathname.startsWith("/api/");
  const isStatic =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/fonts/") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css");

  if (isMaintenance && !isMaintenancePage && !isApi && !isStatic) {
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }
  // ─────────────────────────────────────────────────────────────────

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  const origin = request.headers.get("origin");
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  } else {
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
