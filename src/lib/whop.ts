// Whop REST helpers — thin wrappers over `@whop/sdk` so call sites can stay
// terse and stable while the SDK handles auth, base URL, and typing.
//
// Why a wrapper at all? Two reasons:
//   1. We want to keep the existing call signatures across all consumers
//      (api routes, webhook handler, etc.) so we don't have to refactor
//      every site each time the SDK shape shifts.
//   2. A handful of operations need our company id baked in or specific
//      defaults applied (idempotency keys, payouts portal `use_case`,
//      etc.) — encapsulating those here keeps callers from getting them
//      wrong.
//
// `sendInvoice` is the lone holdout still using raw fetch: the SDK does
// not expose a `whopsdk.invoices.send(id, ...)` method (sending is
// configured at create time via `collection_method: 'send_invoice'`).
// When/if the SDK adds it, drop the fetch and switch over.

import { whopsdk } from "@/lib/whop-client";

const WHOP_BASE_URL = "https://api.whop.com/api/v1";

function getKey() {
  const key = process.env.WHOP_API_KEY;
  if (!key) throw new Error("WHOP_API_KEY is not configured");
  return key;
}

function getCompanyId() {
  const id = process.env.WHOP_COMPANY_ID || "";
  if (!id) throw new Error("WHOP_COMPANY_ID is not configured");
  return id;
}

function rawHeaders() {
  return {
    Authorization: `Bearer ${getKey()}`,
    "Content-Type": "application/json",
  };
}

export interface LineItem {
  label: string;
  unit_price: number;
  quantity: number;
}

export interface CreateInvoiceParams {
  customerEmail: string;
  customerName: string;
  description: string;
  amount: number; // in dollars (Whop expects dollars)
  dueDate: string; // ISO date
  lineItems?: { label: string; unitPrice: number; quantity: number }[];
  saveDraft?: boolean;
  // Optional caller-supplied key. We forward it to Whop so a client retry
  // (network blip, double-tap) doesn't create two invoices. Use a hash of
  // the payload for natural deduplication.
  idempotencyKey?: string;
}

export interface InvoiceResult {
  id: string;
  status: string;
  paymentUrl?: string;
  // The hosted-checkout configuration id. Stored on `invoices` so the
  // chat pay button can render the in-iframe modal via `iframeSdk.openCheckout`.
  checkoutConfigId?: string;
}

export async function createInvoice(
  params: CreateInvoiceParams
): Promise<InvoiceResult> {
  const {
    customerEmail,
    customerName,
    description,
    amount,
    dueDate,
    lineItems,
    saveDraft,
    idempotencyKey,
  } = params;

  const formattedLineItems: LineItem[] = lineItems
    ? lineItems.map((item) => ({
        label: item.label,
        unit_price: item.unitPrice,
        quantity: item.quantity,
      }))
    : [{ label: description, unit_price: amount, quantity: 1 }];

  // SDK accepts the same shape as the raw POST. We cast where our older
  // signature predates the SDK's typed parameters (the SDK union has many
  // optional shapes; we use the "with_product" variant).
  const body = {
    company_id: getCompanyId(),
    collection_method: saveDraft ? "charge_automatically" : "send_invoice",
    product: { title: description },
    plan: {
      initial_price: amount,
      plan_type: "one_time",
    },
    line_items: formattedLineItems,
    ...(saveDraft
      ? { save_as_draft: true }
      : {
          email_address: customerEmail,
          customer_name: customerName,
          due_date: dueDate,
        }),
  };

  const data = (await whopsdk.invoices.create(
    body as unknown as Parameters<typeof whopsdk.invoices.create>[0],
    idempotencyKey
      ? { headers: { "Idempotency-Key": idempotencyKey } }
      : undefined
  )) as unknown as Record<string, unknown>;

  return {
    id: data.id as string,
    status: (data.status as string) || "sent",
    paymentUrl:
      (data.payment_url as string | undefined) ||
      (data.checkout_url as string | undefined) ||
      undefined,
    checkoutConfigId:
      (data.checkout_configuration_id as string | undefined) ||
      ((data.checkout_configuration as Record<string, unknown> | undefined)
        ?.id as string | undefined),
  };
}

