import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { PermissionAlert } from "@/components/layout/PermissionAlert";
import { getGithubPermissions, getMissingPermissions } from "@/lib/github-permissions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN";

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
    select: { scope: true },
  });
  const missingPermissions = getMissingPermissions(getGithubPermissions(account?.scope));

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-app-bg)" }}>
      <Sidebar isAdmin={isAdmin} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <PermissionAlert missing={missingPermissions} />
    </div>
  );
}
