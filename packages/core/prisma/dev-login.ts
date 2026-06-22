/**
 * Local-only dev login bypass.
 *
 * Auth uses the database session strategy, so a valid login is just a `Session`
 * row whose `sessionToken` matches the `authjs.session-token` cookie. This script
 * upserts a dev user (+ Free subscription) and a long-lived session, then prints
 * a browser-console snippet to set the cookie — no GitHub OAuth needed.
 *
 *   npm run db:dev-login -w packages/core
 *
 * Optional env:
 *   DEV_EMAIL   (default dev@local.test)
 *   DEV_ROLE    USER | ADMIN  (default ADMIN)
 *   DEV_GH_TOKEN  a GitHub PAT to store as the user's OAuth token (lets the
 *                 legacy user-token GitHub calls work; the App pipeline still
 *                 needs a real installation + GITHUB_APP_* creds).
 */
import "dotenv/config";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.DEV_EMAIL ?? "dev@local.test";
  const role = (process.env.DEV_ROLE ?? "ADMIN") as "USER" | "ADMIN";

  const user = await prisma.user.upsert({
    where: { email },
    update: { role },
    create: { email, name: "Dev User", role },
  });

  // Ensure a Free subscription (createUser event won't fire for this manual insert).
  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { name: "Free" } });
  if (freePlan) {
    await prisma.tenantSubscription.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        planId: freePlan.id,
        status: "ACTIVE",
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  } else {
    console.warn("⚠  No 'Free' plan found — run `npm run db:seed -w packages/core` first.");
  }

  // Optionally store a GitHub PAT as the user's OAuth account token.
  const ghToken = process.env.DEV_GH_TOKEN;
  if (ghToken) {
    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: "github", providerAccountId: `dev-${user.id}` } },
      update: { access_token: ghToken },
      create: {
        userId: user.id,
        type: "oauth",
        provider: "github",
        providerAccountId: `dev-${user.id}`,
        access_token: ghToken,
      },
    });
  }

  const sessionToken = randomUUID() + randomUUID().replace(/-/g, "");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });

  const cookieName = "authjs.session-token"; // http localhost (no __Secure- prefix)

  console.log("\n✅ Dev session created");
  console.log(`   user:  ${email} (${role})  id=${user.id}`);
  console.log(`   expires: ${expires.toISOString()}`);
  console.log("\n── To log in ──────────────────────────────────────────────");
  console.log("1. Open http://localhost:3000 in your browser.");
  console.log("2. Open DevTools → Console and paste:\n");
  console.log(`   document.cookie = "${cookieName}=${sessionToken}; path=/; max-age=2592000"`);
  console.log("\n3. Refresh the page — you're logged in.");
  console.log("───────────────────────────────────────────────────────────\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
