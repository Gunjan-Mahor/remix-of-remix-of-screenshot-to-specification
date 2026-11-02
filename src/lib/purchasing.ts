import { z } from "zod";

export const MAX_MONEY = 1_000_000_000;
export const MAX_QUANTITY = 1_000_000;
export const moneyInput = (label: string) => z.coerce.number({ invalid_type_error: `${label} must be a positive number up to ₹1,000,000,000 (₹100 crore)` }).finite().positive(`${label} must be greater than 0`).max(MAX_MONEY, `${label} must not exceed ₹1,000,000,000 (₹100 crore)`);
export const quantityInput = z.coerce.number({ invalid_type_error: "Quantity must be a positive whole number up to 1,000,000" }).finite().int("Quantity must be a whole number").positive("Quantity must be greater than 0").max(MAX_QUANTITY, "Quantity must not exceed 1,000,000");
export const requestNumbers = z.object({ budget: moneyInput("Budget"), quantity: quantityInput });
export const requestInput = requestNumbers.extend({
  item_name: z.string().trim().min(2, "Required").max(150), category: z.string().min(1, "Pick a category"),
  unit: z.string().trim().min(1).max(20), delivery_location: z.string().trim().min(3, "Required").max(200),
  required_date: z.string().refine((d) => d && new Date(d) > new Date(), "Pick a future date"),
  specifications: z.string().max(2000).optional(), quality_requirements: z.string().max(1000).optional(),
  payment_terms: z.string().max(200).optional(), notes: z.string().max(1000).optional(),
});
export const supplierQuoteInput = z.object({
  rfq_id: z.string().uuid(), unit_price: moneyInput("Unit price"),
  delivery_days: z.coerce.number().finite().int().min(0).max(2147483647),
  gst_included: z.boolean(), gst_percent: z.coerce.number().finite().min(0).max(100),
  warranty: z.string().max(1000), quality_info: z.string().max(2000), payment_terms: z.string().max(200),
  pdf_path: z.string().max(500).nullable(),
});
export const companyInput = z.object({
  name: z.string().trim().min(2).max(120), email: z.string().max(255), phone: z.string().max(30), address: z.string().max(300),
  response_deadline_days: z.coerce.number().finite().int().min(1).max(365), annual_budget: moneyInput("Yearly budget"),
});
export function finiteNumber(value: unknown): number | null {
  if ((typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !value.trim())) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
export const safeNumber = (value: unknown) => finiteNumber(value) ?? 0;
export const displayNumber = (value: unknown, rounded = false) => {
  const n = finiteNumber(value);
  return n == null ? "—" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: rounded ? 0 : 2 }).format(n);
};
export const safeSum = (values: unknown[]) => values.reduce<number>((sum, value) => safeNumber(sum + safeNumber(value)), 0);

export function decisionError(role: string | undefined, status: string, decision: string, reason: string, verified: boolean) {
  if (role !== "admin" && role !== "manager") return "Only managers or admins can decide";
  if (status !== "pending_approval") return "Request is not awaiting approval";
  if (decision === "rejected" && !reason.trim()) return "Add a rejection reason";
  if (decision === "approved" && !verified) return "Verify the recommended quotation first";
  return null;
}

export function poAmounts(total: number, included: boolean, gst: number, delivery: number, quantity: number) {
  const base = included ? total / (1 + gst / 100) : total;
  return { unitRate: base / quantity, tax: Math.round(base * gst / 100 * 100) / 100, total: Math.round((base * (1 + gst / 100) + delivery) * 100) / 100 };
}

