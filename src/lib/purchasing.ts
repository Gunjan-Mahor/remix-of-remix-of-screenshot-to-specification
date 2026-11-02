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
  const spent = Math.round(counted.reduce((a, o) => a + Number(o.total_amount), 0) * 100) / 100;
  const committed = Math.round(orders.filter((o) => o.status === "draft").reduce((a, o) => a + Number(o.total_amount), 0) * 100) / 100;
  return { spent, committed, balance: Math.round((annualBudget - spent) * 100) / 100, usedPct: annualBudget > 0 ? Math.round((spent / annualBudget) * 100) : null, orders: counted.length };
}

/** Fields copied from an old request so it can be re-ordered without retyping. */
export function reorderFields(r: Record<string, any>) {
  const keys = ["item_name", "category", "quantity", "unit", "budget", "delivery_location", "specifications", "quality_requirements", "payment_terms", "notes"];
  return Object.fromEntries(keys.filter((k) => r[k] != null && r[k] !== "").map((k) => [k, String(r[k])]));
}
