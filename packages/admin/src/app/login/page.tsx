import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Github, ShieldCheck, ShieldAlert } from "lucide-react";

import { auth, signIn, signOut } from "@github-pr-code-smell-detector/core";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Đăng nhập" };

async function signInAction() {
  "use server";
  await signIn("github", { redirectTo: "/" });
}

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const loggedIn = !!session?.user;
  const isAdmin = session?.user?.role === "ADMIN";

  // Already an admin → go straight to the panel.
  if (loggedIn && isAdmin) {
    redirect("/");
  }

  const deniedRole = loggedIn && !isAdmin; // logged in but not ADMIN
  const accessDenied = deniedRole || params?.error === "AccessDenied";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">MergeTrack Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Đăng nhập để vào bảng quản trị.</p>
        </div>

        {accessDenied && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              Tài khoản{session?.user?.email ? ` ${session.user.email}` : ""} không có quyền admin.
              {deniedRole && " Hãy đăng xuất và dùng tài khoản ADMIN khác."}
            </div>
          </div>
        )}

        {deniedRole ? (
          <form action={signOutAction}>
            <Button type="submit" variant="outline" className="w-full">
              Đăng xuất
            </Button>
          </form>
        ) : (
          <form action={signInAction}>
            <Button type="submit" className="w-full">
              <Github className="h-4 w-4" />
              Đăng nhập với GitHub
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Chỉ tài khoản có quyền <span className="font-medium">ADMIN</span> mới truy cập được.
        </p>
      </div>
    </div>
  );
}
