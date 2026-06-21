// SePay (VietQR bank-transfer) integration helpers.
//
// Flow: we create a PaymentOrder with a unique transfer `code`, render a VietQR
// pointing at our SePay-linked bank account with that code as the transfer memo.
// SePay watches the account and POSTs a webhook when the money arrives; we match
// the incoming transaction back to the order by its code.

export const SEPAY_BANK_ACCOUNT = process.env.SEPAY_BANK_ACCOUNT ?? "";
export const SEPAY_BANK_CODE = process.env.SEPAY_BANK_CODE ?? ""; // e.g. "ACB", "MBBank"
export const SEPAY_ACCOUNT_NAME = process.env.SEPAY_ACCOUNT_NAME ?? "";
export const SEPAY_WEBHOOK_API_KEY = process.env.SEPAY_WEBHOOK_API_KEY ?? "";

// Prefix kept short and alphanumeric so VietQR / SePay can reliably parse it out
// of the bank's free-text transfer description.
const CODE_PREFIX = "MT"; // MergeTrack

/**
 * Generate a unique, bank-memo-safe order code, e.g. "MTK7P3Q9ZB".
 * Uppercase letters + digits only — banks routinely strip diacritics and
 * special characters from transfer descriptions.
 */
export function generateOrderCode(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${CODE_PREFIX}${s}`;
}

/**
 * Find our order code inside the raw fields SePay sends. We check the parsed
 * `code` field first (SePay can auto-extract a configured pattern), then fall
 * back to scanning the free-text `content`/`description`.
 */
export function extractOrderCode(...fields: (string | null | undefined)[]): string | null {
  const re = new RegExp(`${CODE_PREFIX}[A-Z0-9]{8}`);
  for (const field of fields) {
    if (!field) continue;
    const match = field.toUpperCase().match(re);
    if (match) return match[0];
  }
  return null;
}

/**
 * Build a SePay VietQR image URL. The bank app pre-fills amount + memo so the
 * user only confirms the transfer.
 * https://qr.sepay.vn/img?acc=...&bank=...&amount=...&des=...
 */
export function buildVietQrUrl(amount: number, code: string): string {
  const params = new URLSearchParams({
    acc: SEPAY_BANK_ACCOUNT,
    bank: SEPAY_BANK_CODE,
    amount: String(amount),
    des: code,
  });
  return `https://qr.sepay.vn/img?${params.toString()}`;
}

export function isSepayConfigured(): boolean {
  return Boolean(SEPAY_BANK_ACCOUNT && SEPAY_BANK_CODE && SEPAY_WEBHOOK_API_KEY);
}

export interface SepayWebhookPayload {
  id: number; // SePay transaction id
  gateway: string; // bank, e.g. "Vietcombank"
  transactionDate: string;
  accountNumber: string;
  code: string | null; // SePay-parsed code (if a pattern is configured)
  content: string; // raw transfer description
  transferType: "in" | "out";
  transferAmount: number; // VND
  referenceCode: string;
  description: string;
}
