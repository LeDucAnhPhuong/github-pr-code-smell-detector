import { NextResponse } from "next/server";

// Translate DB/domain errors into structured JSON responses.
export function handleDbError(e: unknown): NextResponse {
  if (e && typeof e === "object") {
    const name = (e as { name?: string }).name;
    const code = (e as { code?: string }).code;

    // Delete blocked by existing references (ReferenceConstraintError from core).
    if (name === "ReferenceConstraintError") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: (e as Error).message } },
        { status: 409 }
      );
    }
    // Prisma unique constraint violation.
    if (code === "P2002") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Giá trị đã tồn tại (trùng tên)." } },
        { status: 409 }
      );
    }
    // Prisma record not found.
    if (code === "P2025") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Không tìm thấy bản ghi." } },
        { status: 404 }
      );
    }
  }
  console.error("[admin api] unexpected error:", e);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Có lỗi xảy ra, vui lòng thử lại." } },
    { status: 500 }
  );
}
