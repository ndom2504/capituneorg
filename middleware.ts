import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type MaintenanceApi = {
  maintenance: { enabled: boolean; message: string };
  allowBypass: boolean;
};

function isPublicFile(pathname: string) {
  return (
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/uploads/") ||
    pathname.startsWith("/cvs/")
  );
}

function shouldSkipMaintenance(pathname: string) {
  if (pathname.startsWith("/_next")) return true;
  if (isPublicFile(pathname)) return true;

  // Always allow admin area (admins can still operate)
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname === "/maintenance") return true;

  // Allow authentication while site is in maintenance (so admins can log in)
  if (pathname === "/auth") return true;
  if (pathname.startsWith("/api/auth")) return true;

  // Allow admin APIs + the maintenance probe endpoint used by this middleware
  if (pathname.startsWith("/api/admin")) return true;
  if (pathname.startsWith("/api/maintenance")) return true;

  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (shouldSkipMaintenance(pathname)) {
    return NextResponse.next();
  }

  // Ask the server (node runtime) whether maintenance is enabled, and whether
  // the current viewer can bypass it (ADMIN).
  const url = new URL("/api/maintenance", req.nextUrl.origin);

  let data: MaintenanceApi | null = null;
  try {
    const res = await fetch(url, {
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    if (res.ok) {
      data = (await res.json()) as MaintenanceApi;
    }
  } catch {
    // Best effort: if probe fails, do not block.
    return NextResponse.next();
  }

  const enabled = Boolean(data?.maintenance?.enabled);
  const allowBypass = Boolean(data?.allowBypass);

  if (!enabled || allowBypass) {
    return NextResponse.next();
  }

  // Block everything else for non-admins.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: "Maintenance en cours.",
      },
      { status: 503 },
    );
  }

  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = "/maintenance";
  redirectUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/:path*"],
};
