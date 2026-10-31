import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Empty, Loading, ErrorNote, StatusBadge } from "@/components/status-badge";
import { effectiveRfqStatus, fmtDate, inr } from "@/lib/constants";
import { pageHead } from "@/lib/meta";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/supplier/rfqs")({
  head: pageHead("RFQs & quotations", "Quote on requests sent to you"),
  component: SupplierRfqs,
});

type F = { unit_price: string; delivery_days: string; gst_included: boolean; gst_percent: string; warranty: string; quality_info: string; payment_terms: string; file: File | null };
const blank: F = { unit_price: "", delivery_days: "", gst_included: false, gst_percent: "18", warranty: "", quality_info: "", payment_terms: "", file: null };

function SupplierRfqs() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, F>>({});
  const q = useQuery({
    queryKey: ["supplier-rfqs"],
    enabled: !!me?.supplier,
    queryFn: async () => {
      const { data, error } = await supabase.from("rfqs").select("*, purchase_requests(request_code, item_name, category, quantity, unit, specifications, quality_requirements, delivery_location, required_date, payment_terms), quotations(id, unit_price, total_price, delivery_days)").eq("supplier_id", me!.supplier.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
  async function submit(r: any) {
    const f = form[r.id] ?? blank;
    const unit = Number(f.unit_price);
    const days = Number(f.delivery_days);
    if (!(unit > 0) || !(days >= 0) || f.delivery_days === "") return toast.error("Enter unit price and delivery days");
    let pdf_path: string | null = null;
    if (f.file) {
      if (f.file.type !== "application/pdf") return toast.error("Quotation file must be a PDF");
      if (f.file.size > 10 * 1024 * 1024) return toast.error("PDF must be under 10 MB");
      pdf_path = `${r.id}/${Date.now()}-${f.file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("quotations").upload(pdf_path, f.file, { contentType: "application/pdf" });
      if (up.error) return toast.error(`PDF upload failed: ${up.error.message}`);
    }
    const { error } = await supabase.from("quotations").insert({ pdf_path, quality_info: f.quality_info || null, rfq_id: r.id, request_id: r.request_id, company_id: r.company_id, supplier_id: r.supplier_id, unit_price: unit, total_price: Math.round(unit * Number(r.purchase_requests.quantity) * 100) / 100, gst_included: f.gst_included, gst_percent: Number(f.gst_percent || 18), delivery_days: Math.round(days), warranty: f.warranty || null, payment_terms: f.payment_terms || null, source: "portal", created_by: me!.userId });
    if (error) return toast.error(error.message);
    toast.success("Quotation submitted");
    qc.invalidateQueries({ queryKey: ["supplier-rfqs"] });
  }
  if (!me?.supplier) return <Empty>This account isn't registered as a supplier.</Empty>;
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorNote error={q.error} />;
  const rows = q.data ?? [];
  return (
    <div>
      <PageHeader title="RFQs & quotations" description="Requests for quotation from buyers. Submit your price here or reply to the email." />
      {rows.length === 0 ? <Empty>No RFQs yet. Buyers will find you by your categories.</Empty> : (
        <div className="space-y-4">{rows.map((r) => {
          const pr = r.purchase_requests;
          const quoted = r.quotations?.[0];
          const f = form[r.id] ?? blank;
          const set = (patch: Partial<F>) => setForm({ ...form, [r.id]: { ...f, ...patch } });
          return (
            <Card key={r.id}><CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold">{pr?.request_code} — {pr?.item_name}</div><StatusBadge status={effectiveRfqStatus(r)} /></div>
              <div className="grid gap-1 text-sm text-muted-foreground md:grid-cols-2">
                <div>Quantity: {pr?.quantity} {pr?.unit}</div><div>Deliver to: {pr?.delivery_location}</div>
                <div>Needed by: {fmtDate(pr?.required_date)}</div><div>Quote deadline: {fmtDate(r.deadline_at)}</div>
                {pr?.specifications && <div className="md:col-span-2">Specs: {pr.specifications}</div>}
                {pr?.quality_requirements && <div className="md:col-span-2">Quality: {pr.quality_requirements}</div>}
              </div>
              {quoted ? <div className="text-sm">Your quote: <b>{inr(quoted.total_price)}</b> ({inr(quoted.unit_price)}/unit), {quoted.delivery_days} days</div> : (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-28 space-y-1"><Label>Unit price ₹</Label><Input type="number" value={f.unit_price} onChange={(e) => set({ unit_price: e.target.value })} /></div>
                  <div className="w-24 space-y-1"><Label>Days</Label><Input type="number" value={f.delivery_days} onChange={(e) => set({ delivery_days: e.target.value })} /></div>
                  <div className="w-20 space-y-1"><Label>GST %</Label><Input type="number" value={f.gst_percent} onChange={(e) => set({ gst_percent: e.target.value })} /></div>
                  <div className="flex items-center gap-2 pb-2"><Switch checked={f.gst_included} onCheckedChange={(v) => set({ gst_included: v })} /><Label>GST incl.</Label></div>
                  <Input className="w-40" placeholder="Warranty" value={f.warranty} onChange={(e) => set({ warranty: e.target.value })} />
                  <Input className="w-48" placeholder="Quality / certifications" value={f.quality_info} onChange={(e) => set({ quality_info: e.target.value })} />
                  <Input className="w-40" placeholder="Payment terms" value={f.payment_terms} onChange={(e) => set({ payment_terms: e.target.value })} />
                  <div className="space-y-1"><Label>Quotation PDF (optional)</Label><Input type="file" accept="application/pdf" className="w-56" onChange={(e) => set({ file: e.target.files?.[0] ?? null })} /></div>
                  <div className="w-full text-xs text-muted-foreground">Total: {f.unit_price ? inr(Number(f.unit_price) * Number(pr?.quantity ?? 0)) : "—"} ({f.gst_included ? "GST included" : `plus ${f.gst_percent || 18}% GST`})</div>
                  <Button onClick={() => submit(r)}>Submit quote</Button>
                </div>
              )}
            </CardContent></Card>
          );
        })}</div>
      )}
    </div>
  );
}
