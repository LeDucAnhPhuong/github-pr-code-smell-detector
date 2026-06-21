import { NextResponse } from "next/server";
import {
  getFrameworks,
  createFramework,
  updateFramework,
  deleteFramework,
} from "@github-pr-code-smell-detector/core/db/admin";
import { requireAdmin } from "@/lib/api-auth";
import { handleDbError } from "@/lib/api-error";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json({ data: await getFrameworks() });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const fw = await createFramework(body);
    return NextResponse.json({ data: fw }, { status: 201 });
  } catch (e) {
    return handleDbError(e);
  }
}

export async function PATCH(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id, ...data } = await req.json();
    const fw = await updateFramework(id, data);
    return NextResponse.json({ data: fw });
  } catch (e) {
    return handleDbError(e);
  }
}

export async function DELETE(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = await req.json();
    await deleteFramework(id);
    return NextResponse.json({ data: { id } });
  } catch (e) {
    return handleDbError(e);
  }
}
