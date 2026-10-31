import { Bell, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtDateTime } from "@/lib/constants";

export function PurchasingNotifications() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], refetchInterval: 30000, queryFn: async () => {
    const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    return data;
  } });
  const unread = (q.data ?? []).filter((n) => !n.read).length;
  async function read(id: string) {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  return <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" title="Notifications" aria-label="Notifications" className="relative"><Bell className="h-4 w-4" />{unread > 0 && <span className="absolute right-0 top-0 rounded-full bg-destructive px-1 text-xs text-destructive-foreground">{unread}</span>}</Button></PopoverTrigger>
    <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]"><h3 className="mb-3 font-semibold">Notifications</h3><div className="max-h-96 space-y-3 overflow-y-auto">
      {q.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : q.error ? <p className="text-sm text-destructive">Notifications could not be loaded.</p> : !q.data?.length ? <p className="text-sm text-muted-foreground">No notifications yet.</p> : q.data.map((n) => <div key={n.id} className="flex gap-2 border-b pb-3"><div className="min-w-0 flex-1"><p className={`text-sm ${!n.read ? "font-semibold" : "text-muted-foreground"}`}>{n.title}</p><p className="break-words text-xs text-muted-foreground">{n.body}</p><time className="text-xs text-muted-foreground">{fmtDateTime(n.created_at)}</time></div>{!n.read && <Button variant="ghost" size="icon" title="Mark as read" aria-label={`Mark ${n.title} as read`} onClick={() => read(n.id)}><Check className="h-4 w-4" /></Button>}</div>)}
    </div></PopoverContent>
  </Popover>;
}