import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  findPayableByCode,
  markOrderPaid,
  isTransactionProcessed,
} from "@/lib/db/payments";
import { activateSubscription } from "@/lib/db/billing";
import { extractOrderCode, SEPAY_WEBHOOK_API_KEY, type SepayWebhookPayload } from "@/lib/sepay";

// SePay authenticates webhooks with a static "Authorization: Apikey <key>" header
// (no HMAC). We compare it in constant time against our configured key.
function verifyApiKey(header: string | null): boolean {
  if (!header || !SEPAY_WEBHOOK_API_KEY) return false;
  const expected = `Apikey ${SEPAY_WEBHOOK_API_KEY}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!verifyApiKey(req.headers.get("authorization"))) {
    return NextResponse.json(
      { success: false, message: "Invalid API key" },
      { status: 401 }
    );
  }

  let payload: SepayWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  // Only incoming credits matter; acknowledge everything else so SePay stops retrying.
  if (payload.transferType !== "in") {
    return NextResponse.json({ success: true, message: "Ignored (not an incoming transfer)" });
  }

  // Idempotency: SePay may resend the same transaction.
  if (typeof payload.id === "number" && (await isTransactionProcessed(payload.id))) {
    return NextResponse.json({ success: true, message: "Already processed" });
  }

  const code = extractOrderCode(payload.code, payload.content, payload.description);
  if (!code) {
    return NextResponse.json({ success: true, message: "No order code found" });
  }

  const order = await findPayableByCode(code);
  if (!order) {
    // Unknown / already-settled code — ack so SePay doesn't retry forever.
    return NextResponse.json({ success: true, message: "No matching payable order" });
  }

  // Underpayment guard: require at least the order amount.
  if (payload.transferAmount < order.amount) {
    return NextResponse.json({ success: true, message: "Amount too low; awaiting full payment" });
  }

  await markOrderPaid(order.id, payload.id, payload.gateway ?? "");
  await activateSubscription(order.userId, order.planId, order.months);

  return NextResponse.json({ success: true });
}
