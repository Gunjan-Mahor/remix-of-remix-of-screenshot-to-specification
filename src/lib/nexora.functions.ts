import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeQuote, isDuplicate, EXTRACT_SCHEMA_HINT } from "@/lib/quote-extract";
import { scoreQuotations, bestEligible, DEFAULT_WEIGHTS, type Weights } from "@/lib/scoring";
import { CATEGORIES } from "@/lib/constants";
import { confirmationBody, paymentMethodError } from "@/lib/purchasing";

const idInput = z.object({ requestId: z.string().uuid() });

async function memberContext(supabase: any, userId: string) {
  const { data: m } = await supabase.from("company_members").select("company_id, role").eq("user_id", userId).maybeSingle();
  if (!m) throw new Error("You are not a member of a purchasing company");
  return m as { company_id: string; role: "admin" | "manager" | "employee" };
}

export const getIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { gmailConfigured, gmailProfile } = await import("@/server/gmail.server");
    const configured = gmailConfigured();
    const profile = configured ? await gmailProfile() : null;
    return { gmailConfigured: configured, gmailConnected: !!profile, gmailAddress: profile?.emailAddress ?? null, aiConfigured: !!process.env.LOVABLE_API_KEY };
  });

export const matchSuppliers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await memberContext(supabase, userId);
    const { data: req, error } = await supabase.from("purchase_requests").select("*").eq("id", data.requestId).single();
    if (error || !req) throw new Error("Request not found");
    const { data: sups } = await supabase
      .from("suppliers")
      .select("id, company_name, categories, delivery_capabilities, description, is_demo, supplier_products(name, specifications, indicative_price, lead_time_days), vendor_scores(rating, on_time_pct, avg_response_hours)")
      .eq("is_active", true)
      .contains("categories", [req.category]);
    const candidates = (sups ?? []) as any[];
    if (!candidates.length) return { matched: 0, aiUsed: false, message: `No registered active suppliers in "${req.category}".` };

    const { generateJson } = await import("@/server/ai/ai.server");
    let aiUsed = true;
    let extraction: any = null;
    let picks: { supplier_id: string; score: number; reason: string }[] = [];
    try {
      const out = await generateJson<{ extraction: any; matches: { supplier_id: string; score: number; reason: string }[] }>(
        "You are a procurement analyst for Indian B2B companies. Only use supplier IDs from the provided list. Never invent suppliers.",
        `Purchase request:\n${JSON.stringify({ item: req.item_name, category: req.category, quantity: req.quantity, unit: req.unit, budget_inr: req.budget, delivery_location: req.delivery_location, required_date: req.required_date, specifications: req.specifications, quality: req.quality_requirements, payment_terms: req.payment_terms, notes: req.notes })}\n\nCandidate suppliers:\n${JSON.stringify(
          candidates.map((s) => ({ supplier_id: s.id, name: s.company_name, categories: s.categories, delivery: s.delivery_capabilities, description: s.description, products: s.supplier_products, performance: s.vendor_scores })),
        )}\n\nReturn {"extraction":{"item":string,"quantity":number,"unit":string,"specifications":string,"budget_inr":number,"delivery_deadline":string,"quality_requirements":string},"matches":[{"supplier_id":string,"score":0-100,"reason":"one or two sentences citing category, capability, delivery, performance"}]} ranking up to 5 best suppliers (at least 3 if available).`,
      );
      extraction = out.extraction ?? null;
      const valid = new Set(candidates.map((c) => c.id));
      picks = (out.matches ?? []).filter((m) => valid.has(m.supplier_id)).slice(0, 5);
    } catch (e) {
      aiUsed = false;
      console.error("AI matching failed", e);
    }
    if (picks.length < Math.min(3, candidates.length)) {
      const have = new Set(picks.map((p) => p.supplier_id));
      const rest = candidates
        .filter((c) => !have.has(c.id))
        .sort((a, b) => (b.vendor_scores?.rating ?? 0) - (a.vendor_scores?.rating ?? 0))
        .slice(0, Math.min(3, candidates.length) - picks.length)
        .map((c) => ({ supplier_id: c.id, score: Math.round((c.vendor_scores?.rating ?? 3) * 20), reason: `Registered in ${req.category}${c.vendor_scores ? `, rating ${c.vendor_scores.rating}/5` : ""}${aiUsed ? "" : " (rule-based match — AI unavailable)"}.` }));
      picks = [...picks, ...rest];
    }
    const rows = picks.map((p) => ({ request_id: req.id, company_id: req.company_id, supplier_id: p.supplier_id, match_score: p.score, match_reason: p.reason }));
    const { error: insErr } = await supabase.from("rfqs").upsert(rows, { onConflict: "request_id,supplier_id", ignoreDuplicates: true });
    if (insErr) throw new Error(insErr.message);
    if (extraction) await supabase.from("purchase_requests").update({ ai_extraction: extraction }).eq("id", req.id);
    await supabase.from("activity").insert({ company_id: req.company_id, request_id: req.id, event_type: "vendors_matched", message: `${req.request_code}: ${rows.length} suppliers matched${aiUsed ? " by AI" : " (rule-based)"}`, actor_id: userId });
    return { matched: rows.length, aiUsed, message: null };
  });

