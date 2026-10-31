import { createFileRoute, Link } from "@tanstack/react-router";
import { Hexagon } from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Nexora" },
      { name: "description", content: "Sign in or register your company on Nexora." },
      { property: "og:title", content: "Sign in — Nexora" },
      { property: "og:description", content: "Sign in or register your company on Nexora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <Link to="/" className="mb-6 flex items-center gap-2 font-display text-lg font-semibold"><Hexagon className="h-6 w-6 text-primary" /> Nexora</Link>
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm"><AuthPanel initial="login" /></div>
    </div>
  ),
});
