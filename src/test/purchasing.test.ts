import { describe, expect, it } from "vitest";
import { decisionError, poAmounts, validRating } from "../lib/purchasing";

describe("post-comparison purchasing rules", () => {
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