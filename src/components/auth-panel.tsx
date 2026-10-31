import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const base = {
  company_name: z.string().trim().min(2, "Company name is required").max(120),
  email: z.string().trim().email("Enter a valid work email").max(255),
  phone: z.string().trim().regex(/^\+?[0-9 -]{10,15}$/, "Enter a valid contact number"),
  address: z.string().trim().min(5, "Address is required").max(300),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
};
const purchaserSchema = z.object(base);
const supplierSchema = z.object({
  ...base,
  products: z.string().trim().min(3, "Describe products/services sold").max(500),
  gstin: z.string().trim().toUpperCase().regex(/^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Invalid GSTIN format"),
  categories: z.array(z.string()).min(1, "Pick at least one category"),
});

type Mode = "choose" | "purchaser" | "supplier" | "login";

export function AuthPanel({ initial = "choose" as Mode }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [form, setForm] = useState<Record<string, string>>({});
  const [cats, setCats] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const navigate = useNavigate();
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function register() {
    const schema = mode === "supplier" ? supplierSchema : purchaserSchema;
    const parsed = schema.safeParse({ ...form, gstin: form.gstin ?? "", categories: cats });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    const d = parsed.data as any;
    const { data, error } = await supabase.auth.signUp({
      email: d.email,
      password: d.password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { account_type: mode, company_name: d.company_name, phone: d.phone, address: d.address, gstin: d.gstin ?? "", categories: d.categories ?? [], products: d.products ?? "" },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(/already|registered/i.test(error.message) ? "An account with this email already exists. Please sign in." : error.message);
      return;
    }
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      toast.error("An account with this email already exists. Please sign in.");
      return;
    }
    toast.success("Registered successfully");
    if (data.session) navigate({ to: mode === "supplier" ? "/supplier" : "/dashboard" });
    else setDone(d.email);
  }

  async function login() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: form.email ?? "", password: form.password ?? "" });
    setBusy(false);
    if (error) return toast.error(error.message);
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("account_type").eq("id", u.user!.id).maybeSingle();
    navigate({ to: p?.account_type === "supplier" ? "/supplier" : "/dashboard" });
  }

  const field = (k: string, label: string, type = "text", placeholder?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} placeholder={placeholder} value={form[k] ?? ""} onChange={set(k)} aria-invalid={!!errors[k]} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  if (done)
    return (
      <div className="space-y-3 text-center">
        <div className="rounded-md bg-success/15 p-3 text-sm font-medium text-success">Registered successfully</div>
        <p className="text-sm text-muted-foreground">We sent a confirmation link to <b>{done}</b>. Confirm your email, then sign in.</p>
        <Button variant="outline" onClick={() => { setDone(null); setMode("login"); }}>Go to sign in</Button>
      </div>
    );

  if (mode === "choose")
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Get started with Nexora</h2>
        {([
          ["purchaser", Building2, "Sign up as Purchaser", "Raise requests, compare quotes, approve and order."],
          ["supplier", Truck, "Sign up as Supplier", "Receive RFQs and submit quotations."],
        ] as const).map(([m, Icon, t, d]) => (
          <button key={m} onClick={() => setMode(m)} className="flex w-full items-start gap-3 rounded-lg border bg-card p-4 text-left transition hover:border-primary">
            <Icon className="mt-0.5 h-5 w-5 text-primary" />
            <div><div className="font-medium">{t}</div><div className="text-sm text-muted-foreground">{d}</div></div>
          </button>
        ))}
        <p className="text-center text-sm text-muted-foreground">Already registered? <button className="font-medium text-primary" onClick={() => setMode("login")}>Sign in</button></p>
      </div>
    );

  if (mode === "login")
    return (
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); login(); }}>
        <h2 className="text-xl font-semibold">Sign in</h2>
        {field("email", "Work email", "email")}
        {field("password", "Password", "password")}
        <Button className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        <p className="text-center text-sm text-muted-foreground">New here? <button type="button" className="font-medium text-primary" onClick={() => setMode("choose")}>Create an account</button></p>
      </form>
    );

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); register(); }}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{mode === "supplier" ? "Supplier registration" : "Purchaser registration"}</h2>
        <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode("choose")}>Back</button>
      </div>
      {field("company_name", "Company name")}
      <div className="grid gap-3 sm:grid-cols-2">
        {field("email", "Work email", "email", "you@company.in")}
        {field("phone", "Contact number", "tel", "+91 98xxxxxxxx")}
      </div>
      {field("address", mode === "supplier" ? "Address" : "Company address / location")}
      {mode === "supplier" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="products">Products / services sold</Label>
            <Textarea id="products" rows={2} value={form.products ?? ""} onChange={set("products")} />
            {errors.products && <p className="text-xs text-destructive">{errors.products}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Product categories</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map((c) => (
                <label key={c} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs", cats.includes(c) && "border-primary bg-accent")}>
                  <Checkbox checked={cats.includes(c)} onCheckedChange={(v) => setCats(v ? [...cats, c] : cats.filter((x) => x !== c))} />
                  {c}
                </label>
              ))}
            </div>
            {errors.categories && <p className="text-xs text-destructive">{errors.categories}</p>}
          </div>
          {field("gstin", "GSTIN (optional)")}
        </>
      )}
      {field("password", "Password", "password")}
      <Button className="w-full" disabled={busy}>{busy ? "Registering…" : "Create account"}</Button>
    </form>
  );
}