function rfqEmail(req: any, supplierName: string, company: any) {
  return `Dear ${supplierName} team,

${company?.name ?? "Our company"} invites you to quote for the following requirement.

Request ID: ${req.request_code}
Item: ${req.item_name}
Category: ${req.category}
Quantity: ${req.quantity} ${req.unit}
Specifications: ${req.specifications || "As per standard"}
Quality requirements: ${req.quality_requirements || "Standard commercial quality"}
Delivery location: ${req.delivery_location}
Required delivery by: ${req.required_date}
Preferred payment terms: ${req.payment_terms || "Open to proposal"}

How to quote:
Reply to this email keeping the subject tag [RFQ-${req.request_code}] unchanged, and include:
- Unit price and total price (INR), stating whether GST is included and the GST rate
- Delivery time in days
- Warranty / quality certifications
- Payment terms
You may attach a PDF quotation. Registered Nexora suppliers can also submit directly in the supplier portal.

Regards,
Procurement team, ${company?.name ?? ""}
${company?.phone ?? ""}`;
}

export const sendRfqs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const m = await memberContext(supabase, userId);
    const { data: req } = await supabase.from("purchase_requests").select("*").eq("id", data.requestId).single();
    if (!req) throw new Error("Request not found");
    const { data: company } = await supabase.from("companies").select("*").eq("id", m.company_id).single();
    const { data: rfqs } = await supabase.from("rfqs").select("*, suppliers(company_name, email, is_demo)").eq("request_id", req.id).in("status", ["pending", "error"]);
    const { sendGmail, gmailConfigured } = await import("@/server/gmail.server");
    const deadline = new Date(Date.now() + (company?.response_deadline_days ?? 7) * 86400000).toISOString();
    const results = { sent: 0, failed: 0, demo: 0, errors: [] as string[] };
    for (const r of (rfqs ?? []) as any[]) {
      const s = r.suppliers;
      const subject = `[RFQ-${req.request_code}] Request for Quotation: ${req.item_name}`;
      if (s.is_demo) {
        await supabase.from("email_logs").insert({ company_id: m.company_id, request_id: req.id, supplier_id: r.supplier_id, recipient: s.email, subject, kind: "rfq", status: "skipped_demo", error: "Demo supplier — no real email sent" });
        await supabase.from("rfqs").update({ deadline_at: deadline }).eq("id", r.id);
        results.demo++;
        continue;
      }
      try {
        if (!gmailConfigured()) throw new Error("Gmail is not connected");
        const gid = await sendGmail(s.email, subject, rfqEmail(req, s.company_name, company));
        await supabase.from("email_logs").insert({ company_id: m.company_id, request_id: req.id, supplier_id: r.supplier_id, recipient: s.email, subject, kind: "rfq", status: "sent", gmail_message_id: gid });
        await supabase.from("rfqs").update({ status: "email_sent", sent_at: new Date().toISOString(), deadline_at: deadline }).eq("id", r.id);
        results.sent++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabase.from("email_logs").insert({ company_id: m.company_id, request_id: req.id, supplier_id: r.supplier_id, recipient: s.email, subject, kind: "rfq", status: "failed", error: msg });
        await supabase.from("rfqs").update({ status: "error" }).eq("id", r.id);
        results.failed++;
        results.errors.push(`${s.company_name}: ${msg}`);
      }
    }
    if (results.sent > 0 || results.demo > 0) {
      await supabase.from("purchase_requests").update({ status: results.sent > 0 ? "rfq_sent" : "awaiting_quotations" }).eq("id", req.id).in("status", ["created", "rfq_sent", "awaiting_quotations"]);
    }
    return results;
  });

