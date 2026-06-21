import { auth } from "@/lib/auth";
import { getOrder, expireStaleOrders } from "@/lib/db/payments";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  await expireStaleOrders();

  const { orderId } = await params;
  const order = await getOrder(orderId, session.user.id);
  if (!order) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Order not found" } }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: order.id,
      status: order.status,
      amount: order.amount,
      code: order.code,
      planName: order.plan.name,
      paidAt: order.paidAt,
      expiresAt: order.expiresAt,
    },
  });
}
