import { describe, expect, it } from "vitest";
import { decisionError, poAmounts, validRating, demoQrPayload, paymentMethodError, confirmationBody } from "../lib/purchasing";

describe("post-comparison purchasing rules", () => {
  it("requires a supported payment method before confirmation", () => {
    expect(paymentMethodError(null)).toBe("Select a payment method before sending confirmation");
    expect(paymentMethodError("paid")).not.toBeNull();
    expect(["upi_demo", "bank_transfer", "on_delivery"].map(paymentMethodError)).toEqual([null, null, null]);
  });
  it("demo QR cannot initiate UPI payment", () => {
    const payload = demoQrPayload("PO-123");
    expect(payload).toContain("PO-123");
    expect(payload.startsWith("upi://")).toBe(false);
    expect(payload).not.toContain("pa=");
  });
  it("confirmation carries approved supplier, admin contact and demo payment without claiming paid", () => {
    const body = confirmationBody({ po_number: "PO-123", supplier_name: "Approved Vendor", payment_mode: "upi_demo", total_amount: 1280 }, ["admin@example.com"]);
    expect(body).toContain("Approved Vendor");
    expect(body).toContain("admin@example.com");
    expect(body).toContain("Total: INR 1280");
    expect(body).toContain("no payment has been made");
  });
  it("requires a rejection reason including for whitespace", () => {
    expect(decisionError("manager", "pending_approval", "rejected", "  ", true)).toBe("Add a rejection reason");
    expect(decisionError("manager", "pending_approval", "rejected", "Supplier cannot meet specifications", true)).toBeNull();
  });
  it("only managers and admins decide, never employees", () => {
    expect(decisionError("employee", "pending_approval", "approved", "", true)).toBe("Only managers or admins can decide");
    expect(decisionError("admin", "pending_approval", "approved", "", true)).toBeNull();
  });
  it("requires pending status and verified data", () => {
    expect(decisionError("manager", "approved", "approved", "", true)).toBe("Request is not awaiting approval");
    expect(decisionError("manager", "pending_approval", "approved", "", false)).toBe("Verify the recommended quotation first");
  });
  it("includes GST and delivery charges in INR total", () => {
    expect(poAmounts(1000, false, 18, 100, 10)).toEqual({ unitRate: 100, tax: 180, total: 1280 });
  });
  it("does not double count included GST", () => {
    expect(poAmounts(1180, true, 18, 100, 10)).toEqual({ unitRate: 100, tax: 180, total: 1280 });
  });
  it("limits supplier ratings to integer stars from 1 to 5", () => {
    expect([0, 6, 2.5].map(validRating)).toEqual([false, false, false]);
    expect([1, 5].map(validRating)).toEqual([true, true]);
  });
});
import { budgetSummary, initials, reorderFields } from "@/lib/purchasing";
import { moneyInput, quantityInput, displayNumber, safeSum } from "@/lib/purchasing";
import { inr } from "@/lib/constants";
import { scoreQuotations, DEFAULT_WEIGHTS } from "@/lib/scoring";

describe("money and quantity limits", () => {
  it("accepts only positive finite money up to exactly 1,000,000,000", () => {
    const schema = moneyInput("Budget");
    expect([0.01, 1, 1_000_000_000, "1000000000"].map((v) => schema.safeParse(v).success)).toEqual([true, true, true, true]);
    expect([0, -1, 1_000_000_001, "", "bad", NaN, Infinity, -Infinity].map((v) => schema.safeParse(v).success)).toEqual(Array(8).fill(false));
  });
  it("accepts only positive whole quantities up to exactly 1,000,000", () => {
    expect([1, 1_000_000, "1000000"].map((v) => quantityInput.safeParse(v).success)).toEqual([true, true, true]);
    expect([0, -1, 1.5, 1_000_001, "", "bad", NaN, Infinity].map((v) => quantityInput.safeParse(v).success)).toEqual(Array(8).fill(false));
  });
  it("keeps corrupt numeric data out of rendered numbers and budget calculations", () => {
    for (const value of [NaN, Infinity, -Infinity, "bad", "", null]) {
      expect(inr(value)).toBe("—");
      expect(displayNumber(value)).toBe("—");
    }
    expect(safeSum([100, "20", Infinity, "bad"])).toBe(120);
    const b = budgetSummary(NaN, [{ total_amount: Infinity, status: "sent", po_date: "2026-01-01" }], 2026);
    expect(b).toMatchObject({ spent: 0, balance: 0, committed: 0, usedPct: null });
  });
  it("invalid quotation numbers cannot contaminate valid scores or be eligible", () => {
    const base = { supplierName: "Vendor", gstIncluded: false, gstPercent: 18, deliveryDays: 5 };
    const scores = scoreQuotations([{ ...base, id: "invalid", totalPrice: Infinity }, { ...base, id: "valid", totalPrice: 100 }], { budget: 1000, daysUntilRequired: 10 }, DEFAULT_WEIGHTS);
    expect(scores.find((s) => s.id === "invalid")?.eligible).toBe(false);
    expect(scores.find((s) => s.id === "valid")?.eligible).toBe(true);
    expect(scores.every((s) => [s.total, s.landedCost, ...Object.values(s.scores)].every(Number.isFinite))).toBe(true);
  });
});
describe("yearly budget", () => {
  it("counts only this year's non-draft, non-cancelled orders as investment", () => {
    const b = budgetSummary(100000, [
      { total_amount: 30000, po_date: "2026-03-01", status: "sent" },
      { total_amount: 5000, po_date: "2026-04-01", status: "draft" },
      { total_amount: 9000, po_date: "2026-05-01", status: "cancelled" },
      { total_amount: 7000, po_date: "2025-12-01", status: "delivered" },
    ], 2026);
    expect(b).toMatchObject({ spent: 30000, committed: 5000, balance: 70000, usedPct: 30, orders: 1 });
  });
  it("shows negative balance when overspent", () => {
    expect(budgetSummary(1000, [{ total_amount: 1500, po_date: "2026-01-01", status: "delivered" }], 2026).balance).toBe(-500);
  });
});
describe("re-order and avatars", () => {
  it("copies item details but not the delivery date", () => {
    const f = reorderFields({ item_name: "Laptop", quantity: 5, required_date: "2026-01-01", budget: 900 });
    expect(f).toEqual({ item_name: "Laptop", quantity: "5", budget: "900" });
  });
  it("makes initials from names and emails", () => {
    expect(initials("Kiran Rajawat")).toBe("KR");
    expect(initials("rajawatkiran680@gmail.com")).toBe("R");
  });
});
