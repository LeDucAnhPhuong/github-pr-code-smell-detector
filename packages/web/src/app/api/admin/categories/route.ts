import { auth } from "@/lib/auth";
import { getCategories, updateCategory } from "@/lib/db/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
  }
  const categories = await getCategories();
  return NextResponse.json({ data: categories });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
  }
  const { id, ...data } = await req.json();
  const cat = await updateCategory(id, data);
  return NextResponse.json({ data: cat });
}
