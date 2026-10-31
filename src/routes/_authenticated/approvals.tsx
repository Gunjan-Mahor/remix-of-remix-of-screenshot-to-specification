import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Empty, Loading, ErrorNote, StatusBadge } from "@/components/status-badge";
import { inr, fmtDate, fmtDateTime } from "@/lib/constants";
import { pageHead } from "@/lib/meta";
import { useMe, canApprove } from "@/hooks/use-me";
import { decisionError } from "@/lib/purchasing";
import { landedCost } from "@/lib/scoring";
import { QuoteReview, VerifiedBadge } from "@/components/quote-review";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: pageHead("Approvals", "Approve or reject recommended suppliers"),
  component: Approvals,
});

function Approvals() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const q = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_requests").select("*, quotations(*, suppliers(company_name, email, phone, vendor_scores(rating, is_demo))), approvals(*)").in("status", ["pending_approval", "approved", "rejected"]).order("updated_at", { ascending: false });
      if (error) throw error;
      const { data: pos } = await supabase.from("purchase_orders").select("request_id");
      const hasPo = new Set((pos ?? []).map((p) => p.request_id));
      return (data as any[]).map((r) => ({ ...r, hasPo: hasPo.has(r.id) }));
    },
  });
  const allowed = canApprove(me);

  async function decide(r: any, decision: "approved" | "rejected") {
    if (!me) return;
    const quotationId = r.ai_comparison?.recommendedId ?? null;
    const rec = r.quotations.find((x: any) => x.id === quotationId);
    const reason = (comments[r.id] ?? "").trim();
    const issue = decisionError(me.membership?.role, r.status, decision, reason, !!rec?.verified);
    if (issue) return toast.error(issue);
    setBusy(r.id);
    try {
      const { error } = await supabase.from("approvals").insert({ request_id: r.id, company_id: r.company_id, quotation_id: quotationId, decision, manager_id: me.userId, comments: reason || null });
      if (error) throw error;
      toast.success(decision === "approved" ? "Approved — ready to create a draft purchase order" : "Rejected with reason recorded");
      await qc.invalidateQueries();
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }
  async function createPo(r: any) {
    setBusy(r.id);
    try {
      const { error } = await supabase.rpc("create_approved_po", { _request_id: r.id });
      if (error) throw error;
      toast.success("Draft purchase order created from the approved quotation");
      await qc.invalidateQueries();
      navigate({ to: "/orders" });
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorNote error={q.error} />;
  const rows = q.data ?? [];
  return (
    <div>
      <PageHeader title="Approvals" description={allowed ? "Review the recommended supplier and decide." : "Only managers and admins can approve. You can view status here."} />
      {rows.length === 0 ? <Empty>Nothing awaiting approval.</Empty> : (
        <div className="space-y-4">{rows.map((r) => {
          const rec = r.quotations.find((x: any) => x.id === r.ai_comparison?.recommendedId);
          return (
            <Card key={r.id}><CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><Link to="/requests/$id" params={{ id: r.id }} className="font-semibold text-primary hover:underline">{r.request_code}</Link> — {r.item_name} · {r.quantity} {r.unit}</div>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-sm text-muted-foreground">Budget {inr(r.budget)} · needed by {fmtDate(r.required_date)}</div>
              {rec ? <div className="text-sm">Recommended: <b>{rec.suppliers?.company_name}</b> at {inr(landedCost({ totalPrice: Number(rec.total_price), gstIncluded: rec.gst_included, gstPercent: Number(rec.gst_percent), deliveryCharges: Number(rec.delivery_charges) }))} including GST and delivery · {rec.delivery_days} days</div> : <div className="text-sm text-muted-foreground">No eligible recommendation — review the delivery date and quotations before comparing again.</div>}
              {r.ai_comparison?.ai?.summary && <p className="text-sm text-muted-foreground">{r.ai_comparison.ai.summary}</p>}
              <Table>
                <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Total including GST</TableHead><TableHead>Delivery</TableHead><TableHead>Rating</TableHead><TableHead>Advantages / risks</TableHead><TableHead>Verification</TableHead></TableRow></TableHeader>
                <TableBody>{r.quotations.map((qt: any) => { const score = r.ai_comparison?.scored?.find((x: any) => x.id === qt.id); return <TableRow key={qt.id} className={qt.id === rec?.id ? "bg-accent/50" : ""}>
                  <TableCell>{qt.suppliers?.company_name}{qt.is_demo && <span className="ml-2 text-xs text-warning">Demo</span>}</TableCell>
                  <TableCell>{inr(landedCost({ totalPrice: Number(qt.total_price), gstIncluded: qt.gst_included, gstPercent: Number(qt.gst_percent), deliveryCharges: Number(qt.delivery_charges) }))}</TableCell>
                  <TableCell>{qt.delivery_days} days</TableCell><TableCell>{qt.suppliers?.vendor_scores?.rating ?? "No history"}{qt.suppliers?.vendor_scores?.is_demo && " (demo)"}</TableCell>
                  <TableCell className="max-w-sm whitespace-normal text-xs">{qt.warranty ?? "Warranty not stated"} · {qt.payment_terms ?? "Terms not stated"}<div className="text-muted-foreground">{score?.flags?.join("; ")}</div></TableCell>
                  <TableCell><VerifiedBadge q={qt} /><QuoteReview quote={qt} /></TableCell>
                </TableRow>; })}</TableBody>
              </Table>
              {r.ai_comparison?.ai?.reasons?.length > 0 && <ul className="list-disc pl-5 text-sm">{r.ai_comparison.ai.reasons.map((reason: string) => <li key={reason}>{reason}</li>)}</ul>}
              {r.ai_comparison?.ai?.risks?.length > 0 && <ul className="list-disc pl-5 text-sm text-destructive">{r.ai_comparison.ai.risks.map((risk: string) => <li key={risk}>{risk}</li>)}</ul>}
              {(r.approvals ?? []).map((a: any) => <div key={a.id} className="border-t pt-2 text-xs text-muted-foreground"><b className="capitalize">{a.decision}</b> · {fmtDateTime(a.created_at)} · Manager {a.manager_id}{a.comments && <p className="mt-1 text-sm text-foreground">{a.comments}</p>}</div>)}
              {r.status === "rejected" && <Button variant="outline" asChild><Link to="/comparison" search={{ request: r.id }}>Review comparison</Link></Button>}
              {r.status === "pending_approval" && allowed && (
                <div className="space-y-2">
                  <Textarea placeholder="Comments (required to reject)" value={comments[r.id] ?? ""} onChange={(e) => setComments({ ...comments, [r.id]: e.target.value })} />
                  <div className="flex gap-2"><Button onClick={() => decide(r, "approved")} disabled={!!busy || !rec?.verified}>Approve</Button><Button variant="outline" onClick={() => decide(r, "rejected")} disabled={!!busy || !(comments[r.id] ?? "").trim()}>Reject</Button></div>
                </div>
              )}
              {r.status === "approved" && allowed && !r.hasPo && <Button onClick={() => createPo(r)} disabled={!!busy}>Create purchase order</Button>}
              {r.hasPo && <Link to="/orders" className="text-sm text-primary hover:underline">View purchase order</Link>}
            </CardContent></Card>
          );
        })}</div>
      )}
    </div>
  );
}
