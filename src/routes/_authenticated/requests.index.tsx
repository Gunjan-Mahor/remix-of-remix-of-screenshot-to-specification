import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, PageHeader, Empty, Loading, ErrorNote, DemoBadge } from "@/components/status-badge";
import { REQUEST_STATUS_LABEL, fmtDate, inr } from "@/lib/constants";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/requests/")({
  head: pageHead("Purchase Requests", "All purchase requests"),
  component: RequestsList,
});

function RequestsList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const q = useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const rows = (q.data ?? []).filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (!search || `${r.request_code} ${r.item_name} ${r.category} ${r.requester_name}`.toLowerCase().includes(search.toLowerCase())) &&
      (!from || r.created_at >= from) &&
      (!to || r.created_at.slice(0, 10) <= to),
  );
  return (
    <div>
      <PageHeader title="Purchase Requests" description="Create, track and move requests through RFQ, comparison and approval.">
        <Button asChild><Link to="/requests/new"><Plus className="mr-1 h-4 w-4" />New request</Link></Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Search ID, item, category…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(REQUEST_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label="To date" />
      </div>
      {q.isLoading ? <Loading /> : q.error ? <ErrorNote error={q.error} /> : rows.length === 0 ? <Empty>No matching requests.</Empty> : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Request ID</TableHead><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Budget</TableHead><TableHead>Requester</TableHead><TableHead>Needed by</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Link to="/requests/$id" params={{ id: r.id }} className="font-medium text-primary">{r.request_code}</Link> {r.is_demo && <DemoBadge />}</TableCell>
                <TableCell>{r.item_name}<div className="text-xs text-muted-foreground">{r.category}</div></TableCell>
                <TableCell>{r.quantity} {r.unit}</TableCell><TableCell>{inr(r.budget)}</TableCell><TableCell>{r.requester_name}</TableCell><TableCell>{fmtDate(r.required_date)}</TableCell><TableCell><StatusBadge status={r.status} /></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent></Card>
      )}
    </div>
  );
}