export const syncReplies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const m = await memberContext(supabase, userId);
    const { gmailConfigured, searchReplies, getAttachment } = await import("@/server/gmail.server");
    if (!gmailConfigured()) throw new Error("Gmail is not connected");
    const { data: reqs } = await supabase.from("purchase_requests").select("id, request_code, quantity, item_name").eq("company_id", m.company_id).in("status", ["rfq_sent", "awaiting_quotations", "quotations_received"]);
    const { generateJson } = await import("@/server/ai/ai.server");
    let stored = 0;
    let quotes = 0;
    const notes: string[] = [];
    for (const req of (reqs ?? []) as any[]) {
      const msgs = await searchReplies(`subject:"RFQ-${req.request_code}" -in:sent newer_than:60d`);
      const { data: rfqs } = await supabase.from("rfqs").select("id, supplier_id, status, suppliers(email)").eq("request_id", req.id);
      for (const msg of msgs) {
        const rfq = (rfqs ?? []).find((r: any) => r.suppliers?.email?.toLowerCase() === msg.from);
        const { data: existing } = await supabase.from("email_replies").select("id").eq("gmail_message_id", msg.id).maybeSingle();
        if (existing) continue;
        const { data: replyRow } = await supabase.from("email_replies").insert({ company_id: m.company_id, request_id: req.id, rfq_id: rfq?.id ?? null, supplier_id: rfq?.supplier_id ?? null, sender: msg.from, subject: msg.subject, body: msg.body, received_at: msg.receivedAt, gmail_message_id: msg.id, attachments: msg.attachments.map(({ attachmentId: _a, ...a }) => a) }).select("id").single();
        stored++;
        if (!rfq) {
          notes.push(`Reply from unregistered sender ${msg.from} stored but not linked.`);
          continue;
        }
        if (rfq.status !== "quotation_received") await supabase.from("rfqs").update({ status: "response_received", responded_at: msg.receivedAt }).eq("id", rfq.id);
        try {
          // Download readable attachments (PDF, images, scans) — up to 5 files, 8 MB each.
          const files: { mimeType: string; base64: string; filename: string }[] = [];
          for (const att of msg.attachments) {
            const mt = (att.mimeType ?? "").toLowerCase();
            if (!att.attachmentId || !(mt === "application/pdf" || mt.startsWith("image/")) || (att.size ?? 0) > 8_000_000 || files.length >= 5) continue;
            const b = await getAttachment(msg.id, att.attachmentId);
            if (b) files.push({ mimeType: mt, base64: b, filename: att.filename });
          }
          const skipped = msg.attachments.filter((a) => !files.some((f) => f.filename === a.filename)).map((a) => a.filename);
          const q = await generateJson<any>(
            "You read supplier quotations in any format: email text, PDFs (all pages), photos and scanned documents, any layout or language. Extract values into the standard schema. Use null for anything not explicitly stated — NEVER guess. List field names you could not read clearly in unclear_fields, and describe contradictory values (e.g. different prices in email vs PDF) in conflicts. Prices in the quoted currency as plain numbers.",
            `Our RFQ reference: RFQ-${req.request_code}\nRequested item: ${req.item_name}, quantity ${req.quantity}\nSender email: ${msg.from}\nEmail subject: ${msg.subject}\nEmail body:\n${msg.body}\n${files.length ? `${files.length} attachment(s) are included for you to read.` : "No readable attachments."}${skipped.length ? ` Unreadable attachments: ${skipped.join(", ")}.` : ""}\nReturn ${EXTRACT_SCHEMA_HINT}`,
            files,
          );
          const n = normalizeQuote(q, Number(req.quantity));
          if (!n.ok) {
            if (q.is_quotation) notes.push(`Reply from ${msg.from} on ${req.request_code}: ${n.reason} — needs clarification from the supplier.`);
            continue;
          }
          const { data: prior } = await supabase.from("quotations").select("rfq_id, total_price").eq("request_id", req.id);
          if (isDuplicate((prior ?? []) as any[], rfq.id, n.row.total_price)) {
            notes.push(`Duplicate quotation from ${msg.from} on ${req.request_code} skipped.`);
            continue;
          }
          const issues = [...n.issues];
          if (q.rfq_reference && !String(q.rfq_reference).includes(req.request_code)) issues.push(`Document mentions reference "${q.rfq_reference}"`);
          if (skipped.length) issues.push(`Not read by AI: ${skipped.join(", ")}`);
          const qid = crypto.randomUUID();
          const stored_files: { name: string; path: string; mimeType: string }[] = [];
          for (const f of files) {
            const path = `${rfq.id}/${qid}-${f.filename.replace(/[^\w.\-]+/g, "_")}`;
            const bytes = Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0));
            const { error: upErr } = await supabase.storage.from("quotations").upload(path, bytes, { contentType: f.mimeType });
            if (!upErr) stored_files.push({ name: f.filename, path, mimeType: f.mimeType });
          }
          const { error: insErr } = await supabase.from("quotations").insert({
            id: qid, rfq_id: rfq.id, request_id: req.id, company_id: m.company_id, supplier_id: rfq.supplier_id, ...n.row,
            needs_verification: n.needsVerification, ai_issues: issues, email_reply_id: replyRow?.id ?? null, source_files: stored_files,
            pdf_path: stored_files.find((f) => f.mimeType === "application/pdf")?.path ?? stored_files[0]?.path ?? null,
            notes: "Extracted by AI — a manager must verify before approval", source: "email", created_by: userId,
          });
          if (insErr) notes.push(`Could not save quotation from ${msg.from}: ${insErr.message}`);
          else quotes++;
        } catch (e) {
          notes.push(`AI could not read reply from ${msg.from}: ${e instanceof Error ? e.message : e}`);
        }
      }
    }
    return { stored, quotes, notes };
  });

