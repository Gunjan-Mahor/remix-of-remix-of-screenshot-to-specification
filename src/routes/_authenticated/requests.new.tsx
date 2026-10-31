import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/status-badge";
import { CATEGORIES } from "@/lib/constants";
import { pageHead } from "@/lib/meta";
import { useMe } from "@/hooks/use-me";
import { matchSuppliers } from "@/lib/nexora.functions";

export const Route = createFileRoute("/_authenticated/requests/new")({
  head: pageHead("New Purchase Request", "Create a purchase request"),
  component: NewRequest,
});

const schema = z.object({
  item_name: z.string().trim().min(2, "Required").max(150),
  category: z.string().min(1, "Pick a category"),
  quantity: z.coerce.number().positive("Must be more than 0"),
  unit: z.string().trim().min(1).max(20),
  budget: z.coerce.number().positive("Budget must be more than 0"),
  delivery_location: z.string().trim().min(3, "Required").max(200),
  required_date: z.string().refine((d) => d && new Date(d) > new Date(), "Pick a future date"),
  specifications: z.string().max(2000).optional(),
  quality_requirements: z.string().max(1000).optional(),
  payment_terms: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

function NewRequest() {
  const { data: me } = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  const match = useServerFn(matchSuppliers);
  const [f, setF] = useState<Record<string, string>>({ unit: "units" });
  const [files, setFiles] = useState<FileList | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    const p = schema.safeParse(f);
    if (!p.success) return setErrors(Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])));
    setErrors({});
    if (!me?.membership) return toast.error("No company workspace");
    setBusy(true);
    const { data: req, error } = await supabase
      .from("purchase_requests")
      .insert({ ...p.data, company_id: me.membership.company_id, created_by: me.userId, requester_name: me.profile?.full_name || me.email })
      .select()
      .single();
    if (error || !req) {
      setBusy(false);
      return toast.error(error?.message ?? "Could not save");
    }
    for (const file of Array.from(files ?? [])) {
      const path = `${me.membership.company_id}/${req.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("attachments").upload(path, file);
      if (up.error) toast.error(`Attachment ${file.name}: ${up.error.message}`);
      else await supabase.from("request_attachments").insert({ request_id: req.id, company_id: me.membership.company_id, path, name: file.name, size: file.size });
    }
    toast.success(`Request ${req.request_code} created`);
    try {
      const r = await match({ data: { requestId: req.id } });
      if (r.message) toast.warning(r.message);
      else toast.success(`${r.matched} suppliers matched${r.aiUsed ? " by AI" : " (rule-based; AI unavailable)"}`);
    } catch (e) {
      toast.error(`Supplier matching failed: ${e instanceof Error ? e.message : e}`);
    }
    qc.invalidateQueries();
    nav({ to: "/requests/$id", params: { id: req.id } });
  }

  const fld = (k: string, label: string, type = "text") => (
    <div className="space-y-1.5"><Label htmlFor={k}>{label}</Label><Input id={k} type={type} value={f[k] ?? ""} onChange={set(k)} />{errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}</div>
  );
  const area = (k: string, label: string) => (
    <div className="space-y-1.5"><Label htmlFor={k}>{label}</Label><Textarea id={k} rows={3} value={f[k] ?? ""} onChange={set(k)} /></div>
  );

  return (
    <div className="max-w-3xl">
      <PageHeader title="New purchase request" description="AI will extract requirements and match registered suppliers once saved." />
      <Card><CardContent className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">{fld("item_name", "Item name")}</div>
        <div className="space-y-1.5"><Label>Category</Label>
          <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">{fld("quantity", "Quantity", "number")}{fld("unit", "Unit")}</div>
        {fld("budget", "Budget (INR, incl. GST)", "number")}
        {fld("required_date", "Required delivery date", "date")}
        <div className="sm:col-span-2">{fld("delivery_location", "Delivery location")}</div>
        <div className="sm:col-span-2">{area("specifications", "Specifications")}</div>
        {area("quality_requirements", "Quality requirements")}
        {area("notes", "Notes")}
        {fld("payment_terms", "Preferred payment terms (e.g. Net 30)")}
        <div className="space-y-1.5"><Label htmlFor="files">Attachments</Label><Input id="files" type="file" multiple onChange={(e) => setFiles(e.target.files)} /></div>
        <div className="flex gap-2 sm:col-span-2">
          <Button onClick={submit} disabled={busy}>{busy ? "Saving & matching suppliers…" : "Create request"}</Button>
          <Button variant="outline" onClick={() => nav({ to: "/requests" })}>Cancel</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
