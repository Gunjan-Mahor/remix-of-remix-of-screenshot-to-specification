import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Bot } from "lucide-react";
import { getIntegrationStatus } from "@/lib/nexora.functions";

export function IntegrationStatus() {
  const fn = useServerFn(getIntegrationStatus);
  const { data, isLoading } = useQuery({ queryKey: ["integrations"], queryFn: () => fn(), staleTime: 60000 });
  if (isLoading || !data) return null;
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${data.gmailConnected ? "border-success/40 text-success" : "border-warning/60 text-warning-foreground dark:text-warning"}`}>
        <Mail className="h-3.5 w-3.5" /> {data.gmailConnected ? `Gmail connected: ${data.gmailAddress}` : "Gmail not connected — real emails disabled; demo suppliers use simulated flow"}
      </span>
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${data.aiConfigured ? "border-success/40 text-success" : "border-destructive/40 text-destructive"}`}>
        <Bot className="h-3.5 w-3.5" /> {data.aiConfigured ? "Gemini AI ready" : "AI not configured"}
      </span>
    </div>
  );
}
