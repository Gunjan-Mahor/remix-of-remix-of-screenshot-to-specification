import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Empty } from "@/components/status-badge";
import { CATEGORIES, inr } from "@/lib/constants";
import { pageHead } from "@/lib/meta";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/supplier/")({
  head: pageHead("Supplier profile", "Your supplier company profile and products"),
  component: SupplierProfile,
});

function SupplierProfile() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const s = me?.supplier;
  const [f, setF] = useState({ company_name: "", phone: "", address: "", gstin: "", delivery_capabilities: "", description: "", categories: [] as string[] });
  const [np, setNp] = useState({ name: "", category: "", specifications: "", indicative_price: "", unit: "", lead_time_days: "" });
  useEffect(() => { if (s) setF({ company_name: s.company_name ?? "", phone: s.phone ?? "", address: s.address ?? "", gstin: s.gstin ?? "", delivery_capabilities: s.delivery_capabilities ?? "", description: s.description ?? "", categories: s.categories ?? [] }); }, [s]);
  const products = useQuery({
    queryKey: ["my-products", s?.id],
    enabled: !!s,
    queryFn: async () => (await supabase.from("supplier_products").select("*").eq("supplier_id", s.id).order("created_at")).data ?? [],
  });
  if (!s) return <Empty>This account isn't registered as a supplier.</Empty>;

  async function save() {
    const { error } = await supabase.from("suppliers").update({ ...f, gstin: f.gstin || null }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["me"] });
  }
  async function addProduct() {
    if (!np.name || !np.category) return toast.error("Name and category are required");
    const { error } = await supabase.from("supplier_products").insert({ supplier_id: s.id, name: np.name, category: np.category, specifications: np.specifications || null, indicative_price: np.indicative_price ? Number(np.indicative_price) : null, unit: np.unit || null, lead_time_days: np.lead_time_days ? Number(np.lead_time_days) : null });
    if (error) return toast.error(error.message);
    setNp({ name: "", category: "", specifications: "", indicative_price: "", unit: "", lead_time_days: "" });
    qc.invalidateQueries({ queryKey: ["my-products"] });
  }
  async function delProduct(id: string) {
    await supabase.from("supplier_products").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-products"] });
  }
  const toggle = (c: string) => setF({ ...f, categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c] });

  return (
    <div className="space-y-6">
      <PageHeader title="Company profile" description="Buyers match you by category, so keep these accurate." />
      <Card><CardContent className="grid gap-4 p-5 md:grid-cols-2">
        <div className="space-y-1"><Label>Contact email</Label><Input value={s.email} disabled /></div>
        {(["company_name", "phone", "address", "gstin"] as const).map((k) => <div key={k} className="space-y-1"><Label className="capitalize">{k.replace("_", " ")}</Label><Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>)}
        <div className="space-y-1 md:col-span-2"><Label>Delivery capabilities</Label><Input value={f.delivery_capabilities} onChange={(e) => setF({ ...f, delivery_capabilities: e.target.value })} placeholder="e.g. Pan-India within 7 days" /></div>
        <div className="space-y-1 md:col-span-2"><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="space-y-2 md:col-span-2"><Label>Categories</Label><div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <button type="button" key={c} onClick={() => toggle(c)} className={`rounded-full border px-3 py-1 text-xs ${f.categories.includes(c) ? "border-primary bg-primary text-primary-foreground" : ""}`}>{c}</button>)}</div></div>
        <div><Button onClick={save}>Save profile</Button></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Products</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(products.data ?? []).length > 0 && (
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Lead time</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>{(products.data ?? []).map((p: any) => <TableRow key={p.id}><TableCell>{p.name}{p.specifications && <div className="text-xs text-muted-foreground">{p.specifications}</div>}</TableCell><TableCell>{p.category}</TableCell><TableCell>{inr(p.indicative_price)}{p.unit ? `/${p.unit}` : ""}</TableCell><TableCell>{p.lead_time_days ?? "—"} days</TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => delProduct(p.id)}>Remove</Button></TableCell></TableRow>)}</TableBody>
            </Table>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <Input className="w-48" placeholder="Product name" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} />
            <Input className="w-56" placeholder="Specifications" value={np.specifications} onChange={(e) => setNp({ ...np, specifications: e.target.value })} />
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={np.category} onChange={(e) => setNp({ ...np, category: e.target.value })}><option value="">Category…</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            <Input className="w-28" type="number" placeholder="Price ₹" value={np.indicative_price} onChange={(e) => setNp({ ...np, indicative_price: e.target.value })} />
            <Input className="w-20" placeholder="Unit" value={np.unit} onChange={(e) => setNp({ ...np, unit: e.target.value })} />
            <Input className="w-28" type="number" placeholder="Lead days" value={np.lead_time_days} onChange={(e) => setNp({ ...np, lead_time_days: e.target.value })} />
            <Button onClick={addProduct}>Add</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
