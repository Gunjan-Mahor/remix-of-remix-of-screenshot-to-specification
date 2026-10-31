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