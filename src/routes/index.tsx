import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Bot, CheckCircle2, ClipboardList, Hexagon, Mail, Scale, Search, ShieldCheck, Sparkles, UserCheck, Wallet } from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

/* ---------- hooks ---------- */
function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const f = () => setR(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return r;
}

function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

function Reveal({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  const [ref, seen] = useInView<HTMLElement>(0.12);
  return <section id={id} ref={ref} className={cn("reveal", seen && "is-visible", className)}>{children}</section>;
}

/* ---------- hero flow ---------- */
const flow = [
  ["Request", ClipboardList, "50 chairs requested"],
  ["AI Match", Sparkles, "3 suppliers matched"],
  ["RFQ Email", Mail, "RFQs sent"],
  ["Compare", Scale, "Quote received ₹48,500"],
  ["Approve", CheckCircle2, "Approved ✓"],
] as const;

function FlowDiagram() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setStep((s) => (s + 1) % flow.length), 1800);
    return () => clearInterval(t);
  }, [reduced]);
  const pct = (step / (flow.length - 1)) * 100;
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card p-5 shadow-card-hover sm:p-8" aria-label="Procurement flow: Request, AI Match, RFQ Email, Compare, Approve">
      <div className="mb-8 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Live procurement flow</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />Running</span>
      </div>
      <div className="relative mx-4 sm:mx-6">
        <div className="absolute left-0 right-0 top-5 h-0.5 rounded bg-border" />
        <div className="absolute left-0 top-5 h-0.5 rounded bg-gradient-primary transition-[width] duration-700 ease-in-out" style={{ width: `${pct}%` }} />
        <div
          className="absolute top-5 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_14px_4px_var(--primary)] transition-[left] duration-700 ease-in-out"
          style={{ left: `${pct}%`, marginTop: 1 }}
        />
        <ol className="relative flex justify-between">
          {flow.map(([name, Icon], i) => {
            const active = i === step, done = i <= step;
            return (
              <li key={name} className="flex w-0 flex-col items-center">
                <span className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 bg-card transition-all duration-500",
                  done ? "border-primary text-primary" : "border-border text-muted-foreground",
                  active && "scale-110 bg-primary text-primary-foreground animate-node-pulse",
                )}><Icon className="h-4 w-4" /></span>
                <span className={cn("mt-2 whitespace-nowrap text-[10px] font-medium sm:text-xs", done ? "text-foreground" : "text-muted-foreground")}>{name}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="mt-8 flex h-10 items-center justify-center">
        <span key={step} className="animate-rise-in rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">{flow[step][2]}</span>
      </div>
    </div>
  );
}

function FloatingShapes() {
  const shapes = [
    "left-[6%] top-[18%] h-6 w-6", "left-[42%] top-[8%] h-4 w-4", "right-[8%] top-[22%] h-8 w-8",
    "left-[18%] bottom-[12%] h-5 w-5", "right-[30%] bottom-[8%] h-6 w-6", "right-[4%] bottom-[30%] h-4 w-4",
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {shapes.map((c, i) => (
        <svg key={c} viewBox="0 0 24 24" className={cn("absolute text-primary/15 animate-drift", c)} style={{ animationDelay: `${i * -2.3}s`, animationDuration: `${12 + i * 2}s` }}>
          {i % 2 ? <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" /> : <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="currentColor" />}
        </svg>
      ))}
    </div>
  );
}

/* ---------- stats ---------- */
function Counter({ to, suffix, label }: { to: number; suffix: string; label: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced) { setN(to); return; }
    let raf = 0; const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1400);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, reduced, to]);
  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-4xl font-extrabold text-primary sm:text-5xl">{n}{suffix}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

/* ---------- how it works ---------- */
const steps = [
  [ClipboardList, "Request", "Describe what you need — or let the AI fill the form for you."],
  [Search, "AI finds suppliers", "Nexora matches vendors and sends RFQs from your Gmail."],
  [Scale, "Compare quotes", "AI ranks quotations on landed cost, delivery and past performance."],
  [CheckCircle2, "Approve and order", "Your manager approves and the purchase order goes to the vendor."],
] as const;

