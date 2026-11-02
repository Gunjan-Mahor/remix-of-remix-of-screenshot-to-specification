import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, Printer, Pencil, Send, Truck, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Empty, Loading, ErrorNote, StatusBadge } from "@/components/status-badge";
import { inr, fmtDate, fmtDateTime } from "@/lib/constants";
import { pageHead } from "@/lib/meta";
import { orderDocument, PAYMENT_METHODS, paymentMethodError } from "@/lib/purchasing";
import { sendPurchaseOrder, getCompanyAdminEmails } from "@/lib/nexora.functions";
import { OrderPayment } from "@/components/order-payment";
import { useMe, canApprove } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/orders")({
  head: pageHead("Purchase orders", "Approved supplier purchase orders, drafts and delivery tracking"),
  component: Orders,
});

function Orders() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const send = useServerFn(sendPurchaseOrder);
  const getAdmins = useServerFn(getCompanyAdminEmails);
  const admins = useQuery({ queryKey: ["company-admin-emails", me?.membership?.company_id], enabled: !!me?.membership, queryFn: () => getAdmins() });
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ po_date: "", delivery_location: "", payment_terms: "", expected_delivery: "", payment_mode: "" });
  const [busy, setBusy] = useState(false);
  const mgr = canApprove(me);
  const emails = useQuery({
    queryKey: ["order-confirmation-emails"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_logs").select("po_id, status, error, recipient, created_at").eq("kind", "po").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const q = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders").select("*, purchase_requests(request_code), suppliers(is_demo), order_events(*)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  function open(po: any) {
    setSelected(po);
    setForm({ po_date: po.po_date, delivery_location: po.delivery_location, payment_terms: po.payment_terms ?? "", expected_delivery: po.expected_delivery ?? "", payment_mode: po.payment_mode ?? "" });
  }
  async function doSend(id: string) {
    setBusy(true);
    try {
      const r = await send({ data: { poId: id } });
      if (!r.ok) toast.error(`Email not sent: ${r.error}`);
      else toast.success("Vendor confirmation emailed with payment details");
      await qc.invalidateQueries();
      if (r.ok) setSelected(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }
  async function save(andSend: boolean) {
    if (!selected || !mgr || !form.delivery_location.trim() || !form.po_date) return toast.error("Enter a purchase date and delivery location");
    if (andSend && paymentMethodError(form.payment_mode)) return toast.error(paymentMethodError(form.payment_mode));
    setBusy(true);
    try {
      const { data: saved, error } = await supabase.from("purchase_orders").update({ ...form, payment_mode: form.payment_mode || null, delivery_location: form.delivery_location.trim(), expected_delivery: form.expected_delivery || null, payment_terms: form.payment_terms.trim() || null }).eq("id", selected.id).eq("status", "draft").select("id").maybeSingle();
      if (error) throw error;
      if (!saved) throw new Error("This order is no longer editable. Refresh and open it again.");
      await qc.invalidateQueries();
      if (andSend) await doSend(selected.id);
      else { toast.success("Draft saved"); setSelected(null); }
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }
  async function setStatus(po: any, status: string) {
    if (!mgr) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("purchase_orders").update({ status }).eq("id", po.id).eq("status", po.status);
      if (error) throw error;
      toast.success(`Marked ${status.replace("_", " ")}`);
      await qc.invalidateQueries();
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }
  function download(po: any) {
    const url = URL.createObjectURL(new Blob([orderDocument({ ...po, admin_emails: admins.data ?? [] })], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${po.po_number}.html`; a.click(); URL.revokeObjectURL(url);
  }
  function print(po: any) {
    const win = window.open("", "_blank");
    if (!win) return toast.error("Allow popups to print this order");
    win.document.write(orderDocument({ ...po, admin_emails: admins.data ?? [] })); win.document.close(); win.focus(); win.print();
  }
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorNote error={q.error} />;
  const rows = q.data ?? [];
  return <div className="space-y-6">
    <PageHeader title="Purchase orders" description="Approved purchases · drafts and delivery" />
    {rows.length === 0 ? <Empty>No purchase orders yet. Approve a request to create a draft.</Empty> : <Table>
      <TableHeader><TableRow><TableHead>PO / request</TableHead><TableHead>Supplier</TableHead><TableHead>Item</TableHead><TableHead>Total INR</TableHead><TableHead>Expected</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((p) => <TableRow key={p.id}>
        <TableCell className="font-medium">{p.po_number}<div className="text-xs text-muted-foreground">{p.purchase_requests?.request_code} · {fmtDate(p.po_date)}</div></TableCell>
        <TableCell>{p.supplier_name}{p.suppliers?.is_demo && <span className="ml-2 text-xs text-warning">Demo — no email</span>}<div className="text-xs text-muted-foreground">{p.supplier_email}</div></TableCell>
        <TableCell>{p.item_name} × {p.quantity}</TableCell><TableCell>{inr(p.total_amount)}</TableCell><TableCell>{fmtDate(p.expected_delivery)}</TableCell><TableCell><StatusBadge status={p.status} /></TableCell>
        <TableCell><div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={() => open(p)}><Pencil className="h-4 w-4" />{p.status === "draft" && mgr ? "Edit draft" : "Details"}</Button>
          <Button size="icon" variant="ghost" onClick={() => download(p)} title="Download PO" aria-label={`Download ${p.po_number}`}><Download className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => print(p)} title="Print PO" aria-label={`Print ${p.po_number}`}><Printer className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" asChild title="Raise a new request with the same details"><Link to="/requests/new" search={{ from: p.request_id }}><RotateCcw className="h-4 w-4" />Re-order</Link></Button>
          {p.status === "draft" && mgr && <Button size="sm" disabled={busy || !!p.suppliers?.is_demo} onClick={() => open(p)}><Send className="h-4 w-4" />Confirm vendor</Button>}
          {mgr && ["sent", "acknowledged"].includes(p.status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus(p, "in_transit")}><Truck className="h-4 w-4" />In transit</Button>}
          {mgr && ["sent", "acknowledged", "in_transit"].includes(p.status) && <Button size="sm" disabled={busy} onClick={() => setStatus(p, "delivered")}><Check className="h-4 w-4" />Delivered</Button>}
        </div></TableCell>
      </TableRow>)}</TableBody>
    </Table>}
    <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>{selected?.po_number}</DialogTitle><DialogDescription>{selected?.supplier_name} · {selected?.purchase_requests?.request_code}</DialogDescription></DialogHeader>
      {selected && <><div className="grid grid-cols-2 gap-3 text-sm">
        <div>Product <b className="block">{selected.item_name}</b></div><div>Quantity <b className="block">{selected.quantity}</b></div>
        <div>Unit rate before GST <b className="block">{inr(selected.unit_rate)}</b></div><div>GST {selected.tax_percent}% <b className="block">{inr(selected.tax_amount)}</b></div>
        <div>Delivery charges <b className="block">{inr(selected.delivery_charges)}</b></div><div>Total INR <b className="block text-primary">{inr(selected.total_amount)}</b></div>
      </div>
      <fieldset disabled={selected.status !== "draft" || !mgr || busy} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="po-date">Purchase date</Label><Input id="po-date" type="date" value={form.po_date} onChange={(e) => setForm({ ...form, po_date: e.target.value })} /></div>
        <div className="space-y-1"><Label htmlFor="po-expected">Expected delivery</Label><Input id="po-expected" type="date" value={form.expected_delivery} onChange={(e) => setForm({ ...form, expected_delivery: e.target.value })} /></div>
        <div className="space-y-1 sm:col-span-2"><Label htmlFor="po-location">Delivery location</Label><Textarea id="po-location" value={form.delivery_location} onChange={(e) => setForm({ ...form, delivery_location: e.target.value })} /></div>
        <div className="space-y-1 sm:col-span-2"><Label htmlFor="po-terms">Payment terms</Label><Input id="po-terms" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} /></div>
        <div className="space-y-1 sm:col-span-2"><Label htmlFor="po-method">Payment method</Label><select id="po-method" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}><option value="">Select payment method…</option>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
      </fieldset>
      <OrderPayment po={{ ...selected, payment_mode: form.payment_mode }} adminEmails={admins.data ?? []} />
      {admins.error && <ErrorNote error={admins.error} />}
      <section className="space-y-2 border-t pt-3"><h3 className="text-sm font-semibold">Vendor confirmation email</h3>{emails.error ? <ErrorNote error={emails.error} /> : emails.isLoading ? <p className="text-xs text-muted-foreground">Loading confirmation history…</p> : (emails.data ?? []).filter((e) => e.po_id === selected.id).length ? (emails.data ?? []).filter((e) => e.po_id === selected.id).map((e) => <div key={e.created_at} className="text-xs"><span className={e.status === "sent" ? "text-success" : "text-destructive"}>{e.status === "sent" ? "Sent" : "Not sent"}</span> · {e.recipient} · {fmtDateTime(e.created_at)}{e.error && <p className="break-words text-destructive">{e.error}</p>}</div>) : <p className="text-xs text-muted-foreground">Not sent yet</p>}</section>
      {selected.status === "draft" && mgr && <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => save(false)}>Save draft</Button><Button disabled={busy || !!selected.suppliers?.is_demo || !!paymentMethodError(form.payment_mode)} onClick={() => save(true)}><Send className="h-4 w-4" />{busy ? "Sending…" : "Send vendor confirmation"}</Button></div>}
      <div className="border-t pt-3"><h3 className="mb-2 text-sm font-semibold">Delivery history</h3>{(selected.order_events ?? []).sort((a: any,b: any) => a.created_at.localeCompare(b.created_at)).map((e: any) => <div key={e.id} className="flex justify-between gap-2 text-sm"><span className="capitalize">{e.event.replace(/_/g, " ")}</span><span className="text-xs text-muted-foreground">{fmtDateTime(e.created_at)}</span></div>)}</div>
      </>}
    </DialogContent></Dialog>
  </div>;
}
