import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Mail, Scale, ShieldCheck, UserCheck, Hexagon } from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexora — AI Procurement for Growing Indian Businesses" },
      { name: "description", content: "AI-powered purchasing, automated vendor emails, smart quotation comparison and human approval for Indian B2B teams." },
      { property: "og:title", content: "Nexora — AI Procurement for Growing Indian Businesses" },
      { property: "og:description", content: "Make procurement easy: AI vendor matching, RFQ emails, quote comparison and approvals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  [Bot, "AI-powered purchasing", "Turn a request into structured specs and matched suppliers in seconds."],
  [Mail, "Automated vendor emails", "RFQs go out from your Gmail with a unique request tag; replies are tracked."],
  [Scale, "Smart quotation comparison", "Weighted scoring on landed cost, delivery, quality, terms and vendor record."],
  [ShieldCheck, "Transparent decisions", "Every score, flag and reason is visible and logged."],
  [UserCheck, "Human approval", "AI recommends. Your managers decide."],
] as const;

export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold"><Hexagon className="h-6 w-6 text-primary" /> Nexora</Link>
        <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
      </header>
      <main className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.2fr_1fr] lg:pt-16">
        <section>
          <p className="mb-4 inline-flex rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">For growing mid-sized Indian B2B businesses</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Make procurement easy with <span className="text-primary">Nexora</span>.</h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">From purchase request to purchase order — AI finds the right suppliers, sends RFQs, compares quotations in INR with GST, and hands your manager a clear recommendation to approve.</p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {features.map(([Icon, t, d]) => (
              <li key={t} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent"><Icon className="h-4 w-4 text-accent-foreground" /></div>
                <div><div className="font-medium">{t}</div><div className="text-sm text-muted-foreground">{d}</div></div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border bg-card p-6 shadow-sm lg:sticky lg:top-8 lg:self-start">
          <AuthPanel />
        </section>
      </main>
    </div>
  );
}
