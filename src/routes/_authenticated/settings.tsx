import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/status-badge";
import { pageHead } from "@/lib/meta";
import { useMe } from "@/hooks/use-me";
import { deleteMyAccount } from "@/lib/nexora.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: pageHead("Settings", "Your profile and notification settings"),
  component: Settings,
});

function Settings() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const del = useServerFn(deleteMyAccount);
  const [p, setP] = useState({ full_name: "", phone: "", notify_email: true });
  useEffect(() => { if (me?.profile) setP({ full_name: me.profile.full_name ?? "", phone: me.profile.phone ?? "", notify_email: me.profile.notify_email }); }, [me?.profile]);

  async function save() {
    const { error } = await supabase.from("profiles").update(p).eq("id", me!.userId);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["me"] });
  }
  async function remove() {
    if (!confirm("Delete your account permanently? This cannot be undone.")) return;
    try {
      await del();
      qc.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  }
  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title="Settings" />
      <Card><CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1"><Label>Email</Label><Input value={me?.email ?? ""} disabled /></div>
          <div className="space-y-1"><Label>Full name</Label><Input value={p.full_name} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Phone</Label><Input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={p.notify_email} onCheckedChange={(v) => setP({ ...p, notify_email: v })} /><Label>Email me about updates</Label></div>
          <Button onClick={save}>Save</Button>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-base text-destructive">Delete account</CardTitle></CardHeader>
        <CardContent><Button variant="destructive" onClick={remove}>Delete my account</Button></CardContent>
      </Card>
    </div>
  );
}
