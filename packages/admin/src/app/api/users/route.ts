import { NextResponse } from "next/server";
import { getUsers, updateUserRole } from "@github-pr-code-smell-detector/core/db/users";
import { requireAdmin } from "@/lib/api-auth";
import { handleDbError } from "@/lib/api-error";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json({ data: await getUsers() });
}

export async function PATCH(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  try {
    const { id, role } = await req.json();

    if (role !== "USER" && role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Role không hợp lệ." } },
        { status: 400 }
      );
    }

    // Prevent an admin from demoting themselves (lock-out guard).
    if (id === session.user.id && role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Không thể tự hạ quyền chính mình." } },
        { status: 400 }
      );
    }

    const user = await updateUserRole(id, role);
    return NextResponse.json({ data: { id: user.id, role: user.role } });
  } catch (e) {
    return handleDbError(e);
  }
}
