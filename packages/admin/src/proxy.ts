import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Admin has its OWN login (port 3002). Next.js 16 "proxy" runs in the Node.js
// runtime, so the Auth.js Prisma (pg) adapter with database sessions works here.
export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;
  const isLoggedIn = !!session?.user;
  const isAdmin = session?.user?.role === "ADMIN";

  // Public routes: the login page and the Auth.js endpoints.
  if (path === "/login" || path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (isLoggedIn && isAdmin) {
    return NextResponse.next();
  }

  // API (other than /api/auth): structured 403.
  if (path.startsWith("/api")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Admin access required" } },
      { status: 403 }
    );
  }

  // Pages: send to admin's own login.
  const loginUrl = new URL("/login", nextUrl.origin);
  if (isLoggedIn && !isAdmin) {
    loginUrl.searchParams.set("error", "AccessDenied");
  }
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
