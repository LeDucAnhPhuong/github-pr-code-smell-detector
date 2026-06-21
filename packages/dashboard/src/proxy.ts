import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Next.js 16 renamed "middleware" to "proxy". It runs in the Node.js runtime,
// which lets Auth.js use the Prisma (pg) adapter with database sessions here.
// Admin routes moved to their own app (packages/admin); this only guards the
// dashboard itself.
export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isDashboardRoute =
    !nextUrl.pathname.startsWith("/login") &&
    !nextUrl.pathname.startsWith("/api/auth") &&
    !nextUrl.pathname.startsWith("/api/webhooks") &&
    // Public plan catalogue, read by the marketing landing site.
    !nextUrl.pathname.startsWith("/api/plans");

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
