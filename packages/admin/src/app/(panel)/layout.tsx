import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

// Guard the whole admin panel. /login and /api/auth live outside this group.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/login?error=AccessDenied");
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
