import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, CheckCircle2, ClipboardList, Hexagon, Mail, Scale, Search, ShieldCheck, UserCheck } from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";
import { Button } from "@/components/ui/button";

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

const steps = [
  [ClipboardList, "Request", "Describe what you need — or let the AI fill the form for you."],
  [Search, "AI finds suppliers", "Nexora matches vendors and sends RFQs from your Gmail."],
  [Scale, "Compare quotes", "AI ranks quotations on landed cost, delivery and past performance."],
  [CheckCircle2, "Approve and order", "Your manager approves and the purchase order goes to the vendor."],
] as const;

const features = [
  [Bot, "AI-powered purchasing", "Turn a request into structured specs and matched suppliers in seconds."],
  [Mail, "Automated vendor emails", "RFQs go out with a unique request tag; replies are tracked."],
  [Scale, "Smart quotation comparison", "Clear rankings in INR with GST, delivery and vendor record."],
  [ShieldCheck, "Transparent decisions", "Every score, flag and reason is visible and logged."],
  [UserCheck, "Human approval", "AI recommends. Your managers decide."],
  [CheckCircle2, "Budget tracking", "See yearly investment and balance left at a glance."],
] as const;

function scrollToSignup() {
  document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-sm"><Hexagon className="h-4 w-4" /></span>
            Nexora
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
            <Button size="sm" onClick={scrollToSignup}>Get started</Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-start gap-12 px-6 pb-20 pt-14 lg:grid-cols-[1.15fr_1fr] lg:pt-24">
          <div className="lg:pt-6">
            <p className="mb-5 inline-flex rounded-full border bg-card px-3 py-1 text-xs font-medium text-accent-foreground shadow-card">For growing Indian B2B businesses</p>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
              Procurement on <span className="bg-gradient-primary bg-clip-text text-transparent">autopilot</span>, with you in control.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">From purchase request to purchase order — AI finds suppliers, compares quotes in INR with GST, and hands your manager a clear recommendation.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={scrollToSignup}>Get started <ArrowRight /></Button>
              <Button asChild size="lg" variant="outline"><a href="#how">See how it works</a></Button>
            </div>
          </div>
          <div id="get-started" className="scroll-mt-24 rounded-2xl border bg-card p-6 shadow-card-hover lg:sticky lg:top-24">
            <AuthPanel />
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-y bg-card/60 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">How Nexora works</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">Four simple steps from need to order.</p>
            <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(([Icon, t, d], i) => (
                <li key={t} className="rounded-2xl border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-card-hover">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span>
                    <span className="font-display text-3xl font-extrabold text-muted-foreground/30">0{i + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg">{t}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Everything your purchasing team needs</h2>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([Icon, t, d]) => (
              <li key={t} className="flex gap-4 rounded-2xl border bg-card p-6 shadow-card transition hover:shadow-card-hover">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span>
                <div><div className="font-semibold">{t}</div><div className="mt-1 text-sm text-muted-foreground">{d}</div></div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="rounded-3xl bg-gradient-primary px-8 py-14 text-center text-primary-foreground shadow-card-hover">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to make procurement easy?</h2>
            <p className="mx-auto mt-3 max-w-lg opacity-90">Create your company account in minutes and raise your first request today.</p>
            <Button size="lg" variant="secondary" className="mt-8" onClick={scrollToSignup}>Get started free <ArrowRight /></Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} Nexora · AI procurement</footer>
    </div>
  );
}
