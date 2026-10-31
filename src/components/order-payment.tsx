import { QRCodeSVG } from "qrcode.react";
import { Mail, ShieldCheck } from "lucide-react";
import { demoQrPayload, paymentMethodLabel } from "@/lib/purchasing";

export function OrderPayment({ po, adminEmails }: { po: any; adminEmails: string[] }) {
  return <section className="space-y-3 border-t pt-4">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-success" />Approved vendor & payment</h3>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-3 text-sm">
        <div><span className="text-muted-foreground">Approved vendor</span><p className="font-medium">{po.supplier_name}</p><p className="break-all text-muted-foreground">{po.supplier_email}</p></div>
        <div><span className="text-muted-foreground">Company admin email</span>{adminEmails.length ? adminEmails.map((email) => <a key={email} href={`mailto:${email}`} className="flex items-center gap-2 break-all text-primary hover:underline"><Mail className="h-3 w-3 shrink-0" />{email}</a>) : <p>Not available</p>}</div>
        <div><span className="text-muted-foreground">Payment method</span><p className="font-medium">{paymentMethodLabel(po.payment_mode)}</p><p className="mt-1 text-xs text-muted-foreground">No payment recorded</p></div>
      </div>
      {po.payment_mode === "upi_demo" && <div className="flex flex-col items-center gap-2 border border-warning/40 p-4">
        <span className="text-xs font-semibold text-warning">ADMIN UPI · DEMO QR</span>
        <div className="demo-payment-qr p-3"><QRCodeSVG value={demoQrPayload(po.po_number ?? "Draft")} size={144} marginSize={1} /></div>
        <p className="text-center text-xs text-muted-foreground">Demo only — not a payable UPI code.<br />No money will be transferred.</p>
      </div>}
    </div>
  </section>;
}