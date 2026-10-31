import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, Empty, Loading, ErrorNote, DemoBadge } from "@/components/status-badge";
import { inr } from "@/lib/constants";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: pageHead("Suppliers", "Registered suppliers, categories and performance"),
  component: Suppliers,
});

function Suppliers() {
  const [q, setQ] = useState("");
  const s = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*, supplier_products(name, indicative_price, unit, lead_time_days), vendor_scores(rating, on_time_pct, avg_response_hours)").eq("is_active", true).order("company_name");
      if (error) throw error;
      return data as any[];
    },
  });
  if (s.isLoading) return <Loading />;
  if (s.error) return <ErrorNote error={s.error} />;
  const list = (s.data ?? []).filter((x) => !q || `${x.company_name} ${(x.categories ?? []).join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="Suppliers" description="Active suppliers registered on Nexora.">
        <Input placeholder="Search name or category" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
      </PageHeader>
      {list.length === 0 ? <Empty>No suppliers found.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((x) => {
            const vs = Array.isArray(x.vendor_scores) ? x.vendor_scores[0] : x.vendor_scores;
            return (
              <Card key={x.id}><CardContent className="space-y-2 p-5">
                <div className="flex items-start justify-between gap-2"><div className="font-semibold">{x.company_name} {x.is_demo && <DemoBadge />}</div>{vs?.rating != null && <span className="text-sm">★ {Number(vs.rating).toFixed(1)}</span>}</div>
                <div className="text-xs text-muted-foreground">{x.email}{x.phone ? ` · ${x.phone}` : ""}</div>
                <div className="flex flex-wrap gap-1">{(x.categories ?? []).map((c: string) => <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-xs">{c}</span>)}</div>
                {x.description && <p className="text-sm text-muted-foreground">{x.description}</p>}
                {vs && <div className="text-xs text-muted-foreground">On-time {vs.on_time_pct ?? "—"}% · replies in ~{vs.avg_response_hours ?? "—"}h</div>}
                {x.supplier_products?.length > 0 && <ul className="text-xs">{x.supplier_products.slice(0, 4).map((p: any) => <li key={p.name}>{p.name} — {inr(p.indicative_price)}{p.unit ? `/${p.unit}` : ""}</li>)}</ul>}
              </CardContent></Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