const compareInput = z.object({ requestId: z.string().uuid(), weights: z.any().optional() });

export const runComparison = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => compareInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await memberContext(supabase, userId);
    // No manual weights: fixed internal balance; AI decides using past vendor performance and fit to the request.
    const w: Weights = DEFAULT_WEIGHTS;
    const { data: req } = await supabase.from("purchase_requests").select("*").eq("id", data.requestId).single();
    if (!req) throw new Error("Request not found");
    const { data: qs } = await supabase.from("quotations").select("*, suppliers(company_name, vendor_scores(rating, avg_response_hours, on_time_pct))").eq("request_id", req.id);
    const { data: fb } = await supabase.from("vendor_feedback").select("supplier_id, rating, on_time");
    const quotes = ((qs ?? []) as any[]).map((q) => {
      const vf = (fb ?? []).filter((f: any) => f.supplier_id === q.supplier_id);
      const vs = q.suppliers?.vendor_scores;
      const rating = vf.length ? vf.reduce((a: number, f: any) => a + f.rating, 0) / vf.length : vs?.rating ?? null;
      const onTime = vf.length ? (vf.filter((f: any) => f.on_time).length / vf.length) * 100 : vs?.on_time_pct ?? null;
      return { id: q.id, supplierName: q.suppliers?.company_name ?? "Supplier", totalPrice: Number(q.total_price), deliveryCharges: Number(q.delivery_charges ?? 0), needsVerification: q.verified ? [] : q.needs_verification ?? [], verified: !!q.verified, gstIncluded: q.gst_included, gstPercent: Number(q.gst_percent), deliveryDays: q.delivery_days, warranty: q.warranty, qualityInfo: q.quality_info, paymentTerms: q.payment_terms, vendorRating: rating == null ? null : Number(rating), avgResponseHours: vs?.avg_response_hours ?? null, onTimePct: onTime == null ? null : Number(onTime), isDemo: q.is_demo };
    });
    const daysUntil = Math.max(0, Math.ceil((new Date(req.required_date).getTime() - Date.now()) / 86400000));
    const scored = scoreQuotations(quotes, { budget: Number(req.budget), daysUntilRequired: daysUntil }, w);
    const best = bestEligible(scored);
    let ai: { recommended_quotation_id: string | null; summary: string; reasons: string[]; risks: string[]; insufficient_evidence: boolean } | null = null;
    let aiError: string | null = null;
    if (scored.length) {
      try {
        const { generateJson } = await import("@/server/ai/ai.server");
        ai = await generateJson(
          "You are a procurement advisor. Recommend only; humans approve. Rank vendors primarily by (1) their past performance with us (rating, on-time %, response time, completed orders) and (2) how closely the quotation matches the purchase request (item, quantity, specifications, quality requirements, payment terms, budget, delivery date). The numeric scores are only supporting signals. Base the recommendation only on the extracted quotation data given; never invent values. Explain cost advantages, delivery advantages, quality/warranty, risks and missing information, and why each other supplier scored lower (put those in reasons). Never choose a supplier solely for lowest price or fastest reply. Only recommend an eligible quotation (within budget and meeting the date). If evidence is weak or missing, set insufficient_evidence true and explain.",
          `Request: ${JSON.stringify({ item: req.item_name, qty: req.quantity, budget_inr: req.budget, required_in_days: daysUntil, specs: req.specifications, quality: req.quality_requirements })}\nScored quotations (0-100 per criterion):\n${JSON.stringify(scored.map((s) => ({ ...s, raw: quotes.find((q) => q.id === s.id) })))}\nReturn {"recommended_quotation_id":string|null,"summary":string,"reasons":string[],"risks":string[],"insufficient_evidence":boolean}`,
        );
        if (ai && ai.recommended_quotation_id && !scored.find((s) => s.id === ai!.recommended_quotation_id && s.eligible)) {
          ai.risks = [...(ai.risks ?? []), "AI suggested an ineligible quotation; recommendation reset to the top eligible score."];
          ai.recommended_quotation_id = best?.id ?? null;
        }
      } catch (e) {
        aiError = e instanceof Error ? e.message : String(e);
      }
    }
    const result = { weights: w, scored, recommendedId: ai?.recommended_quotation_id ?? best?.id ?? null, ai, aiError, generatedAt: new Date().toISOString() };
    await supabase.from("purchase_requests").update({ ai_comparison: result as any }).eq("id", req.id);
    await supabase.from("activity").insert({ company_id: req.company_id, request_id: req.id, event_type: "comparison", message: `${req.request_code}: ${scored.length} quotations compared`, actor_id: userId });
    return result;
  });

