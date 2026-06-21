import { prisma } from "@/lib/prisma";
import { generateOrderCode } from "@/lib/sepay";

// Orders expire if unpaid after this window (minutes).
const ORDER_TTL_MINUTES = 30;

export async function createOrder(userId: string, planId: string, amount: number, months = 1) {
  const expiresAt = new Date(Date.now() + ORDER_TTL_MINUTES * 60 * 1000);

  // Retry on the (astronomically unlikely) code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateOrderCode();
    const existing = await prisma.paymentOrder.findUnique({ where: { code } });
    if (existing) continue;
    return prisma.paymentOrder.create({
      data: { userId, planId, amount, months, code, expiresAt },
    });
  }
  throw new Error("Failed to allocate a unique payment code");
}

export async function getOrder(id: string, userId: string) {
  return prisma.paymentOrder.findFirst({
    where: { id, userId },
    include: { plan: true },
  });
}

/** Match an incoming transfer to an order by its code. We accept PENDING and
 *  EXPIRED (but never PAID/FAILED) so a payment that lands just after the order
 *  auto-expired still activates the plan rather than silently taking the money. */
export async function findPayableByCode(code: string) {
  return prisma.paymentOrder.findFirst({
    where: { code, status: { in: ["PENDING", "EXPIRED"] } },
    include: { plan: true },
  });
}

/** Mark an order paid + record the SePay transaction. Returns the order, or null
 *  if it was already settled with this transaction (idempotency). */
export async function markOrderPaid(orderId: string, sepayTxId: number, gateway: string) {
  return prisma.paymentOrder.update({
    where: { id: orderId },
    data: { status: "PAID", sepayTxId, gateway, paidAt: new Date() },
  });
}

/** Whether this SePay transaction has already been recorded against any order. */
export async function isTransactionProcessed(sepayTxId: number): Promise<boolean> {
  const found = await prisma.paymentOrder.findUnique({ where: { sepayTxId } });
  return found !== null;
}

/** Lazily expire stale pending orders so the UI/status reflects reality. */
export async function expireStaleOrders() {
  await prisma.paymentOrder.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
}
