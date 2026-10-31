import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Empty, Loading, ErrorNote, StatusBadge } from "@/components/status-badge";
import { effectiveRfqStatus, fmtDate, fmtDateTime } from "@/lib/constants";
import { pageHead } from "@/lib/meta";
import { syncReplies } from "@/lib/nexora.functions";

export const Route = createFileRoute("/_authenticated/awaiting")({
  head: pageHead("Awaiting responses", "RFQs waiting on supplier replies"),
  component: Awaiting,
});

function Awaiting() {
  const qc = useQueryClient();
  const sync = useServerFn(syncReplies);
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["awaiting"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rfqs").select("*, suppliers(company_name, email), purchase_requests(request_code, item_name)").in("status", ["pending", "email_sent", "response_received"]).order("sent_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
  async function doSync() {
    setBusy(true);
    try {
      const r = await sync();
      toast.success(`${r.stored} new replies, ${r.quotes} quotations extracted`);
      r.notes.forEach((n) => toast.message(n));
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorNote error={q.error} />;
  const rows = q.data ?? [];
  return (
    <div>
      <PageHeader title="Awaiting responses" description="Suppliers you've sent RFQs to who haven't quoted yet.">
        <Button onClick={doSync} disabled={busy}><RefreshCw className={`mr-1 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Check email replies</Button>
      </PageHeader>
      {rows.length === 0 ? <Empty>Nothing pending — all suppliers have responded.</Empty> : (
        <Table>
          <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Supplier</TableHead><TableHead>Sent</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell><Link to="/requests/$id" params={{ id: r.request_id }} className="font-medium text-primary hover:underline">{r.purchase_requests?.request_code}</Link><div className="text-xs text-muted-foreground">{r.purchase_requests?.item_name}</div></TableCell>
              <TableCell>{r.suppliers?.company_name}<div className="text-xs text-muted-foreground">{r.suppliers?.email}</div></TableCell>
              <TableCell>{fmtDateTime(r.sent_at)}</TableCell><TableCell>{fmtDate(r.deadline_at)}</TableCell>
              <TableCell><StatusBadge status={effectiveRfqStatus(r)} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </div>
  );
}
