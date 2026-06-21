import { NextResponse } from "next/server";
import {
  getPlansAdmin,
  createPlan,
  updatePlan,
  deletePlan,
} from "@github-pr-code-smell-detector/core/db/admin";
import { requireAdmin } from "@/lib/api-auth";
import { handleDbError } from "@/lib/api-error";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json({ data: await getPlansAdmin() });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const plan = await createPlan(body);
    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (e) {
    return handleDbError(e);
  }
}

export async function PATCH(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id, ...data } = await req.json();
    const plan = await updatePlan(id, data);
    return NextResponse.json({ data: plan });
  } catch (e) {
    return handleDbError(e);
  }
}

export async function DELETE(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = await req.json();
    await deletePlan(id);
    return NextResponse.json({ data: { id } });
  } catch (e) {
    return handleDbError(e);
  }
}
