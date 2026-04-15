const WHOP_BASE_URL = "https://api.whop.com/api/v1";

function getKey() {
  const key = process.env.WHOP_API_KEY;
  if (!key) throw new Error("WHOP_API_KEY is not configured");
  return key;
}

function getCompanyId() {
  return process.env.WHOP_COMPANY_ID || "";
}

function headers() {
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
  amount: number; // in cents
  dueDate: string; // ISO date
  lineItems?: { label: string; unitPrice: number; quantity: number }[];
  saveDraft?: boolean;
}

export interface InvoiceResult {
  id: string;
  status: string;
  paymentUrl?: string;
}

export async function createInvoice(
  params: CreateInvoiceParams
): Promise<InvoiceResult> {
  const { customerEmail, customerName, description, amount, dueDate, lineItems, saveDraft } = params;

  const formattedLineItems: LineItem[] = lineItems
    ? lineItems.map((item) => ({
        label: item.label,
        unit_price: item.unitPrice,
        quantity: item.quantity,
      }))
    : [{ label: description, unit_price: amount, quantity: 1 }];

  const body: Record<string, unknown> = {
    company_id: getCompanyId(),
    collection_method: "send_invoice",
    product: { title: description },
    plan: {
      initial_price: amount,
      plan_type: "one_time",
    },
    line_items: formattedLineItems,
  };

  if (saveDraft) {
    body.save_as_draft = true;
  } else {
    body.email_address = customerEmail;
    body.customer_name = customerName;
    body.due_date = dueDate;
  }

  const res = await fetch(`${WHOP_BASE_URL}/invoices`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    try {
      const errJson = JSON.parse(errorText);
      throw new Error(errJson?.error?.message || `Invoice failed (${res.status})`);
    } catch (e) {
      if (e instanceof Error && !e.message.includes("Invoice failed")) throw e;
      throw new Error(`Invoice failed (${res.status}): ${errorText}`);
    }
  }

  const data = await res.json();

  return {
    id: data.id,
    status: data.status || "sent",
    paymentUrl: data.payment_url || data.checkout_url || undefined,
  };
}

export async function getInvoice(invoiceId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${WHOP_BASE_URL}/invoices/${invoiceId}`, {
    method: "GET",
    headers: headers(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Whop API error (${res.status}): ${errorText}`);
  }

  return res.json();
}

export async function listInvoices(): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${WHOP_BASE_URL}/invoices?company_id=${getCompanyId()}`,
    {
      method: "GET",
      headers: headers(),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Whop API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.data || data;
}

export async function sendInvoice(
  invoiceId: string,
  email?: string
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (email) {
    body.email_address = email;
  }

  const res = await fetch(`${WHOP_BASE_URL}/invoices/${invoiceId}/send`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Whop API error (${res.status}): ${errorText}`);
  }
}

export async function voidInvoice(invoiceId: string): Promise<void> {
  const res = await fetch(`${WHOP_BASE_URL}/invoices/${invoiceId}/void`, {
    method: "POST",
    headers: headers(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Whop API error (${res.status}): ${errorText}`);
  }
}

export async function markPaid(invoiceId: string): Promise<void> {
  const res = await fetch(`${WHOP_BASE_URL}/invoices/${invoiceId}/mark_paid`, {
    method: "POST",
    headers: headers(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Whop API error (${res.status}): ${errorText}`);
  }
}

export async function createCheckoutSession(params: {
  amount: number; // dollars
  description: string;
  metadata?: Record<string, string>;
}): Promise<{ id: string; purchaseUrl: string }> {
  const body = {
    company_id: getCompanyId(),
    plan: {
      plan_type: "one_time",
      initial_price: params.amount,
    },
    product: { title: params.description },
    metadata: params.metadata || {},
  };

  const res = await fetch(`${WHOP_BASE_URL}/checkout_sessions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Checkout creation failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    purchaseUrl: data.purchase_url || data.url || "",
  };
}

export async function createTransfer(params: {
  fromAccount: string;
  toAccount: string;
  amount: number; // dollars
  description?: string;
  metadata?: Record<string, string>;
}): Promise<{ id: string; status: string }> {
  const body: Record<string, unknown> = {
    amount: params.amount,
    currency: "usd",
    origin_id: params.fromAccount,
    destination_id: params.toAccount,
    idempotence_key: crypto.randomUUID(),
  };
  if (params.description) body.notes = params.description.slice(0, 50);
  if (params.metadata) body.metadata = params.metadata;

  const res = await fetch(`${WHOP_BASE_URL}/transfers`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Transfer failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return { id: data.id, status: data.status || "completed" };
}

export async function createWhopWithdrawal(params: {
  amountDollars: number;
}): Promise<{ id: string; status: string }> {
  const body = {
    amount: params.amountDollars,
    company_id: getCompanyId(),
    currency: "usd",
  };

  const res = await fetch(`${WHOP_BASE_URL}/withdrawals`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Withdrawal failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return { id: data.id, status: data.status || "pending" };
}
