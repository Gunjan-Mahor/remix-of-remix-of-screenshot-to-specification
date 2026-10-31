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

export function orderDocument(po: Record<string, any>) {
  const escape = (value: unknown) => String(value ?? "—").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
  const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(Number(value));
  const rows = [["Request ID", po.purchase_requests?.request_code ?? po.request_id], ["Purchase date", po.po_date], ["Supplier", po.supplier_name], ["Email", po.supplier_email], ["Phone", po.supplier_phone], ["Product", po.item_name], ["Quantity", po.quantity], ["Unit price (before GST)", money(po.unit_rate)], ["GST", `${po.tax_percent}% · ${money(po.tax_amount)}`], ["Delivery charges", money(po.delivery_charges ?? 0)], ["Total INR", money(po.total_amount)], ["Delivery location", po.delivery_location], ["Expected delivery", po.expected_delivery], ["Payment terms", po.payment_terms], ["Status", po.status]];
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(po.po_number)} — Nexora</title></head><body><h1>Nexora · Purchase Order ${escape(po.po_number)}</h1><table cellpadding="12">${rows.map(([k,v]) => `<tr><th align="left">${escape(k)}</th><td>${escape(v)}</td></tr>`).join("")}</table></body></html>`;
}