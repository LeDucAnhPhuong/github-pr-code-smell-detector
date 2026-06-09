import { auth } from "@/lib/auth";
import { getPlansAdmin, updatePlan } from "@/lib/db/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
  }
  const plans = await getPlansAdmin();
  return NextResponse.json({ data: plans });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
  }
  const { id, ...data } = await req.json();
  const plan = await updatePlan(id, data);
  return NextResponse.json({ data: plan });
}
