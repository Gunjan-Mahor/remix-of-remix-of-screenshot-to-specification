import { describe, expect, it } from "vitest";
import { isDuplicate, normalizeQuote } from "@/lib/quote-extract";

describe("normalizeQuote", () => {
  it("never guesses: missing delivery and GST are flagged for verification", () => {
    const r = normalizeQuote({ is_quotation: true, unit_price: 100, total_price: 1000, quantity: 10 }, 10);
    expect(r.ok).toBe(true);
    expect(r.needsVerification).toEqual(expect.arrayContaining(["delivery_days", "gst_percent", "gst_included", "warranty"]));
  });
  it("flags quantity mismatch with the request", () => {
    const r = normalizeQuote({ is_quotation: true, unit_price: 100, total_price: 500, quantity: 5 }, 10);
    expect(r.needsVerification).toContain("quantity");
  });
  it("rejects a quotation with no price", () => {
    expect(normalizeQuote({ is_quotation: true }, 10).ok).toBe(false);
  });
  it("detects duplicates for the same RFQ and total", () => {
    expect(isDuplicate([{ rfq_id: "a", total_price: 1000 }], "a", 1005)).toBe(true);
    expect(isDuplicate([{ rfq_id: "a", total_price: 1000 }], "b", 1000)).toBe(false);
  });
});
