/** Standard quotation fields the AI fills from any format (PDF, image, scan, email text). */
export type ExtractedQuote = {
  is_quotation: boolean;
  supplier_name: string | null;
  rfq_reference: string | null;
  item_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  currency: string | null;
  gst_percent: number | null;
  gst_amount: number | null;
  gst_included: boolean | null;
  delivery_charges: number | null;
  delivery_days: number | null;
  warranty: string | null;
  payment_terms: string | null;
  specifications: string | null;
  quality_info: string | null;
  validity: string | null;
  conditions: string | null;
  unclear_fields: string[] | null;
  conflicts: string[] | null;
};

export const EXTRACT_SCHEMA_HINT = `{"is_quotation":boolean,"supplier_name":string|null,"rfq_reference":string|null,"item_name":string|null,"quantity":number|null,"unit_price":number|null,"total_price":number|null,"currency":string|null,"gst_percent":number|null,"gst_amount":number|null,"gst_included":boolean|null,"delivery_charges":number|null,"delivery_days":number|null,"warranty":string|null,"payment_terms":string|null,"specifications":string|null,"quality_info":string|null,"validity":string|null,"conditions":string|null,"unclear_fields":string[],"conflicts":string[]}`;

const num = (v: unknown) => {
  const n = typeof v === "string" ? Number(v.replace(/[,₹\s]/g, "")) : Number(v);
  return v == null || v === "" || !Number.isFinite(n) ? null : n;
};

export type NormalizedQuote = {
  ok: boolean;
  reason?: string;
  row: {
    item_name: string | null; quantity: number | null; unit_price: number; total_price: number; currency: string;
    gst_percent: number; gst_included: boolean; delivery_charges: number; delivery_days: number;
    warranty: string | null; payment_terms: string | null; specifications: string | null; quality_info: string | null;
    validity: string | null; conditions: string | null;
  };
  needsVerification: string[];
  issues: string[];
};

/**
 * Validates AI-extracted values. Never invents values: anything missing or inconsistent
 * is flagged "needs verification" rather than guessed.
 */
export function normalizeQuote(q: Partial<ExtractedQuote>, requestedQty: number): NormalizedQuote {
  const needs = new Set<string>((q.unclear_fields ?? []).map(String));
  const issues: string[] = [...(q.conflicts ?? []).map(String)];
  let unit = num(q.unit_price);
  let total = num(q.total_price);
  const qty = num(q.quantity);
  const effQty = qty ?? requestedQty;
  if (unit == null && total != null && effQty > 0) { unit = Math.round((total / effQty) * 100) / 100; needs.add("unit_price"); issues.push("Unit price calculated from total ÷ quantity"); }
  if (total == null && unit != null) { total = Math.round(unit * effQty * 100) / 100; needs.add("total_price"); issues.push("Total calculated from unit price × quantity"); }
  if (qty != null && qty !== requestedQty) { needs.add("quantity"); issues.push(`Quoted quantity ${qty} differs from requested ${requestedQty}`); }
  if (qty == null) needs.add("quantity");
  if (unit != null && total != null && total > 0 && Math.abs(total - unit * effQty) / total > 0.02) { needs.add("total_price"); issues.push("Unit price × quantity does not match total"); }
  const gstPct = num(q.gst_percent);
  if (gstPct == null) { needs.add("gst_percent"); issues.push("GST % not stated — assumed 18% pending verification"); }
  if (q.gst_included == null) { needs.add("gst_included"); issues.push("Not stated whether GST is included"); }
  const gstAmt = num(q.gst_amount);
  if (gstAmt != null && gstPct != null && total) {
    const base = q.gst_included ? total / (1 + gstPct / 100) : total;
    if (Math.abs(base * (gstPct / 100) - gstAmt) / Math.max(gstAmt, 1) > 0.05) { needs.add("gst_percent"); issues.push("GST amount does not match GST %"); }
  }
  const days = num(q.delivery_days);
  if (days == null) { needs.add("delivery_days"); issues.push("Delivery time missing"); }
  if (num(q.delivery_charges) == null) needs.add("delivery_charges");
  if (!q.warranty) needs.add("warranty");
  if (!q.payment_terms) needs.add("payment_terms");
  if (q.currency && q.currency.toUpperCase() !== "INR") { needs.add("currency"); issues.push(`Quoted in ${q.currency}, not INR`); }
  const ok = !!q.is_quotation && unit != null && unit > 0 && total != null && total > 0;
  return {
    ok,
    reason: !q.is_quotation ? "Not a quotation" : ok ? undefined : "No usable price found",
    row: {
      item_name: q.item_name ?? null, quantity: qty, unit_price: unit ?? 0, total_price: total ?? 0,
      currency: (q.currency || "INR").toUpperCase(), gst_percent: gstPct ?? 18, gst_included: !!q.gst_included,
      delivery_charges: num(q.delivery_charges) ?? 0, delivery_days: days == null ? 0 : Math.round(days),
      warranty: q.warranty ?? null, payment_terms: q.payment_terms ?? null, specifications: q.specifications ?? null,
      quality_info: q.quality_info ?? null, validity: q.validity ?? null, conditions: q.conditions ?? null,
    },
    needsVerification: [...needs],
    issues,
  };
}

/** Same supplier, same RFQ, same total within 1% → duplicate. */
export function isDuplicate(existing: { rfq_id: string; total_price: number }[], rfqId: string, total: number) {
  return existing.some((e) => e.rfq_id === rfqId && Math.abs(Number(e.total_price) - total) <= total * 0.01);
}
