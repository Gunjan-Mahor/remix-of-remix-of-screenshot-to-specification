import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Me = {
  userId: string;
  email: string;
  profile: { account_type: string; full_name: string | null; phone: string | null; notify_email: boolean } | null;
  membership: { company_id: string; role: "admin" | "manager" | "employee" } | null;
  company: any | null;
  supplier: any | null;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me | null> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [p, m, s] = await Promise.all([
        supabase.from("profiles").select("account_type, full_name, phone, notify_email").eq("id", u.user.id).maybeSingle(),
        supabase.from("company_members").select("company_id, role").eq("user_id", u.user.id).maybeSingle(),
        supabase.from("suppliers").select("*").eq("user_id", u.user.id).maybeSingle(),
      ]);
      let company = null;
      if (m.data) company = (await supabase.from("companies").select("*").eq("id", m.data.company_id).maybeSingle()).data;
      return { userId: u.user.id, email: u.user.email ?? "", profile: p.data, membership: m.data as Me["membership"], company, supplier: s.data };
    },
  });
}

export const canApprove = (me: Me | null | undefined) => me?.membership?.role === "admin" || me?.membership?.role === "manager";
export const isAdmin = (me: Me | null | undefined) => me?.membership?.role === "admin";