export function validRating(rating: number) {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export const PAYMENT_METHODS = [
  { value: "upi_demo", label: "UPI — demo only" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "on_delivery", label: "Payment on delivery" },
] as const;

export function paymentMethodLabel(mode: string | null | undefined) {
  return PAYMENT_METHODS.find((m) => m.value === mode)?.label ?? "Not selected";
}

export function paymentMethodError(mode: string | null | undefined) {
  return PAYMENT_METHODS.some((m) => m.value === mode) ? null : "Select a payment method before sending confirmation";
}

export function demoQrPayload(poNumber: string) {
  return `NEXORA DEMO ONLY | ${poNumber} | No payment address. No money will be transferred.`;
}

export function confirmationBody(po: Record<string, any>, adminEmails: string[]) {
  return `Vendor selection confirmed\nPurchase Order ${po.po_number}\nDate: ${po.po_date}\n\nDear ${po.supplier_name} team,\nYour verified quotation has been approved by our purchasing manager.\n\nItem: ${po.item_name}\nQuantity: ${po.quantity}\nUnit rate: INR ${po.unit_rate}\nTax: ${po.tax_percent}% (INR ${po.tax_amount})\nDelivery charges: INR ${po.delivery_charges}\nTotal: INR ${po.total_amount}\nDelivery location: ${po.delivery_location}\nExpected delivery: ${po.expected_delivery ?? "As agreed"}\nPayment terms: ${po.payment_terms ?? "As agreed"}\nPayment method: ${paymentMethodLabel(po.payment_mode)}\nCompany admin email: ${adminEmails.join(", ") || "Not available"}\n${po.payment_mode === "upi_demo" ? "UPI QR is demo-only. No real payment address is provided and no payment has been made.\n" : "Payment has not been recorded. Agree payment details with the company admin.\n"}\nPlease acknowledge this purchase order by replying to this email.`;
}

export function orderDocument(po: Record<string, any>) {
  const escape = (value: unknown) => String(value ?? "—").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
  const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(Number(value));
  const rows = [["Request ID", po.purchase_requests?.request_code ?? po.request_id], ["Purchase date", po.po_date], ["Supplier", po.supplier_name], ["Email", po.supplier_email], ["Phone", po.supplier_phone], ["Product", po.item_name], ["Quantity", po.quantity], ["Unit price (before GST)", money(po.unit_rate)], ["GST", `${po.tax_percent}% · ${money(po.tax_amount)}`], ["Delivery charges", money(po.delivery_charges ?? 0)], ["Total INR", money(po.total_amount)], ["Delivery location", po.delivery_location], ["Expected delivery", po.expected_delivery], ["Payment terms", po.payment_terms], ["Status", po.status]];
  rows.push(["Payment method", paymentMethodLabel(po.payment_mode)], ["Company admin email", po.admin_emails?.join(", ") || "Not available"]);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(po.po_number)} — Nexora</title></head><body><h1>Nexora · Purchase Order ${escape(po.po_number)}</h1><table cellpadding="12">${rows.map(([k,v]) => `<tr><th align="left">${escape(k)}</th><td>${escape(v)}</td></tr>`).join("")}</table><p>${po.payment_mode === "upi_demo" ? "Demo UPI only — no real payment. " : ""}Payment has not been recorded.</p></body></html>`;
}
export function initials(name: string) {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Spent = sent/active orders this year (drafts and cancelled excluded); balance never hides overspend. */
export function budgetSummary(annualBudget: number, orders: { total_amount: number | string; po_date: string; status: string }[], year = new Date().getFullYear()) {
  const counted = orders.filter((o) => !["draft", "cancelled"].includes(o.status) && new Date(o.po_date).getFullYear() === year);
  const spent = safeNumber(Math.round(safeSum(counted.map((o) => o.total_amount)) * 100) / 100);
  const committed = safeNumber(Math.round(safeSum(orders.filter((o) => o.status === "draft").map((o) => o.total_amount)) * 100) / 100);
  const budget = safeNumber(annualBudget);
  return { spent, committed, balance: safeNumber(Math.round((budget - spent) * 100) / 100), usedPct: budget > 0 ? safeNumber(Math.round((spent / budget) * 100)) : null, orders: counted.length };
}

/** Fields copied from an old request so it can be re-ordered without retyping. */
export function reorderFields(r: Record<string, any>) {
  const keys = ["item_name", "category", "quantity", "unit", "budget", "delivery_location", "specifications", "quality_requirements", "payment_terms", "notes"];
  return Object.fromEntries(keys.filter((k) => r[k] != null && r[k] !== "").map((k) => [k, String(r[k])]));
}
