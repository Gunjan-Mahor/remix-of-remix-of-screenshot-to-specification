import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS, bestEligible, landedCost, scoreQuotations, validateWeights } from "@/lib/scoring";
import { effectiveRfqStatus } from "@/lib/constants";

const base = { gstIncluded: true, gstPercent: 18, warranty: "1 year", qualityInfo: "ISO", paymentTerms: "Net 30", vendorRating: 4, avgResponseHours: 10, onTimePct: 90 };

describe("weights", () => {
  it("defaults are 35/25/20/10/10 and total 100", () => {
    expect(DEFAULT_WEIGHTS).toEqual({ price: 35, delivery: 25, quality: 20, payment: 10, vendor: 10 });
    expect(validateWeights(DEFAULT_WEIGHTS)).toBe(true);
  });
  it("rejects weights not totalling 100", () => {
    expect(validateWeights({ ...DEFAULT_WEIGHTS, price: 40 })).toBe(false);
  });
});

describe("scoring", () => {
  it("adds GST when excluded", () => {
    expect(landedCost({ totalPrice: 1000, gstIncluded: false, gstPercent: 18 })).toBe(1180);
  });
  it("cheapest over-budget quote is not recommended", () => {
    const s = scoreQuotations(
      [
        { ...base, id: "a", supplierName: "A", totalPrice: 90000, deliveryDays: 7 },
        { ...base, id: "b", supplierName: "B", totalPrice: 120000, deliveryDays: 7 },
      ],
      { budget: 100000, daysUntilRequired: 14 },
      DEFAULT_WEIGHTS,
    );
    // A is cheaper and within budget
    expect(bestEligible(s)?.id).toBe("a");
    const s2 = scoreQuotations(
      [
        { ...base, id: "a", supplierName: "A", totalPrice: 90000, deliveryDays: 7 },
        { ...base, id: "b", supplierName: "B", totalPrice: 120000, deliveryDays: 7 },
      ],
      { budget: 80000, daysUntilRequired: 14 },
      DEFAULT_WEIGHTS,
    );
    expect(bestEligible(s2)).toBeNull();
  });
  it("fast reply alone does not beat poor delivery and quality", () => {
    const s = scoreQuotations(
      [
        { ...base, id: "fast", supplierName: "Fast", totalPrice: 100000, deliveryDays: 13, warranty: null, qualityInfo: null, vendorRating: 2.5, avgResponseHours: 1, onTimePct: 60 },
        { ...base, id: "solid", supplierName: "Solid", totalPrice: 100000, deliveryDays: 6, avgResponseHours: 40 },
      ],
      { budget: 200000, daysUntilRequired: 14 },
      DEFAULT_WEIGHTS,
    );
    expect(bestEligible(s)?.id).toBe("solid");
  });
  it("quote missing the delivery date is ineligible", () => {
    const s = scoreQuotations([{ ...base, id: "late", supplierName: "L", totalPrice: 1, deliveryDays: 30 }], { budget: 10, daysUntilRequired: 10 }, DEFAULT_WEIGHTS);
    expect(s[0].eligible).toBe(false);
  });
});

describe("rfq deadline", () => {
  it("marks sent RFQs past the deadline as no response", () => {
    expect(effectiveRfqStatus({ status: "email_sent", deadline_at: "2020-01-01" })).toBe("no_response");
    expect(effectiveRfqStatus({ status: "quotation_received", deadline_at: "2020-01-01" })).toBe("quotation_received");
  });
});
