import type { Metadata } from "next";
import { getUsers } from "@github-pr-code-smell-detector/core/db/users";
import { auth } from "@/lib/auth";
import { UsersClient } from "./users-client";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const [users, session] = await Promise.all([getUsers(), auth()]);
  const initial = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role as "USER" | "ADMIN",
    createdAt: u.createdAt.toISOString(),
    repositories: u._count.repositories,
    planName: u.subscription?.plan?.name ?? null,
    subscriptionStatus: u.subscription?.status ?? null,
  }));
  return <UsersClient initial={initial} currentUserId={session!.user.id} />;
}
