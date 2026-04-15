const WHOP_API_KEY = process.env.WHOP_API_KEY;
const WHOP_COMPANY_ID = process.env.WHOP_COMPANY_ID;
const WHOP_BASE_URL = "https://api.whop.com/api/v1";

function headers() {
  if (!WHOP_API_KEY) {
    throw new Error("WHOP_API_KEY is not configured");
  }
  return {
    Authorization: `Bearer ${WHOP_API_KEY}`,
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
}

export interface InvoiceResult {
  id: string;
  status: string;
  paymentUrl?: string;
}

export async function createInvoice(
  params: CreateInvoiceParams
): Promise<InvoiceResult> {
  const { customerEmail, customerName, description, amount, dueDate, lineItems } = params;

  const formattedLineItems: LineItem[] = lineItems
    ? lineItems.map((item) => ({
        label: item.label,
        unit_price: item.unitPrice,
        quantity: item.quantity,
      }))
    : [{ label: description, unit_price: amount, quantity: 1 }];

  const body = {
    company_id: WHOP_COMPANY_ID,
    email_address: customerEmail,
    customer_name: customerName,
    collection_method: "send_invoice",
    product: { title: description },
    plan: {
      initial_price: amount,
      plan_type: "one_time",
    },
    due_date: dueDate,
    line_items: formattedLineItems,
  };

  const res = await fetch(`${WHOP_BASE_URL}/invoices`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Whop API error (${res.status}): ${errorText}`);
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
    `${WHOP_BASE_URL}/invoices?company_id=${WHOP_COMPANY_ID}`,
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