export async function getInvoice(
  invoiceId: string
): Promise<Record<string, unknown>> {
  return (await whopsdk.invoices.retrieve(invoiceId)) as unknown as Record<
    string,
    unknown
  >;
}

export async function listInvoices(): Promise<Record<string, unknown>[]> {
  const page = await whopsdk.invoices.list({ company_id: getCompanyId() });
  return page.data as unknown as Record<string, unknown>[];
}

export async function sendInvoice(
  invoiceId: string,
  email?: string
): Promise<void> {
  // No SDK method for resending — fall back to raw fetch.
  const body: Record<string, unknown> = {};
  if (email) body.email_address = email;

  const res = await fetch(`${WHOP_BASE_URL}/invoices/${invoiceId}/send`, {
    method: "POST",
    headers: rawHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Whop API error (${res.status}): ${await res.text()}`);
  }
}

export async function voidInvoice(invoiceId: string): Promise<void> {
  await whopsdk.invoices.void(invoiceId);
}

export async function markPaid(invoiceId: string): Promise<void> {
  await whopsdk.invoices.markPaid(invoiceId);
}

export async function createCheckoutSession(params: {
  amount: number; // dollars
  description: string;
  metadata?: Record<string, string>;
  redirectUrl?: string;
}): Promise<{ id: string; purchaseUrl: string }> {
  const body = {
    mode: "payment",
    plan: {
      company_id: getCompanyId(),
      currency: "usd",
      plan_type: "one_time",
      initial_price: params.amount,
      product: {
        title: params.description,
        external_identifier:
          params.metadata?.transactionId || crypto.randomUUID(),
      },
    },
    metadata: params.metadata || {},
    ...(params.redirectUrl ? { redirect_url: params.redirectUrl } : {}),
  };

  const data = (await whopsdk.checkoutConfigurations.create(
    body as unknown as Parameters<
      typeof whopsdk.checkoutConfigurations.create
    >[0]
  )) as unknown as { id: string; purchase_url?: string };

  return {
    id: data.id,
    purchaseUrl: data.purchase_url || "",
  };
}

export async function createConnectedAccount(params: {
  email: string;
  name: string;
  internalUserId: string;
}): Promise<{ companyId: string }> {
  const data = (await whopsdk.companies.create({
    email: params.email,
    parent_company_id: getCompanyId(),
    title: params.name,
    metadata: {
      internal_user_id: params.internalUserId,
    },
  } as unknown as Parameters<typeof whopsdk.companies.create>[0])) as unknown as {
    id: string;
  };
  return { companyId: data.id };
}

export async function createPayoutTransfer(params: {
  // Whop accepts user_xxx, biz_xxx, or ldgr_xxx as a destination.
  // SSO'd creators get their whop_user_id here so funds land in their existing
  // wallet; non-Whop creators get a sub-company id we provisioned for them.
  destinationId: string;
  amountDollars: number;
  description: string;
  idempotencyKey: string;
}): Promise<{ id: string; feeAmount: number; status: string }> {
  const data = (await whopsdk.transfers.create({
    amount: params.amountDollars,
    currency: "usd",
    origin_id: getCompanyId(),
    destination_id: params.destinationId,
    idempotence_key: params.idempotencyKey,
    notes: params.description.slice(0, 50),
  } as unknown as Parameters<typeof whopsdk.transfers.create>[0])) as unknown as {
    id: string;
    fee_amount?: number;
    status?: string;
  };

  return {
    id: data.id,
    feeAmount: data.fee_amount || 0,
    status: data.status || "completed",
  };
}

export async function generatePayoutPortalToken(
  connectedCompanyId: string
): Promise<string> {
  const data = (await whopsdk.accessTokens.create({
    company_id: connectedCompanyId,
  } as unknown as Parameters<typeof whopsdk.accessTokens.create>[0])) as unknown as {
    token: string;
  };
  return data.token;
}

export async function generatePayoutPortalLink(params: {
  connectedCompanyId: string;
  returnUrl: string;
}): Promise<string> {
  const data = (await whopsdk.accountLinks.create({
    company_id: params.connectedCompanyId,
    use_case: "payouts_portal",
    return_url: params.returnUrl,
    refresh_url: params.returnUrl,
  } as unknown as Parameters<
    typeof whopsdk.accountLinks.create
  >[0])) as unknown as { url: string };
  return data.url;
}
