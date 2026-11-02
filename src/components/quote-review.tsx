import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe } from "@/hooks/use-me";
import { moneyInput, quantityInput, finiteNumber } from "@/lib/purchasing";

type Field = { key: string; label: string; type?: "number" | "bool" };
const FIELDS: Field[] = [
  { key: "item_name", label: "Product / item" },
  { key: "quantity", label: "Quantity", type: "number" },
  { key: "unit_price", label: "Unit price", type: "number" },
  { key: "total_price", label: "Total price", type: "number" },
  { key: "currency", label: "Currency" },
  { key: "gst_percent", label: "GST %", type: "number" },
  { key: "gst_included", label: "GST included", type: "bool" },
  { key: "delivery_charges", label: "Delivery charges", type: "number" },
  { key: "delivery_days", label: "Delivery (days)", type: "number" },
  { key: "warranty", label: "Warranty" },
  { key: "payment_terms", label: "Payment terms" },
  { key: "specifications", label: "Product specifications" },
  { key: "quality_info", label: "Quality / certifications" },
  { key: "validity", label: "Quotation validity" },
  { key: "conditions", label: "Additional conditions" },
];

export function VerifiedBadge({ q }: { q: any }) {
  if (q.verified) return <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3 w-3" />Verified</span>;
  if (q.needs_verification?.length) return <span className="inline-flex items-center gap-1 text-xs text-warning"><AlertTriangle className="h-3 w-3" />Needs verification</span>;
  return <span className="text-xs text-muted-foreground">Unverified</span>;
}

export function QuoteReview({ quote }: { quote: any }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const canEdit = me?.membership?.role === "admin" || me?.membership?.role === "manager";
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Record<string, any>>({});
  const [urls, setUrls] = useState<{ name: string; url: string; mimeType: string }[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const needs: string[] = quote.needs_verification ?? [];

  useEffect(() => {
    if (!open) return;
    setV(Object.fromEntries(FIELDS.map((f) => [f.key, quote[f.key]])));
    const files: { name: string; path: string; mimeType: string }[] = quote.source_files?.length ? quote.source_files : quote.pdf_path ? [{ name: "Quotation file", path: quote.pdf_path, mimeType: "application/pdf" }] : [];
    Promise.all(files.map(async (f) => {
      const { data } = await supabase.storage.from("quotations").createSignedUrl(f.path, 600);
      return data ? { name: f.name, url: data.signedUrl, mimeType: f.mimeType } : null;
    })).then((r) => setUrls(r.filter(Boolean) as any));
    if (quote.email_reply_id) supabase.from("email_replies").select("body").eq("id", quote.email_reply_id).maybeSingle().then(({ data }) => setEmail(data?.body ?? null));
  }, [open, quote]);

  async function save(markVerified: boolean) {
    const price = moneyInput("Unit price").safeParse(v.unit_price);
    const total = moneyInput("Total price").safeParse(v.total_price);
    const qty = v.quantity == null || v.quantity === "" ? null : quantityInput.safeParse(v.quantity);
    const delivery = finiteNumber(v.delivery_charges ?? 0);
    const message = !price.success ? price.error.issues[0]?.message : !total.success ? total.error.issues[0]?.message : qty && !qty.success ? qty.error.issues[0]?.message : delivery == null || delivery < 0 || delivery > 1_000_000_000 ? "Delivery charges must be between 0 and ₹1,000,000,000" : null;
    if (message) return toast.error(message);
    setBusy(true);
    const patch: Record<string, any> = {};
    for (const f of FIELDS) {
      const x = v[f.key];
      patch[f.key] = f.type === "number" ? (x === "" || x == null ? null : Number(x)) : f.type === "bool" ? !!x : x || null;
    }
    for (const k of ["unit_price", "total_price", "gst_percent", "delivery_charges", "delivery_days"]) if (patch[k] == null) patch[k] = 0;
    if (!patch.currency) patch.currency = "INR";
    if (markVerified) {
      const { data: u } = await supabase.auth.getUser();
      Object.assign(patch, { verified: true, verified_by: u.user?.id, verified_at: new Date().toISOString(), needs_verification: [] });
    }
    const { error } = await supabase.from("quotations").update(patch as any).eq("id", quote.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(markVerified ? "Quotation verified" : "Corrections saved");
    qc.invalidateQueries();
    if (markVerified) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant={quote.verified ? "ghost" : "outline"}>{quote.verified ? "View" : "Review"}</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader><DialogTitle>{quote.suppliers?.company_name ?? "Quotation"} — check AI reading</DialogTitle></DialogHeader>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Original quotation</h3>
            {urls.map((u) => (
              <div key={u.url} className="space-y-1">
                <a href={u.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">{u.name}</a>
                {u.mimeType.startsWith("image/") ? <img src={u.url} alt={u.name} className="max-h-[60vh] w-full rounded border object-contain" /> : <iframe src={u.url} title={u.name} className="h-[60vh] w-full rounded border" />}
              </div>
            ))}
            {email && <div><div className="text-xs text-muted-foreground">Email message</div><pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded border bg-muted p-3 text-xs">{email}</pre></div>}
            {!urls.length && !email && <p className="text-sm text-muted-foreground">{quote.source === "portal" ? "Entered by the supplier in the portal." : quote.is_demo ? "Simulated demo quotation." : "No original file attached."}</p>}
            {quote.ai_issues?.length > 0 && <ul className="list-disc space-y-1 rounded border border-warning/50 p-3 pl-6 text-sm">{quote.ai_issues.map((i: string) => <li key={i}>{i}</li>)}</ul>}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Extracted details {!canEdit && <span className="font-normal text-muted-foreground">(managers can correct)</span>}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => {
                const flagged = !quote.verified && needs.includes(f.key);
                return (
                  <div key={f.key} className={f.type === undefined && ["specifications", "conditions", "quality_info"].includes(f.key) ? "sm:col-span-2 space-y-1" : "space-y-1"}>
                    <Label className={flagged ? "text-warning" : ""}>{f.label}{flagged && " · needs verification"}</Label>
                    {f.type === "bool" ? (
                      <select disabled={!canEdit} className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={v[f.key] ? "yes" : "no"} onChange={(e) => setV({ ...v, [f.key]: e.target.value === "yes" })}><option value="yes">Included</option><option value="no">Extra</option></select>
                    ) : (
                      <Input disabled={!canEdit} type={f.type === "number" ? "number" : "text"} className={flagged ? "border-warning" : ""} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
                    )}
                  </div>
                );
              })}
            </div>
            {canEdit && (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" disabled={busy} onClick={() => save(false)}>Save corrections</Button>
                <Button disabled={busy} onClick={() => save(true)}><CheckCircle2 className="mr-1 h-4 w-4" />Mark as verified</Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
