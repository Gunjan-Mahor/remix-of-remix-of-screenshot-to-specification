import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/purchasing";

export function usePeople() {
  return useQuery({
    queryKey: ["people"],
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      return new Map((data ?? []).map((p) => [p.id, p.full_name || p.email || "Team member"]));
    },
  });
}

/** Round initials avatar with role label and the person's name. */
export function PersonChip({ id, name, label }: { id?: string | null; name?: string | null; label: string }) {
  const people = usePeople();
  const display = (id && people.data?.get(id)) || name || "Unknown";
  return (
    <div className="inline-flex items-center gap-2">
      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials(display)}</span>
      <span className="leading-tight"><span className="block text-xs text-muted-foreground">{label}</span><span className="block text-sm font-medium">{display}</span></span>
    </div>
  );
}
