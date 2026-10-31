import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Empty, Loading, ErrorNote } from "@/components/status-badge";
import { fmtDate } from "@/lib/constants";
import { pageHead } from "@/lib/meta";
import { useMe } from "@/hooks/use-me";
import { validRating } from "@/lib/purchasing";

export const Route = createFileRoute("/_authenticated/ratings")({
  head: pageHead("Vendor ratings", "Rate suppliers after delivery"),
  component: Ratings,
});

function Ratings() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, { rating: number; quality: number; onTime: boolean; comments: string }>>({});
  const q = useQuery({
    queryKey: ["ratings"],
    enabled: !!me?.membership,
    queryFn: async () => {
      const companyId = me?.membership?.company_id;
      if (!companyId) return { pending: [], feedback: [], metrics: [] };
      const [pos, fb, rfqs] = await Promise.all([
        supabase.from("purchase_orders").select("id, po_number, supplier_id, supplier_name, item_name, actual_delivery, expected_delivery").eq("status", "delivered"),
        supabase.from("vendor_feedback").select("*, suppliers(company_name)").eq("company_id", companyId).order("created_at", { ascending: false }),
        supabase.from("rfqs").select("supplier_id, sent_at, responded_at").eq("company_id", companyId),
      ]);
      if (pos.error) throw pos.error;
      if (fb.error) throw fb.error;
      if (rfqs.error) throw rfqs.error;
      const rated = new Set((fb.data ?? []).map((f: any) => f.po_id));
      const metrics = [...new Set((pos.data ?? []).map((p) => p.supplier_id))].map((id) => {
        const orders = (pos.data ?? []).filter((p) => p.supplier_id === id);
        const feedback = (fb.data ?? []).filter((f) => f.supplier_id === id);
        const responses = (rfqs.data ?? []).filter((r) => r.supplier_id === id && r.sent_at && r.responded_at);
        const ratedAverage = (key: "rating" | "quality_rating") => feedback.length ? (feedback.reduce((sum,f) => sum + f[key], 0) / feedback.length).toFixed(1) : "—";
        const timed = orders.filter((p) => p.actual_delivery && p.expected_delivery);
        const late = timed.filter((p) => String(p.actual_delivery) > String(p.expected_delivery)).length;
        return { id, name: orders[0]?.supplier_name, rating: ratedAverage("rating"), quality: ratedAverage("quality_rating"), completed: orders.length, late, onTime: timed.length ? `${Math.round((timed.length-late)/timed.length*100)}%` : "—", response: responses.length ? `${(responses.reduce((sum,r) => sum + (new Date(String(r.responded_at)).getTime()-new Date(String(r.sent_at)).getTime())/3600000, 0)/responses.length).toFixed(1)} h` : "—" };
      });
      return { pending: (pos.data ?? []).filter((p) => !rated.has(p.id)), feedback: (fb.data ?? []) as any[], metrics };
    },
  });
  async function submit(p: any) {
    const f = form[p.id] ?? { rating: 4, quality: 4, onTime: true, comments: "" };
    if (!me?.membership) return;
    if (!validRating(f.rating) || !validRating(f.quality)) return toast.error("Ratings must be whole stars from 1 to 5");
    const { error } = await supabase.from("vendor_feedback").insert({ po_id: p.id, company_id: me.membership.company_id, supplier_id: p.supplier_id, rating: f.rating, quality_rating: f.quality, on_time: f.onTime, comments: f.comments || null, created_by: me.userId });
    if (error) return toast.error(error.message);
    toast.success("Thanks — rating saved");
    qc.invalidateQueries({ queryKey: ["ratings"] });
  }
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorNote error={q.error} />;
  const { pending, feedback, metrics } = q.data ?? { pending: [], feedback: [], metrics: [] };
  return (
    <div className="space-y-6">
      <PageHeader title="Vendor ratings" description="Your ratings feed into future supplier recommendations." />
      <section><h2 className="mb-3 text-base font-semibold">Recorded supplier performance</h2>{!metrics.length ? <Empty>No completed order history yet.</Empty> : <Table><TableHeader><TableRow>{["Supplier", "Average rating", "Completed orders", "Response speed", "On-time delivery", "Product quality", "Late deliveries"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{metrics.map((m) => <TableRow key={m.id}><TableCell>{m.name}</TableCell><TableCell>{m.rating} / 5</TableCell><TableCell>{m.completed}</TableCell><TableCell>{m.response}</TableCell><TableCell>{m.onTime}</TableCell><TableCell>{m.quality} / 5</TableCell><TableCell>{m.late}</TableCell></TableRow>)}</TableBody></Table>}</section>
      <Card><CardHeader><CardTitle className="text-base">Delivered orders to rate</CardTitle></CardHeader>
        <CardContent>{pending.length === 0 ? <Empty>No delivered orders waiting for a rating.</Empty> : <div className="space-y-4">{pending.map((p) => {
          const f = form[p.id] ?? { rating: 4, quality: 4, onTime: true, comments: "" };
          const set = (patch: Partial<typeof f>) => setForm({ ...form, [p.id]: { ...f, ...patch } });
          return (
            <div key={p.id} className="flex flex-wrap items-end gap-3 rounded-md border p-3">
              <div className="min-w-48 flex-1"><div className="font-medium">{p.supplier_name}</div><div className="text-xs text-muted-foreground">{p.po_number} · {p.item_name} · delivered {fmtDate(p.actual_delivery)}</div></div>
              <div className="w-20 space-y-1"><Label>Overall</Label><Input type="number" min={1} max={5} value={f.rating} onChange={(e) => set({ rating: Number(e.target.value) })} /></div>
              <div className="w-20 space-y-1"><Label>Quality</Label><Input type="number" min={1} max={5} value={f.quality} onChange={(e) => set({ quality: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2 pb-2"><Switch checked={f.onTime} onCheckedChange={(v) => set({ onTime: v })} /><Label>On time</Label></div>
              <Input className="w-56" placeholder="Comments" value={f.comments} onChange={(e) => set({ comments: e.target.value })} />
              <Button onClick={() => submit(p)}>Save</Button>
            </div>
          );
        })}</div>}</CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-base">Past ratings</CardTitle></CardHeader>
        <CardContent>{feedback.length === 0 ? <Empty>No ratings yet.</Empty> : (
          <Table><TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Overall</TableHead><TableHead>Quality</TableHead><TableHead>On time</TableHead><TableHead>Comments</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>{feedback.map((f) => <TableRow key={f.id}><TableCell>{f.suppliers?.company_name}</TableCell><TableCell>★ {f.rating}</TableCell><TableCell>{f.quality_rating}</TableCell><TableCell>{f.on_time ? "Yes" : "No"}</TableCell><TableCell className="text-sm">{f.comments}</TableCell><TableCell>{fmtDate(f.created_at)}</TableCell></TableRow>)}</TableBody>
          </Table>
        )}</CardContent>
      </Card>
    </div>
  );
}
