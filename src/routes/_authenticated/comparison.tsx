import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Bot, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Empty, Loading, ErrorNote } from "@/components/status-badge";
import { inr } from "@/lib/constants";
import { pageHead } from "@/lib/meta";
import { DEFAULT_WEIGHTS, weightsTotal, type Weights } from "@/lib/scoring";
import { runComparison } from "@/lib/nexora.functions";
import { useMe } from "@/hooks/use-me";
import { QuoteReview, VerifiedBadge } from "@/components/quote-review";

export const Route = createFileRoute("/_authenticated/comparison")({
  validateSearch: z.object({ request: z.string().optional() }),
  head: pageHead("Vendor comparison", "Weighted AI comparison of supplier quotations"),
  component: Comparison,
});

const KEYS: (keyof Weights)[] = ["price", "delivery", "quality", "payment", "vendor"];

function Comparison() {
  const { request } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const compare = useServerFn(runComparison);
  const [w, setW] = useState<Weights>(DEFAULT_WEIGHTS);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (me?.company?.weights) setW({ ...DEFAULT_WEIGHTS, ...me.company.weights }); }, [me?.company?.weights]);

  const reqs = useQuery({
    queryKey: ["comparable-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_requests").select("id, request_code, item_name, quantity, status, ai_comparison").in("status", ["quotations_received", "awaiting_quotations", "rfq_sent", "pending_approval", "rejected"]).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
  const qs = useQuery({
    queryKey: ["compare-quotes", request],
    enabled: !!request,
    queryFn: async () => {
      if (!request) return [];
      const { data, error } = await supabase.from("quotations").select("*, suppliers(company_name)").eq("request_id", request);
      if (error) throw error;
      return data as any[];
    },
  });
  const qById = (id: string) => qs.data?.find((x) => x.id === id);
  const current = reqs.data?.find((r) => r.id === request);
  const result = current?.ai_comparison as any;

  async function run() {
    if (!request) return;
    setBusy(true);
    try {
      await compare({ data: { requestId: request, weights: w } });
      await qc.invalidateQueries({ queryKey: ["comparable-requests"] });
      toast.success("Comparison updated");
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }
  async function submit() {
    if (!request) return;
    if (!qById(result?.recommendedId)?.verified) return toast.error("Verify the recommended quotation first — only verified data can go for approval.");
    const { error } = await supabase.from("purchase_requests").update({ status: "pending_approval" }).eq("id", request);
    if (error) return toast.error(error.message);
    toast.success("Sent for manager approval");
    qc.invalidateQueries();
    navigate({ to: "/approvals" });
  }

  if (reqs.isLoading) return <Loading />;
  if (reqs.error) return <ErrorNote error={reqs.error} />;
  const total = weightsTotal(w);
  return (
    <div className="space-y-6">
      <PageHeader title="Vendor comparison" description="Score quotations on what matters to you. AI recommends — a manager approves." />
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1"><Label>Purchase request</Label>
          <select className="h-9 min-w-72 rounded-md border bg-background px-2 text-sm" value={request ?? ""} onChange={(e) => navigate({ to: "/comparison", search: { request: e.target.value || undefined } })}>
            <option value="">Select a request…</option>
            {(reqs.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.request_code} — {r.item_name}</option>)}
          </select>
        </div>
      </div>
      {!request ? <Empty>Pick a request with quotations to compare.</Empty> : (
        <>
          <Card><CardHeader><CardTitle className="text-base">Weights (must total 100%) — now {total}%</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              {KEYS.map((k) => (
                <div key={k} className="w-28 space-y-1"><Label className="capitalize">{k}</Label><Input type="number" min={0} max={100} value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} /></div>
              ))}
              <Button onClick={run} disabled={busy || total !== 100}><Bot className="mr-1 h-4 w-4" />{busy ? "Comparing…" : "Run comparison"}</Button>
            </CardContent>
          </Card>
          {result?.scored?.length ? (
            <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Results</CardTitle>
              {current?.status !== "pending_approval" && result.recommendedId && <Button size="sm" onClick={submit} title="Accept the AI recommendation and send for manager approval"><Send className="mr-1 h-4 w-4" />Send for approval</Button>}
            </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Quoted</TableHead><TableHead>GST & charges</TableHead><TableHead>Final cost</TableHead><TableHead>Delivery</TableHead><TableHead>Warranty</TableHead><TableHead>Payment</TableHead><TableHead>Qty match</TableHead>{KEYS.map((k) => <TableHead key={k} className="capitalize">{k}</TableHead>)}<TableHead>AI score</TableHead><TableHead>Missing / notes</TableHead><TableHead>Check</TableHead></TableRow></TableHeader>
                  <TableBody>{result.scored.map((s: any) => { const q = qById(s.id); return (
                    <TableRow key={s.id} className={s.id === result.recommendedId ? "bg-accent/50" : ""}>
                      <TableCell className="font-medium">{s.supplierName}{s.id === result.recommendedId && <span className="ml-2 text-xs text-primary">Recommended</span>}</TableCell>
                      <TableCell>{q ? inr(q.total_price) : "—"}</TableCell>
                      <TableCell className="text-xs">{q ? `${q.gst_included ? "Incl." : "+"} ${q.gst_percent}% GST` : ""}{q && Number(q.delivery_charges) > 0 ? `, +${inr(q.delivery_charges)} delivery` : ""}</TableCell>
                      <TableCell className="font-medium">{inr(s.landedCost)}</TableCell>
                      <TableCell>{q?.delivery_days ?? "—"} d</TableCell>
                      <TableCell className="text-xs">{q?.warranty ?? <span className="text-warning">missing</span>}</TableCell>
                      <TableCell className="text-xs">{q?.payment_terms ?? <span className="text-warning">missing</span>}</TableCell>
                      <TableCell className="text-xs">{q?.quantity == null ? "Not stated" : Number(q.quantity) === Number(current?.quantity ?? q.quantity) ? "Yes" : `${q.quantity}`}</TableCell>
                      {KEYS.map((k) => <TableCell key={k}>{Math.round(s.scores?.[k] ?? 0)}</TableCell>)}
                      <TableCell className="font-semibold">{Math.round(s.total)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{!s.eligible && "Not eligible. "}{(s.flags ?? []).join("; ")}</TableCell>
                      <TableCell>{q && <div className="flex flex-col items-start gap-1"><VerifiedBadge q={q} /><QuoteReview quote={q} /></div>}</TableCell>
                    </TableRow>
                  ); })}</TableBody>
                </Table>
                {result.ai && (
                  <div className="space-y-2 rounded-md border p-4 text-sm">
                    <p className="font-medium">{result.ai.summary}</p>
                    {result.ai.reasons?.length > 0 && <ul className="list-disc pl-5">{result.ai.reasons.map((r: string) => <li key={r}>{r}</li>)}</ul>}
                    {result.ai.risks?.length > 0 && <ul className="list-disc pl-5 text-destructive">{result.ai.risks.map((r: string) => <li key={r}>{r}</li>)}</ul>}
                  </div>
                )}
                {!result.recommendedId && <div className="border-l-2 border-warning pl-3 text-sm"><p className="font-medium">No eligible supplier for approval</p><p className="text-muted-foreground">{result.ai?.summary ?? "All quotations exceed the budget or miss the required delivery date."}</p><Button className="mt-2" variant="outline" size="sm" asChild><Link to="/requests/$id" params={{ id: request }}>Review request</Link></Button></div>}
                 {result.aiError && <ErrorNote error={`AI summary unavailable: ${result.aiError}`} />}
                <Link to="/requests/$id" params={{ id: request }} className="text-sm text-primary hover:underline">Open request</Link>
              </CardContent>
            </Card>
          ) : <Empty>No comparison yet. Set weights and run it.</Empty>}
        </>
      )}
    </div>
  );
}