export const getCompanyAdminEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await memberContext(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("company_members").select("profiles(email)").eq("company_id", m.company_id).eq("role", "admin");
    if (error) throw new Error(error.message);
    return [...new Set((data ?? []).flatMap((row) => row.profiles?.email ? [row.profiles.email] : []))];
  });

export const sendPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ poId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const m = await memberContext(supabase, userId);
    if (m.role === "employee") throw new Error("Only managers or admins can send purchase orders");
    const { data: po } = await supabase.from("purchase_orders").select("*, suppliers(is_demo), purchase_requests(request_code, status), quotations(verified)").eq("id", data.poId).eq("company_id", m.company_id).single();
    if (!po) throw new Error("PO not found");
    if (po.status !== "draft") throw new Error("Only draft purchase orders can be sent");
    if (!po.quotations?.verified) throw new Error("Verify the approved quotation before sending confirmation");
    const paymentIssue = paymentMethodError(po.payment_mode);
    if (paymentIssue) throw new Error(paymentIssue);
    if ((po as any).suppliers?.is_demo) return { ok: false, emailStatus: "skipped_demo" as const, error: "Demo supplier — no real email sent; order remains a draft" };
    if (!["approved", "po_sent"].includes((po as any).purchase_requests?.status)) throw new Error("Request is not approved");
    const subject = `[${po.po_number}] Purchase Order for ${po.item_name} (ref RFQ-${(po as any).purchase_requests?.request_code})`;
    const { data: admins, error: adminError } = await supabase.from("company_members").select("profiles(email)").eq("company_id", m.company_id).eq("role", "admin");
    if (adminError) throw new Error(adminError.message);
    const adminEmails = (admins ?? []).flatMap((row) => row.profiles?.email ? [row.profiles.email] : []);
    const body = confirmationBody(po, adminEmails);
    let emailStatus: "sent" | "failed" | "skipped_demo" = "sent";
    let err: string | null = null;
    let gid: string | null = null;
    if ((po as any).suppliers?.is_demo) {
      emailStatus = "skipped_demo";
      err = "Demo supplier — no real email sent";
    } else {
      try {
        const { sendGmail } = await import("@/server/gmail.server");
        gid = await sendGmail(po.supplier_email, subject, body);
      } catch (e) {
        emailStatus = "failed";
        err = e instanceof Error ? e.message : String(e);
      }
    }
    const { error: logError } = await supabase.from("email_logs").insert({ company_id: m.company_id, request_id: po.request_id, po_id: po.id, supplier_id: po.supplier_id, recipient: po.supplier_email, subject, kind: "po", status: emailStatus, error: err, gmail_message_id: gid });
    if (logError) throw new Error(`${emailStatus === "sent" ? "Email sent, but" : "Email failed and"} confirmation history could not be saved: ${logError.message}`);
    if (emailStatus === "failed") return { ok: false, emailStatus, error: err };
    const { error: updateError } = await supabase.from("purchase_orders").update({ status: "sent" }).eq("id", po.id).eq("status", "draft");
    if (updateError) throw new Error(`Email sent, but order status could not be saved: ${updateError.message}`);
    return { ok: true, emailStatus, error: err };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: m } = await supabase.from("company_members").select("company_id").eq("user_id", userId).maybeSingle();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (m) {
      const { count } = await supabaseAdmin.from("company_members").select("id", { count: "exact", head: true }).eq("company_id", m.company_id);
      if ((count ?? 0) <= 1) await supabaseAdmin.from("companies").delete().eq("id", m.company_id);
    }
    await supabaseAdmin.from("suppliers").update({ is_active: false }).eq("user_id", userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const draftInput = z.object({ text: z.string().trim().min(5).max(3000) });
export const draftRequestWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => draftInput.parse(d))
  .handler(async ({ data, context }) => {
    await memberContext(context.supabase, context.userId);
    const today = new Date().toISOString().slice(0, 10);
    const { generateJson } = await import("@/server/ai/ai.server");
    try {
      const r = await generateJson<Record<string, unknown>>(
        `You fill a purchase request form from a user's plain description. Today is ${today}. Only use facts the user gave; leave a field null when not stated — never invent budgets, dates or locations. category must be one of: ${CATEGORIES.join(", ")}. required_date is YYYY-MM-DD. budget is INR including GST.`,
        `Description:\n${data.text}\nReturn {"item_name":string|null,"category":string|null,"quantity":number|null,"unit":string|null,"budget":number|null,"delivery_location":string|null,"required_date":string|null,"specifications":string|null,"quality_requirements":string|null,"payment_terms":string|null,"notes":string|null,"missing":string[]}`,
      );
      const fields: Record<string, string> = {};
      for (const k of ["item_name","category","quantity","unit","budget","delivery_location","required_date","specifications","quality_requirements","payment_terms","notes"]) {
        const v = r[k];
        if (v == null || v === "") continue;
        if (k === "category" && !(CATEGORIES as readonly string[]).includes(String(v))) continue;
        fields[k] = String(v);
      }
      return { fields, missing: Array.isArray(r.missing) ? (r.missing as unknown[]).map(String) : [], error: null as string | null };
    } catch (e) {
      return { fields: {}, missing: [], error: e instanceof Error ? e.message : "AI request failed" };
    }
  });
