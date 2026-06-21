import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/db/payments";
import { buildVietQrUrl, isSepayConfigured, SEPAY_BANK_ACCOUNT, SEPAY_BANK_CODE, SEPAY_ACCOUNT_NAME } from "@/lib/sepay";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }
  if (!isSepayConfigured()) {
    return NextResponse.json(
      { error: { code: "PAYMENTS_DISABLED", message: "Thanh toán chưa được cấu hình" } },
      { status: 503 }
    );
  }

  try {
    const { planId } = await req.json();
    if (!planId || typeof planId !== "string") {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Missing planId" } }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Plan not found" } }, { status: 404 });
    }

    const amount = Math.round(Number(plan.price));
    if (amount <= 0) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Gói miễn phí không cần thanh toán" } },
        { status: 400 }
      );
    }

    const order = await createOrder(session.user.id, plan.id, amount);

    return NextResponse.json(
      {
        data: {
          orderId: order.id,
          amount,
          code: order.code,
          qrUrl: buildVietQrUrl(amount, order.code),
          expiresAt: order.expiresAt,
          bank: {
            account: SEPAY_BANK_ACCOUNT,
            bankCode: SEPAY_BANK_CODE,
            accountName: SEPAY_ACCOUNT_NAME,
          },
        },
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create checkout";
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: msg } }, { status: 500 });
  }
}
