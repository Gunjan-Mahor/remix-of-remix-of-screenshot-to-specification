import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Loading, ErrorNote } from "@/components/status-badge";
import { pageHead } from "@/lib/meta";
import { useMe, isAdmin } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/company")({
  head: pageHead("Company & members", "Company details, team members and invitations"),
  component: Company,
});

type Role = "admin" | "manager" | "employee";

function Company() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const admin = isAdmin(me);
  const [c, setC] = useState({ name: "", email: "", phone: "", address: "", response_deadline_days: 7, annual_budget: 0 });
  const [inv, setInv] = useState<{ email: string; role: Role }>({ email: "", role: "employee" });
  useEffect(() => { if (me?.company) setC({ name: me.company.name ?? "", email: me.company.email ?? "", phone: me.company.phone ?? "", address: me.company.address ?? "", response_deadline_days: me.company.response_deadline_days ?? 7, annual_budget: Number(me.company.annual_budget ?? 0) }); }, [me?.company]);

  const q = useQuery({
    queryKey: ["team"],
    enabled: !!me?.membership,
    queryFn: async () => {
      const cid = me!.membership!.company_id;
      const [m, i] = await Promise.all([
        supabase.from("company_members").select("id, user_id, role, created_at").eq("company_id", cid),
        supabase.from("company_invites").select("*").eq("company_id", cid).eq("accepted", false),
      ]);
      if (m.error) throw m.error;
      const ids = (m.data ?? []).map((x) => x.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      return { members: (m.data ?? []).map((x) => ({ ...x, profile: profs?.find((p) => p.id === x.user_id) })), invites: i.data ?? [] };
    },
  });

  async function save() {
    const { error } = await supabase.from("companies").update({ ...c, response_deadline_days: Number(c.response_deadline_days), annual_budget: Math.max(0, Number(c.annual_budget) || 0) }).eq("id", me!.membership!.company_id);
    if (error) return toast.error(error.message);
    toast.success("Company saved");
    qc.invalidateQueries({ queryKey: ["me"] });
  }
  async function invite() {
    if (!/^\S+@\S+\.\S+$/.test(inv.email)) return toast.error("Enter a valid email");
    const { error } = await supabase.from("company_invites").insert({ company_id: me!.membership!.company_id, email: inv.email.toLowerCase(), role: inv.role });
    if (error) return toast.error(error.message);
    toast.success("Invite saved — they join automatically when they sign up with this email");
    setInv({ email: "", role: "employee" });
    qc.invalidateQueries({ queryKey: ["team"] });
  }
  async function setRole(id: string, role: Role) {
    const { error } = await supabase.from("company_members").update({ role }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["team"] });
  }
  async function remove(table: "company_members" | "company_invites", id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["team"] });
  }

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorNote error={q.error} />;
  const { members, invites } = q.data ?? { members: [], invites: [] };
  return (
    <div className="space-y-6">
      <PageHeader title="Company & members" />
      <Card><CardHeader><CardTitle className="text-base">Company details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {(["name", "email", "phone", "address"] as const).map((k) => <div key={k} className="space-y-1"><Label className="capitalize">{k}</Label><Input disabled={!admin} value={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.value })} /></div>)}
          <div className="space-y-1"><Label>Supplier response deadline (days)</Label><Input type="number" min={1} disabled={!admin} value={c.response_deadline_days} onChange={(e) => setC({ ...c, response_deadline_days: Number(e.target.value) })} /></div>
          <div className="space-y-1"><Label>Yearly purchasing budget (INR)</Label><Input type="number" min={0} disabled={!admin} value={c.annual_budget} onChange={(e) => setC({ ...c, annual_budget: Number(e.target.value) })} /></div>
          {admin && <div className="flex items-end"><Button onClick={save}>Save</Button></div>}
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{members.map((m: any) => (
              <TableRow key={m.id}><TableCell>{m.profile?.full_name ?? "—"}</TableCell><TableCell>{m.profile?.email}</TableCell>
                <TableCell>{admin && m.user_id !== me?.userId ? (
                  <select className="h-8 rounded-md border bg-background px-2 text-sm" value={m.role} onChange={(e) => setRole(m.id, e.target.value as Role)}><option value="admin">Admin</option><option value="manager">Manager</option><option value="employee">Employee</option></select>
                ) : <span className="capitalize">{m.role}</span>}</TableCell>
                <TableCell className="text-right">{admin && m.user_id !== me?.userId && <Button size="sm" variant="ghost" onClick={() => remove("company_members", m.id)}>Remove</Button>}</TableCell>
              </TableRow>
            ))}
            {invites.map((i: any) => <TableRow key={i.id}><TableCell className="text-muted-foreground">Invited</TableCell><TableCell>{i.email}</TableCell><TableCell className="capitalize">{i.role}</TableCell><TableCell className="text-right">{admin && <Button size="sm" variant="ghost" onClick={() => remove("company_invites", i.id)}>Cancel</Button>}</TableCell></TableRow>)}
            </TableBody>
          </Table>
          {admin && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1"><Label>Invite by email</Label><Input className="w-64" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} placeholder="colleague@company.com" /></div>
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value as Role })}><option value="employee">Employee</option><option value="manager">Manager</option><option value="admin">Admin</option></select>
              <Button onClick={invite}>Invite</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
