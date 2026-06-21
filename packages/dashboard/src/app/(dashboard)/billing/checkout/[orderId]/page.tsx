import { auth } from "@/lib/auth";
import { getOrder, expireStaleOrders } from "@/lib/db/payments";
import {
  buildVietQrUrl,
  SEPAY_BANK_ACCOUNT,
  SEPAY_BANK_CODE,
  SEPAY_ACCOUNT_NAME,
} from "@/lib/sepay";
import { formatVnd } from "@/lib/format";
import { CheckoutClient, CopyField } from "./CheckoutClient";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function CheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth();
  const userId = session!.user.id;
  await expireStaleOrders();

  const { orderId } = await params;
  const order = await getOrder(orderId, userId);
  if (!order) notFound();

  const qrUrl = buildVietQrUrl(order.amount, order.code);
  const t = await getTranslations("checkoutPage");

  return (
    <div className="page-w stack" style={{ maxWidth: 760 }}>
      <div>
        <h1 className="h1" style={{ marginBottom: 4 }}>
          {t("title", { plan: order.plan.name })}
        </h1>
        <p className="secondary" style={{ fontSize: 13 }}>
          {t("subtitle")}
        </p>
      </div>

      <div className="card card-body" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24 }}>
        {/* QR */}
        <div className="stack" style={{ gap: 10, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="VietQR"
            width={220}
            height={220}
            style={{ borderRadius: 8, border: "1px solid var(--line, #e5e5e5)" }}
          />
          <span className="muted" style={{ fontSize: 11 }}>
            {t("scanWithBankApp")}
          </span>
        </div>

        {/* Transfer details */}
        <div className="stack" style={{ gap: 14 }}>
          <CopyField label={t("bank")} value={SEPAY_BANK_CODE} />
          <CopyField label={t("accountNumber")} value={SEPAY_BANK_ACCOUNT} />
          {SEPAY_ACCOUNT_NAME && (
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                {t("accountHolder")}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{SEPAY_ACCOUNT_NAME}</div>
            </div>
          )}
          <CopyField label={t("amount")} value={String(order.amount)} />
          <CopyField label={t("transferContent")} value={order.code} />

          <div
            className="row"
            style={{
              gap: 8,
              fontSize: 12,
              color: "var(--color-warning, #9a6700)",
              background: "var(--color-severity-medium-bg, #fff8e1)",
              padding: "8px 10px",
              borderRadius: 8,
            }}
          >
            <span>
              {t.rich("warning", {
                code: order.code,
                amount: formatVnd(order.amount),
                b: (chunks) => <b>{chunks}</b>,
              })}
            </span>
          </div>
        </div>
      </div>

      <CheckoutClient
        orderId={order.id}
        initialStatus={order.status}
        expiresAt={order.expiresAt.toISOString()}
      />

      <Link href="/billing/plans" className="muted" style={{ fontSize: 12 }}>
        {t("backToPlans")}
      </Link>
    </div>
  );
}