function Steps() {
  const ref = useRef<HTMLOListElement>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      setP(Math.max(0, Math.min(1, (vh * 0.75 - r.top) / r.height)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return (
    <ol ref={ref} className="relative mx-auto mt-12 max-w-2xl space-y-8">
      <span aria-hidden className="absolute bottom-6 left-6 top-6 w-0.5 bg-border" />
      <span aria-hidden className="absolute left-6 top-6 w-0.5 origin-top bg-gradient-primary" style={{ height: "calc(100% - 3rem)", transform: `scaleY(${p})` }} />
      {steps.map(([Icon, t, d], i) => {
        const lit = p >= i / steps.length;
        return (
          <li key={t} className="relative flex gap-5">
            <span className={cn("relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 font-display font-bold transition-colors duration-500", lit ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>{i + 1}</span>
            <div className="flex-1 rounded-2xl border bg-card p-5 shadow-card transition hover:-translate-y-1 hover:shadow-card-hover">
              <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><h3 className="text-lg">{t}</h3></div>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- chat preview ---------- */
const PROMPT = "Order 50 office chairs under ₹2 lakh";
function ChatPreview() {
  const reduced = useReducedMotion();
  const [typed, setTyped] = useState(0);
  const [reply, setReply] = useState(false);
  useEffect(() => {
    if (reduced) { setTyped(PROMPT.length); setReply(true); return; }
    let i = 0, t: ReturnType<typeof setTimeout>;
    const run = () => {
      if (i <= PROMPT.length) { setTyped(i++); t = setTimeout(run, 55); }
      else { setReply(true); t = setTimeout(() => { i = 0; setReply(false); setTyped(0); t = setTimeout(run, 500); }, 3200); }
    };
    run();
    return () => clearTimeout(t);
  }, [reduced]);
  return (
    <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-card-hover">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground"><Bot className="h-4 w-4" /></span>Nexora assistant</div>
      <div className="space-y-3 text-sm">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-primary-foreground">
          {PROMPT.slice(0, typed)}{typed < PROMPT.length && <span className="animate-blink">|</span>}
        </div>
        <div className="h-10">
          {reply && <div className="animate-rise-in w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-accent px-4 py-2 text-accent-foreground">Found 4 suppliers, RFQs ready to send</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
const features = [
  [Bot, "AI-powered purchasing", "Turn a request into structured specs and matched suppliers in seconds."],
  [Mail, "Automated vendor emails", "RFQs go out with a unique request tag; replies are tracked."],
  [Scale, "Smart quotation comparison", "Clear rankings in INR with GST, delivery and vendor record."],
  [ShieldCheck, "Transparent decisions", "Every score, flag and reason is visible and logged."],
  [UserCheck, "Human approval", "AI recommends. Your managers decide."],
  [Wallet, "Budget tracking", "See yearly investment and balance left at a glance."],
] as const;

function scrollToSignup() {
  document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
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
        <section className="relative">
          <FloatingShapes />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-14 lg:grid-cols-[1fr_1.05fr] lg:pt-24">
            <div className="animate-rise-in">
              <p className="mb-5 inline-flex rounded-full border bg-card px-3 py-1 text-xs font-medium text-accent-foreground shadow-card">For growing Indian B2B businesses</p>
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
                Make procurement{" "}
                <span className="relative inline-block text-primary">easy<span aria-hidden className="underline-gradient absolute -bottom-1 left-0 h-1.5 w-full rounded-full" /></span>.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">From purchase request to purchase order — AI finds suppliers, compares quotes in INR with GST, and hands your manager a clear recommendation.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={scrollToSignup}>Get started <ArrowRight /></Button>
                <Button asChild size="lg" variant="outline"><a href="#how">See how it works</a></Button>
              </div>
            </div>
            <div className="animate-rise-in [animation-delay:150ms]"><FlowDiagram /></div>
          </div>
        </section>

        <section className="border-y bg-card/70">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-12 sm:grid-cols-3">
            <Counter to={10} suffix="x" label="faster quoting" />
            <Counter to={100} suffix="%" label="human-approved" />
            <div className="text-center"><div className="font-display text-4xl font-extrabold text-primary sm:text-5xl">GST</div><div className="mt-1 text-sm text-muted-foreground">ready, all in INR</div></div>
          </div>
        </section>

        <Reveal id="how" className="scroll-mt-20 px-6 py-20">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">How Nexora works</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">Four simple steps from need to order.</p>
          <Steps />
        </Reveal>

        <Reveal className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Just say what you need</h2>
            <p className="mt-3 max-w-md text-muted-foreground">Type a request in plain words. Nexora fills the purchase form and finds suppliers for you.</p>
          </div>
          <div className="flex justify-center lg:justify-end"><ChatPreview /></div>
        </Reveal>

        <Reveal className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Everything your purchasing team needs</h2>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([Icon, t, d]) => (
              <li key={t} className="flex gap-4 rounded-2xl border bg-card p-6 shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-card-hover">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span>
                <div><div className="font-semibold">{t}</div><div className="mt-1 text-sm text-muted-foreground">{d}</div></div>
              </li>
            ))}
          </ul>
        </Reveal>

        <section id="get-started" className="mx-auto grid max-w-7xl scroll-mt-24 items-center gap-10 px-6 pb-24 lg:grid-cols-2">
          <div className="rounded-3xl bg-gradient-primary px-8 py-14 text-primary-foreground shadow-card-hover">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to make procurement easy?</h2>
            <p className="mt-3 max-w-md opacity-90">Create your company account in minutes and raise your first request today.</p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-card-hover"><AuthPanel /></div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} Nexora · AI procurement</footer>
    </div>
  );
}
