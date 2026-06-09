import { auth } from "@/lib/auth";
import { getFrameworks, updateFramework } from "@/lib/db/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
  }
  const frameworks = await getFrameworks();
  return NextResponse.json({ data: frameworks });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
  }
  const { id, ...data } = await req.json();
  const fw = await updateFramework(id, data);
  return NextResponse.json({ data: fw });
}
