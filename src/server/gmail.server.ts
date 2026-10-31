const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

export function gmailConfigured() {
  return Boolean(process.env.LOVABLE_API_KEY && process.env.GOOGLE_MAIL_API_KEY);
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": process.env.GOOGLE_MAIL_API_KEY ?? "",
    "Content-Type": "application/json",
  };
}

const b64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const hdr = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

export async function gmailProfile(): Promise<{ emailAddress: string } | null> {
  if (!gmailConfigured()) return null;
  const r = await fetch(`${GATEWAY}/users/me/profile`, { headers: headers() });
  if (!r.ok) return null;
  return r.json();
}

export async function sendGmail(to: string, subject: string, body: string): Promise<string> {
  if (!gmailConfigured()) throw new Error("Gmail is not connected");
  const raw = b64([`To: ${to}`, `Subject: ${hdr(subject)}`, "MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"', "", body].join("\r\n"))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const r = await fetch(`${GATEWAY}/users/me/messages/send`, { method: "POST", headers: headers(), body: JSON.stringify({ raw }) });
  if (!r.ok) throw new Error(`Gmail send failed [${r.status}]: ${(await r.text()).slice(0, 300)}`);
  const j = (await r.json()) as { id: string };
  return j.id;
}

type Part = { mimeType?: string; filename?: string; body?: { data?: string; size?: number; attachmentId?: string }; parts?: Part[] };
function decode(d: string) {
  const bin = atob(d.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
export type MailAttachment = { filename: string; mimeType?: string; size?: number; attachmentId?: string };
function walk(p: Part, out: { text: string; attachments: MailAttachment[] }) {
  if (p.filename) out.attachments.push({ filename: p.filename, mimeType: p.mimeType, size: p.body?.size, attachmentId: p.body?.attachmentId });
  else if (p.mimeType === "text/plain" && p.body?.data) out.text += decode(p.body.data);
  p.parts?.forEach((c) => walk(c, out));
}

export async function searchReplies(query: string) {
  const r = await fetch(`${GATEWAY}/users/me/messages?maxResults=25&q=${encodeURIComponent(query)}`, { headers: headers() });
  if (!r.ok) throw new Error(`Gmail search failed [${r.status}]: ${(await r.text()).slice(0, 300)}`);
  const list = (await r.json()) as { messages?: { id: string }[] };
  const out = [];
  for (const m of list.messages ?? []) {
    const mr = await fetch(`${GATEWAY}/users/me/messages/${m.id}?format=full`, { headers: headers() });
    if (!mr.ok) continue;
    const msg = (await mr.json()) as { id: string; internalDate: string; payload: Part & { headers: { name: string; value: string }[] } };
    const h = (n: string) => msg.payload.headers.find((x) => x.name.toLowerCase() === n)?.value ?? "";
    const acc = { text: "", attachments: [] as MailAttachment[] };
    walk(msg.payload, acc);
    const fromRaw = h("from");
    const email = (fromRaw.match(/<([^>]+)>/)?.[1] ?? fromRaw).trim().toLowerCase();
    out.push({ id: msg.id, from: email, subject: h("subject"), body: acc.text.slice(0, 8000), receivedAt: new Date(Number(msg.internalDate)).toISOString(), attachments: acc.attachments });
  }
  return out;
}

/** Downloads a Gmail attachment and returns standard base64 bytes. */
export async function getAttachment(messageId: string, attachmentId: string): Promise<string | null> {
  const r = await fetch(`${GATEWAY}/users/me/messages/${messageId}/attachments/${attachmentId}`, { headers: headers() });
  if (!r.ok) return null;
  const j = (await r.json()) as { data?: string };
  if (!j.data) return null;
  const s = j.data.replace(/-/g, "+").replace(/_/g, "/");
  return s + "=".repeat((4 - (s.length % 4)) % 4);
}
