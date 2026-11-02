import { safeNumber } from "@/lib/purchasing";

export type Weights = { price: number; delivery: number; quality: number; payment: number; vendor: number };
export const DEFAULT_WEIGHTS: Weights = { price: 35, delivery: 25, quality: 20, payment: 10, vendor: 10 };

export type QuoteInput = {
  id: string;
  supplierName: string;
  totalPrice: number;
  deliveryCharges?: number | null;
  needsVerification?: string[];
  verified?: boolean;
  gstIncluded: boolean;
  gstPercent: number;
  deliveryDays: number;
  warranty?: string | null;
  qualityInfo?: string | null;
  paymentTerms?: string | null;
  vendorRating?: number | null; // 0-5
  avgResponseHours?: number | null;
  onTimePct?: number | null; // 0-100
};

export type RequestInput = { budget: number; daysUntilRequired: number };

export type ScoredQuote = {
  id: string;
  supplierName: string;
  landedCost: number;
  scores: Weights;
  total: number;
  flags: string[];
  eligible: boolean;
};

export function weightsTotal(w: Weights) {
  return w.price + w.delivery + w.quality + w.payment + w.vendor;
}
export function validateWeights(w: Weights) {
  return Object.values(w).every((v) => v >= 0 && v <= 100) && weightsTotal(w) === 100;
}

export function landedCost(q: Pick<QuoteInput, "totalPrice" | "gstIncluded" | "gstPercent" | "deliveryCharges">) {
  return Math.round(((q.gstIncluded ? q.totalPrice : q.totalPrice * (1 + q.gstPercent / 100)) + (q.deliveryCharges ?? 0)) * 100) / 100;
}

/** Credit days from terms like "Net 30", "45 days credit"; advance = 0. */
export function creditDays(terms?: string | null): number | null {
  if (!terms) return null;
  const t = terms.toLowerCase();
  if (t.includes("advance")) return 0;
  const m = t.match(/(\d{1,3})/);
  return m ? Number(m[1]) : null;
}

const clamp = (n: number) => Math.max(0, Math.min(100, safeNumber(n)));

export function scoreQuotations(quotes: QuoteInput[], req: RequestInput, w: Weights): ScoredQuote[] {
  if (!quotes.length) return [];
  const landed = quotes.map(landedCost);
  const validCosts = landed.filter((n) => Number.isFinite(n) && n > 0);
  const minLanded = validCosts.length ? Math.min(...validCosts) : 0;
  const validDays = quotes.map((q) => q.deliveryDays).filter((n) => Number.isFinite(n) && n >= 0);
  const minDays = Math.max(1, validDays.length ? Math.min(...validDays) : 1);
  const credits = quotes.map((q) => creditDays(q.paymentTerms));
  const maxCredit = Math.max(1, ...credits.map((c) => c ?? 0));

  return quotes
    .map((q, i) => {
      const flags: string[] = [];
      const lc = landed[i];
      const validNumbers = Number.isFinite(lc) && lc > 0 && Number.isFinite(q.totalPrice) && q.totalPrice > 0 && Number.isFinite(q.gstPercent) && q.gstPercent >= 0 && Number.isFinite(q.deliveryCharges ?? 0) && (q.deliveryCharges ?? 0) >= 0 && Number.isFinite(q.deliveryDays) && q.deliveryDays >= 0 && Number.isFinite(req.budget) && req.budget > 0 && Number.isFinite(req.daysUntilRequired);
      if (!validNumbers) flags.push("Invalid numeric values — correct the quotation before comparing");
      if (!q.gstIncluded && Number.isFinite(q.gstPercent)) flags.push(`GST excluded — ${q.gstPercent}% added to landed cost`);
      if (lc > req.budget) flags.push("Over budget");
      const late = q.deliveryDays > req.daysUntilRequired;
      if (late) flags.push("Misses required delivery date");
      if (!q.warranty) flags.push("Warranty not stated");
      if (!q.qualityInfo) flags.push("Quality / spec details missing");
      if (!q.paymentTerms) flags.push("Payment terms missing");
      if (q.vendorRating == null) flags.push("No vendor performance history");

      const price = clamp((minLanded / lc) * 100);
      const speed = (Math.max(1, minDays) / Math.max(1, q.deliveryDays)) * 100;
      const reliability = q.onTimePct ?? 70;
      const delivery = clamp((0.7 * speed + 0.3 * reliability) * (late ? 0.5 : 1));
      const quality = clamp(40 + (q.warranty ? 30 : 0) + (q.qualityInfo ? 30 : 0));
      const c = credits[i];
      const payment = c == null ? 40 : clamp(30 + (c / maxCredit) * 70);
      const ratingPart = q.vendorRating == null ? 50 : (q.vendorRating / 5) * 100;
      const resp = q.avgResponseHours == null ? 50 : clamp(100 - Math.max(0, q.avgResponseHours - 4) * 2);
      const vendor = clamp(0.8 * ratingPart + 0.2 * resp);

      const scores: Weights = {
        price: Math.round(price),
        delivery: Math.round(delivery),
        quality: Math.round(quality),
        payment: Math.round(payment),
        vendor: Math.round(vendor),
      };
      const total =
        safeNumber(Math.round(
          ((scores.price * w.price + scores.delivery * w.delivery + scores.quality * w.quality + scores.payment * w.payment + scores.vendor * w.vendor) /
            100) *
            10,
        ) / 10);
      if (q.needsVerification?.length) flags.push(`Needs verification: ${q.needsVerification.join(", ").replace(/_/g, " ")}`);
      return { id: q.id, supplierName: q.supplierName, landedCost: safeNumber(lc), scores, total, flags, eligible: validNumbers && lc <= req.budget && !late };
    })
    .sort((a, b) => b.total - a.total);
}

export function bestEligible(scored: ScoredQuote[]) {
  return scored.find((s) => s.eligible) ?? null;
}
