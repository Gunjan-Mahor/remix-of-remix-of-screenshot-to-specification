export const CATEGORIES = [
  "Furniture",
  "IT & Electronics",
  "Office Supplies",
  "Hardware & Tools",
  "Safety Equipment",
  "Printing & Stationery",
  "Logistics & Shipping",
  "Facility Services",
  "Industrial Parts",
  "Other",
] as const;

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  created: "Created",
  rfq_sent: "RFQ sent",
  awaiting_quotations: "Awaiting quotations",
  quotations_received: "Quotations received",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  po_sent: "PO sent",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const RFQ_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  email_sent: "Email sent",
  response_received: "Response received",
  quotation_received: "Quotation received",
  no_response: "No response",
  error: "Error",
};

export type Tone = "default" | "success" | "warning" | "danger" | "info";

export function toneFor(status: string): Tone {
  if (["approved", "completed", "quotation_received", "delivered", "sent", "po_sent", "resolved"].includes(status)) return "success";
  if (["rejected", "error", "failed", "no_response", "cancelled", "open"].includes(status)) return "danger";
  if (["pending_approval", "pending", "awaiting_quotations", "email_sent", "rfq_sent", "draft", "response_received", "in_transit", "skipped_demo"].includes(status)) return "warning";
  return "info";
}

/** An RFQ with no quotation after its deadline counts as No Response (derived, never deleted). */
export function effectiveRfqStatus(r: { status: string; deadline_at: string | null }, now = new Date()): string {
  if ((r.status === "email_sent" || r.status === "pending") && r.deadline_at && new Date(r.deadline_at) < now) return "no_response";
  return r.status;
}

export const inr = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n));

export const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
export const fmtDateTime = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
