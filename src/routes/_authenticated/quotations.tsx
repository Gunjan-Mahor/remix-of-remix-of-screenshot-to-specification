import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Empty, Loading, ErrorNote, DemoBadge } from "@/components/status-badge";
import { inr, fmtDate } from "@/lib/constants";
import { pageHead } from "@/lib/meta";
import { QuoteReview, VerifiedBadge } from "@/components/quote-review";

export const Route = createFileRoute("/_authenticated/quotations")({
  head: pageHead("Quotations", "All supplier quotations received"),
  component: Quotations,
});

function Quotations() {
  const q = useQuery({
    queryKey: ["all-quotations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotations").select("*, suppliers(company_name), purchase_requests(request_code, item_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorNote error={q.error} />;
  const rows = q.data ?? [];
  return (
    <div>
      <PageHeader title="Quotations" description="Every quotation received across your requests." />
      {rows.length === 0 ? <Empty>No quotations received yet.</Empty> : (
        <Table>
          <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Supplier</TableHead><TableHead>Unit</TableHead><TableHead>Total</TableHead><TableHead>GST</TableHead><TableHead>Delivery</TableHead><TableHead>Source</TableHead><TableHead>Received</TableHead><TableHead>Check</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell><Link to="/requests/$id" params={{ id: r.request_id }} className="font-medium text-primary hover:underline">{r.purchase_requests?.request_code}</Link><div className="text-xs text-muted-foreground">{r.purchase_requests?.item_name}</div></TableCell>
              <TableCell>{r.suppliers?.company_name} {r.is_demo && <DemoBadge />}</TableCell>
              <TableCell>{inr(r.unit_price)}</TableCell><TableCell className="font-medium">{inr(r.total_price)}</TableCell>
              <TableCell>{r.gst_included ? "Incl." : "Extra"} {r.gst_percent}%</TableCell><TableCell>{r.delivery_days} days</TableCell>
              <TableCell className="capitalize">{r.source}</TableCell><TableCell>{fmtDate(r.created_at)}</TableCell>
              <TableCell><VerifiedBadge q={r} /></TableCell><TableCell><QuoteReview quote={r} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </div>
  );
}
