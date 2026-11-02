import { PersonChip } from "@/components/person";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, Send, RefreshCw, FlaskConical, RotateCcw, Scale, FileDown, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, PageHeader, Empty, Loading, ErrorNote, DemoBadge } from "@/components/status-badge";
import { effectiveRfqStatus, fmtDate, fmtDateTime, inr } from "@/lib/constants";
import { matchSuppliers, sendRfqs, syncReplies } from "@/lib/nexora.functions";
import { pageHead } from "@/lib/meta";
import { QuoteReview, VerifiedBadge } from "@/components/quote-review";

export const Route = createFileRoute("/_authenticated/requests/$id")({
  head: pageHead("Request", "Purchase request details"),
  component: RequestDetail,
});

export async function openFile(bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
  if (error) return toast.error(error.message);
  window.open(data.signedUrl, "_blank");
}

function RequestDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const match = useServerFn(matchSuppliers);
  const send = useServerFn(sendRfqs);
  const sync = useServerFn(syncReplies);

  const q = useQuery({
    queryKey: ["request", id],
    queryFn: async () => {
      const [r, rfqs, quotes, replies, act, att] = await Promise.all([
        supabase.from("purchase_requests").select("*, approvals(id, decision, manager_id, created_at)").eq("id", id).single(),
        supabase.from("rfqs").select("*, suppliers(company_name, email, is_demo)").eq("request_id", id).order("match_score", { ascending: false }),
        supabase.from("quotations").select("*, suppliers(company_name)").eq("request_id", id).order("created_at"),
        supabase.from("email_replies").select("*").eq("request_id", id).order("received_at", { ascending: false }),
        supabase.from("activity").select("*").eq("request_id", id).order("created_at", { ascending: false }),
        supabase.from("request_attachments").select("*").eq("request_id", id),
      ]);
      if (r.error) throw r.error;
      return { req: r.data, rfqs: rfqs.data ?? [], quotes: quotes.data ?? [], replies: replies.data ?? [], act: act.data ?? [], att: att.data ?? [] };
    },
  });

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      qc.invalidateQueries();
    }
  }

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorNote error={q.error} />;
  const { req, rfqs, quotes, replies, act, att } = q.data!;
  const ex = req.ai_extraction as any;
  const demoRfqs = rfqs.filter((r: any) => r.suppliers?.is_demo);

  async function simulateDemo() {
    const pending = demoRfqs.filter((r: any) => !quotes.some((x) => x.rfq_id === r.id));
    if (!pending.length) return toast.info("All demo suppliers already have quotations");
    const target = Number(req.budget) / Number(req.quantity);
    const terms = ["Net 30", "Net 45", "50% advance, balance on delivery", "Net 15", "Net 60"];
    const rows = pending.map((r: any, i: number) => {
      const unit = Math.round(target * (0.72 + Math.random() * 0.4));
      const gstIncluded = Math.random() > 0.4;
      return {
        rfq_id: r.id, request_id: req.id, company_id: req.company_id, supplier_id: r.supplier_id,
        unit_price: unit, total_price: unit * Number(req.quantity), gst_included: gstIncluded, gst_percent: 18,
        delivery_days: 4 + Math.floor(Math.random() * 14),
        warranty: Math.random() > 0.25 ? `${1 + (i % 3)} year manufacturer warranty` : null,
        quality_info: Math.random() > 0.3 ? "Meets stated specifications; BIS/ISO certified" : null,
        payment_terms: terms[(i + Math.floor(Math.random() * 5)) % terms.length],
        notes: "SIMULATED demo quotation — not from a real supplier", source: "demo", is_demo: true,
      };
    });
    const { error } = await supabase.from("quotations").insert(rows);
    if (error) throw error;
    toast.success(`${rows.length} simulated demo quotations added`);
  }

  async function resetDemo() {
    const { error } = await supabase.from("quotations").delete().eq("request_id", req.id).eq("is_demo", true);
    if (error) throw error;
    for (const r of demoRfqs) await supabase.from("rfqs").update({ status: "pending", responded_at: null }).eq("id", r.id);
    const realLeft = quotes.filter((x) => !x.is_demo).length;
    if (!realLeft && ["quotations_received", "pending_approval"].includes(req.status)) await supabase.from("purchase_requests").update({ status: "awaiting_quotations", ai_comparison: null }).eq("id", req.id);
    toast.success("Demo quotations cleared (real data untouched)");
  }

  const closed = ["approved", "po_sent", "completed", "cancelled"].includes(req.status);

  return (
    <div className="space-y-6">
      <PageHeader title={`${req.request_code} · ${req.item_name}`} description={`${req.category} · requested by ${req.requester_name ?? "—"} on ${fmtDate(req.created_at)}`}>
        <StatusBadge status={req.status} />
      </PageHeader>
      <div className="flex flex-wrap gap-6"><PersonChip id={req.created_by} name={req.requester_name} label="Requested by" />{(req.approvals ?? []).filter((a: any) => a.decision === "approved").slice(-1).map((a: any) => <PersonChip key={a.id} id={a.manager_id} label="Approved by" />)}</div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Requirement</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            {[["Quantity", `${req.quantity} ${req.unit}`], ["Budget", inr(req.budget)], ["Needed by", fmtDate(req.required_date)], ["Delivery to", req.delivery_location], ["Payment terms", req.payment_terms || "—"], ["Quality", req.quality_requirements || "—"]].map(([k, v]) => (
              <div key={k}><div className="text-xs text-muted-foreground">{k}</div><div className="font-medium">{v}</div></div>
            ))}
            <div className="sm:col-span-3"><div className="text-xs text-muted-foreground">Specifications</div><div className="whitespace-pre-wrap">{req.specifications || "—"}</div></div>
            {req.notes && <div className="sm:col-span-3"><div className="text-xs text-muted-foreground">Notes</div><div>{req.notes}</div></div>}
            {att.length > 0 && <div className="sm:col-span-3 flex flex-wrap gap-2">{att.map((a) => <Button key={a.id} size="sm" variant="outline" onClick={() => openFile("attachments", a.path)}><FileDown className="mr-1 h-3 w-3" />{a.name}</Button>)}</div>}
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bot className="h-4 w-4 text-primary" />AI extraction</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {ex ? <dl className="space-y-1.5">{Object.entries(ex).map(([k, v]) => <div key={k}><dt className="text-xs capitalize text-muted-foreground">{k.replace(/_/g, " ")}</dt><dd>{String(v ?? "—")}</dd></div>)}</dl> : <p className="text-muted-foreground">Not available yet. Run matching to extract.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2"><CardTitle className="text-base">Matched suppliers & RFQs</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!!busy || closed} onClick={() => run("match", async () => { const r = await match({ data: { requestId: id } }); r.message ? toast.warning(r.message) : toast.success(`${r.matched} suppliers matched`); })}><Bot className="mr-1 h-4 w-4" />{busy === "match" ? "Matching…" : "Run AI matching"}</Button>
            <Button size="sm" disabled={!!busy || !rfqs.some((r) => r.status === "pending" || r.status === "error") || closed} onClick={() => run("send", async () => {
              const r = await send({ data: { requestId: id } });
              if (r.sent) toast.success(`${r.sent} RFQ email(s) sent via Gmail`);
              if (r.demo) toast.info(`${r.demo} demo supplier(s) skipped — no real email sent`);
              if (r.failed) toast.error(`${r.failed} failed: ${r.errors.join("; ")}`);
            })}><Send className="mr-1 h-4 w-4" />{busy === "send" ? "Sending…" : "Send RFQ emails"}</Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("sync", async () => { const r = await sync(); toast.success(`Inbox checked: ${r.stored} new replies, ${r.quotes} quotations extracted`); r.notes.forEach((n) => toast.warning(n)); })}><RefreshCw className="mr-1 h-4 w-4" />{busy === "sync" ? "Checking…" : "Check replies"}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {rfqs.length === 0 ? <Empty>No suppliers matched yet. Run AI matching — only registered, active suppliers in “{req.category}” are considered.</Empty> : (
            <Table>
              <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Why matched</TableHead><TableHead>Score</TableHead><TableHead>Sent</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{rfqs.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.suppliers?.company_name} {r.suppliers?.is_demo && <DemoBadge />}<div className="text-xs font-normal text-muted-foreground">{r.suppliers?.email}</div></TableCell>
                  <TableCell className="max-w-md text-sm">{r.match_reason}</TableCell>
                  <TableCell>{r.match_score ?? "—"}</TableCell><TableCell>{fmtDateTime(r.sent_at)}</TableCell><TableCell>{fmtDate(r.deadline_at)}</TableCell>
                  <TableCell><StatusBadge status={effectiveRfqStatus(r)} /></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
          {demoRfqs.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-warning/60 p-3 text-sm">
              <FlaskConical className="h-4 w-4 text-warning" /> <span className="flex-1">Demo suppliers don't receive real emails. You can simulate their quotations for a demo — they are clearly labelled.</span>
              <Button size="sm" variant="outline" disabled={!!busy || closed} onClick={() => run("demo", simulateDemo)}>Simulate demo quotations</Button>
              <Button size="sm" variant="ghost" disabled={!!busy || closed} onClick={() => run("reset", resetDemo)}><RotateCcw className="mr-1 h-4 w-4" />Reset demo data</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Quotations ({quotes.length})</CardTitle>
          {quotes.length > 0 && <Button size="sm" asChild><Link to="/comparison" search={{ request: id }}><Scale className="mr-1 h-4 w-4" />Compare quotations</Link></Button>}
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? <Empty>No quotations yet.</Empty> : <QuoteTable quotes={quotes} />}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Supplier email replies</CardTitle></CardHeader>
          <CardContent>{replies.length === 0 ? <Empty>No replies received yet.</Empty> : <div className="space-y-3">{replies.map((r) => (
            <div key={r.id} className="rounded-md border p-3 text-sm"><div className="flex justify-between gap-2"><b>{r.sender}</b><span className="text-xs text-muted-foreground">{fmtDateTime(r.received_at)}</span></div><div className="text-xs text-muted-foreground">{r.subject}</div><p className="mt-2 line-clamp-4 whitespace-pre-wrap">{r.body}</p>{(r.attachments as any[]).length > 0 && <div className="mt-1 text-xs text-muted-foreground">Attachments: {(r.attachments as any[]).map((a) => a.filename).join(", ")}</div>}</div>
          ))}</div>}</CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-base">Status history</CardTitle></CardHeader>
          <CardContent><ol className="space-y-2 text-sm">{act.map((a) => <li key={a.id} className="flex justify-between gap-3"><span>{a.message}</span><span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</span></li>)}</ol>
            {!closed && req.status !== "pending_approval" && <Button size="sm" variant="ghost" className="mt-4 text-destructive" onClick={() => run("cancel", async () => { const { error } = await supabase.from("purchase_requests").update({ status: "cancelled" }).eq("id", id); if (error) throw error; toast.success("Request cancelled"); })}><XCircle className="mr-1 h-4 w-4" />Cancel request</Button>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function QuoteTable({ quotes }: { quotes: any[] }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Unit</TableHead><TableHead>Total</TableHead><TableHead>GST</TableHead><TableHead>Delivery</TableHead><TableHead>Warranty</TableHead><TableHead>Payment</TableHead><TableHead>Source</TableHead><TableHead>Check</TableHead><TableHead /></TableRow></TableHeader>
      <TableBody>{quotes.map((x) => (
        <TableRow key={x.id}>
          <TableCell className="font-medium">{x.suppliers?.company_name} {x.is_demo && <DemoBadge />}</TableCell>
          <TableCell>{inr(x.unit_price)}</TableCell><TableCell>{inr(x.total_price)}{Number(x.delivery_charges) > 0 && <div className="text-xs text-muted-foreground">+{inr(x.delivery_charges)} delivery</div>}</TableCell><TableCell>{x.gst_included ? `Incl. ${x.gst_percent}%` : `Extra ${x.gst_percent}%`}</TableCell>
          <TableCell>{x.delivery_days} days</TableCell><TableCell>{x.warranty ?? <span className="text-warning">missing</span>}</TableCell><TableCell>{x.payment_terms ?? "—"}</TableCell>
          <TableCell className="capitalize">{x.source}</TableCell>
          <TableCell><VerifiedBadge q={x} /></TableCell>
          <TableCell className="flex gap-1"><QuoteReview quote={x} />{x.pdf_path && <Button size="sm" variant="ghost" onClick={() => openFile("quotations", x.pdf_path)}><FileDown className="h-4 w-4" /></Button>}</TableCell>
        </TableRow>
      ))}</TableBody>
    </Table>
  );
}
