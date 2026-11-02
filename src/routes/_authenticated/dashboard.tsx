import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FileText, Clock, CheckSquare, PackageCheck, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, PageHeader, Empty, Loading, ErrorNote } from "@/components/status-badge";
import { fmtDate, fmtDateTime, inr } from "@/lib/constants";
import { pageHead } from "@/lib/meta";
import { useMe } from "@/hooks/use-me";
import { IntegrationStatus } from "@/components/integration-status";
import { budgetSummary } from "@/lib/purchasing";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: pageHead("Overview", "Procurement overview dashboard"),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMe();
  const q = useQuery({
    queryKey: ["dashboard"],
    enabled: !!me?.membership,
    queryFn: async () => {
      const [reqs, pos, act, logs] = await Promise.all([
        supabase.from("purchase_requests").select("id, request_code, item_name, requester_name, status, created_at, updated_at").order("created_at", { ascending: false }),
        supabase.from("purchase_orders").select("id, total_amount, po_date, status"),
        supabase.from("activity").select("*").order("created_at", { ascending: false }).limit(15),
        supabase.from("email_logs").select("*, suppliers(company_name)").order("created_at", { ascending: false }).limit(8),
      ]);
      if (reqs.error) throw reqs.error;
      return { reqs: reqs.data ?? [], pos: pos.data ?? [], act: act.data ?? [], logs: logs.data ?? [] };
    },
  });

  if (me && !me.membership) return <Empty>Your account isn't linked to a purchasing company.</Empty>;
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorNote error={q.error} />;
  const { reqs, pos, act, logs } = q.data!;

  const stats = [
    { label: "Total purchase requests", value: reqs.length, icon: FileText },
    { label: "Awaiting quotations", value: reqs.filter((r) => ["created", "rfq_sent", "awaiting_quotations"].includes(r.status)).length, icon: Clock },
    { label: "Pending approvals", value: reqs.filter((r) => r.status === "pending_approval").length, icon: CheckSquare },
    { label: "Completed purchases", value: reqs.filter((r) => r.status === "completed").length, icon: PackageCheck },
  ];

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const inMonth = pos.filter((p) => p.status !== "draft" && p.status !== "cancelled" && new Date(p.po_date).getMonth() === d.getMonth() && new Date(p.po_date).getFullYear() === d.getFullYear());
    return { month: d.toLocaleString("en-IN", { month: "short" }), spend: inMonth.reduce((a, p) => a + Number(p.total_amount), 0), count: inMonth.length };
  });
  const thisMonth = months[5];
  const budget = Number(me?.company?.annual_budget ?? 0);
  const b = budgetSummary(budget, pos);
  const money = [
    { label: `Yearly budget ${now.getFullYear()}`, value: budget > 0 ? inr(budget) : "Not set" },
    { label: "Total investment this year", value: inr(b.spent) },
    { label: "Balance left", value: budget > 0 ? inr(b.balance) : "—", warn: budget > 0 && b.balance < 0 },
    { label: "Waiting in draft orders", value: inr(b.committed) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome${me?.company ? `, ${me.company.name}` : ""}`} description="Your procurement at a glance.">
        <Button asChild><Link to="/requests/new"><Plus className="mr-1 h-4 w-4" />New request</Link></Button>
      </PageHeader>
      <IntegrationStatus />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}><CardContent className="flex items-center justify-between p-5"><div><div className="text-sm text-muted-foreground">{s.label}</div><div className="mt-1 text-3xl font-semibold">{s.value}</div></div><s.icon className="h-8 w-8 text-primary/60" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="space-y-3 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{money.map((m) => <div key={m.label}><div className="text-sm text-muted-foreground">{m.label}</div><div className={`mt-1 text-2xl font-semibold ${m.warn ? "text-destructive" : ""}`}>{m.value}</div></div>)}</div>
        {budget > 0 ? <div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full ${b.balance < 0 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, b.usedPct ?? 0)}%` }} /></div><p className="text-xs text-muted-foreground">{b.usedPct}% of the yearly budget used · {b.orders} orders this year</p></div> : <p className="text-xs text-muted-foreground">An admin can set the yearly budget on the <Link to="/company" className="text-primary">Company</Link> page.</p>}
      </CardContent></Card>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Company spending — last 6 months</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} /><YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `₹${v >= 100000 ? (v / 100000).toFixed(1) + "L" : v}`} /><Tooltip formatter={(v: number) => inr(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} /><Bar dataKey="spend" fill="var(--primary)" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">This month</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><div className="text-sm text-muted-foreground">Purchase orders</div><div className="text-2xl font-semibold">{thisMonth.count}</div></div>
            <div><div className="text-sm text-muted-foreground">Total spending</div><div className="text-2xl font-semibold">{inr(thisMonth.spend)}</div></div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Recent requests</CardTitle></CardHeader>
          <CardContent>
            {reqs.length === 0 ? <Empty>No requests yet. <Link to="/requests/new" className="text-primary">Create your first request</Link>.</Empty> : (
              <Table>
                <TableHeader><TableRow><TableHead>Request ID</TableHead><TableHead>Item</TableHead><TableHead>Requester</TableHead><TableHead>Created</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                <TableBody>
                  {reqs.slice(0, 8).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><Link to="/requests/$id" params={{ id: r.id }} className="font-medium text-primary">{r.request_code}</Link></TableCell>
                      <TableCell>{r.item_name}</TableCell><TableCell>{r.requester_name}</TableCell><TableCell>{fmtDate(r.created_at)}</TableCell><TableCell><StatusBadge status={r.status} /></TableCell><TableCell>{fmtDateTime(r.updated_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Live activity</CardTitle></CardHeader>
          <CardContent>
            {act.length === 0 ? <Empty>No activity yet.</Empty> : (
              <ol className="relative space-y-4 border-l pl-4">
                {act.map((a) => (
                  <li key={a.id}><span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-card bg-primary" /><div className="text-sm">{a.message}</div><div className="text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</div></li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Email attempts</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? <Empty>No emails sent yet.</Empty> : (
            <Table>
              <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Recipient</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{logs.map((l: any) => (
                <TableRow key={l.id}><TableCell>{fmtDateTime(l.created_at)}</TableCell><TableCell className="uppercase">{l.kind}</TableCell><TableCell>{l.suppliers?.company_name}<div className="text-xs text-muted-foreground">{l.recipient}</div></TableCell><TableCell className="max-w-xs truncate">{l.subject}</TableCell><TableCell><StatusBadge status={l.status} label={l.status === "skipped_demo" ? "Demo – not sent" : l.status} />{l.error && l.status === "failed" && <div className="text-xs text-destructive">{l.error}</div>}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
