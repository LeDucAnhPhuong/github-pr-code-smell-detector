import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Next.js 16 renamed "middleware" to "proxy". Unlike the old Edge-only
// middleware, proxy runs in the Node.js runtime by default, which lets Auth.js
// use the Prisma (pg) adapter with database sessions here.
export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isAdminRoute =
    nextUrl.pathname.startsWith("/admin") ||
    nextUrl.pathname.startsWith("/api/admin");
  const isDashboardRoute =
    !nextUrl.pathname.startsWith("/login") &&
    !nextUrl.pathname.startsWith("/api/auth") &&
    !nextUrl.pathname.startsWith("/api/webhooks");

  // Admin routes: require ADMIN role
  if (isAdminRoute) {
    if (!isLoggedIn || session?.user?.role !== "ADMIN") {
      if (nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Admin access required" } },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  // Dashboard routes: require authentication
  if (isDashboardRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in → redirect from login to dashboard
  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
