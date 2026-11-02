import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { REQUEST_STATUS_LABEL, RFQ_STATUS_LABEL, toneFor } from "@/lib/constants";

const tones = {
  default: "bg-muted text-muted-foreground",
  info: "bg-accent text-accent-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground dark:text-warning",
  danger: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const text = label ?? REQUEST_STATUS_LABEL[status] ?? RFQ_STATUS_LABEL[status] ?? status.replace(/_/g, " ");
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap", tones[toneFor(status)])}>{text}</span>;
}

export function DemoBadge() {
  return <span className="inline-flex rounded border border-warning/60 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-warning-foreground dark:text-warning">Demo</span>;
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground"><Inbox className="h-5 w-5" /></span>
      <div className="max-w-sm">{children}</div>
    </div>
  );
}

export function Loading() {
  return <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />Loading…</div>;
}

export function ErrorNote({ error }: { error: unknown }) {
  return <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error instanceof Error ? error.message : String(error)}</div>;
}
