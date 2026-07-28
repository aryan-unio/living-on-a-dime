import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, Copy, Download, Edit, IndianRupee, Mail, MessageCircle, Printer, Trash2, XCircle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { InvoicePrintTemplate } from "@/components/invoice-print-template";
import { useStore } from "@/hooks/use-store";
import { nextInvoiceNumber, store, uid } from "@/lib/storage";
import { computeInvoiceTotals, deriveStatus } from "@/lib/calc";
import { formatDate, formatMoney } from "@/lib/format";
import type { Payment, PaymentMode } from "@/lib/types";

export const Route = createFileRoute("/invoices/$id/")({
  head: () => ({ meta: [{ title: "Invoice — Unio Invoice" }] }),
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const invoices = useStore(() => store.getInvoices());
  const customers = useStore(() => store.getCustomers());
  const company = useStore(() => store.getCompany());
  const invoice = invoices.find((i) => i.id === id);
  const customer = invoice ? customers.find((c) => c.id === invoice.customerId) : undefined;
  const printRef = useRef<HTMLDivElement>(null);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => { if (!invoice) toast.error("Invoice not found"); }, [invoice]);

  if (!invoice) {
    return (
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" onClick={() => navigate({ to: "/invoices" })}><ArrowLeft size={16} /> Back to invoices</Button>
        <Card className="mt-4 p-12 text-center">
          <p className="text-muted-foreground">This invoice doesn't exist.</p>
        </Card>
      </div>
    );
  }

  const totals = computeInvoiceTotals(invoice, company, customer);
  const status = deriveStatus(invoice, company, customer);

  const triggerPrint = () => {
    const prevTitle = document.title;
    document.title = "";
    document.body.classList.add("print-mode");
    const cleanup = () => {
      document.body.classList.remove("print-mode");
      document.title = prevTitle;
      window.onafterprint = null;
    };
    window.onafterprint = cleanup;
    window.print();
    // Fallback in case onafterprint doesn't fire
    setTimeout(cleanup, 1000);
  };
  const downloadPDF = triggerPrint;
  const printInvoice = triggerPrint;


  const markVoid = () => {
    store.upsertInvoice({ ...invoice, status: "void" });
    toast.success("Invoice marked void");
  };
  const remove = () => {
    store.deleteInvoice(invoice.id);
    toast.success("Invoice deleted");
    navigate({ to: "/invoices" });
  };

  const curr = invoice.currency || company.currency;
  const upiLink = curr === "INR" && company.country === "India" && company.upiId && totals.balance > 0
    ? `upi://pay?pa=${encodeURIComponent(company.upiId)}&pn=${encodeURIComponent(company.name)}&am=${totals.balance.toFixed(2)}&cu=INR&tn=${encodeURIComponent(invoice.number)}`
    : "";
  const whatsappMessage = encodeURIComponent(
    `Invoice ${invoice.number} for ${formatMoney(totals.total, invoice.currency)} ` +
    `from ${company.name} is due on ${formatDate(invoice.dueDate)}.`
  );

  const cloneInvoice = () => {
    const newInv = {
      ...invoice,
      id: uid("inv"),
      number: nextInvoiceNumber(),
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: "draft" as const,
      payments: [],
    };
    store.upsertInvoice(newInv);
    toast.success("Invoice cloned. You're now editing the copy.");
    navigate({ to: "/invoices/$id/edit", params: { id: newInv.id } });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Button variant="ghost" className="mb-2 -ml-2" onClick={() => navigate({ to: "/invoices" })}>
        <ArrowLeft size={16} /> Back to invoices
      </Button>
      <PageHeader
        title={invoice.number}
        subtitle={customer?.displayName || "No customer"}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={status} className="self-center" />
            <PrintTipWrapper>
              <Button variant="outline" onClick={downloadPDF}><Download size={16} /> PDF</Button>
            </PrintTipWrapper>
            <Button variant="outline" onClick={printInvoice}><Printer size={16} /> Print</Button>

            <Button variant="outline" onClick={() => toast.info("Email would be sent in production")}><Mail size={16} /> Email</Button>
            <Button variant="outline" className="text-emerald-600 border-emerald-300" asChild>
              <a href={`https://wa.me/?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} /> WhatsApp
              </a>
            </Button>
            <Button variant="outline" onClick={cloneInvoice}><Copy size={16} /> Clone</Button>
            <Button variant="outline" asChild><Link to="/invoices/$id/edit" params={{ id: invoice.id }}><Edit size={16} /> Edit</Link></Button>
            {totals.balance > 0 && status !== "void" && (
              <Button className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" onClick={() => setPayOpen(true)}>
                <IndianRupee size={16} /> Record Payment
              </Button>
            )}
            {status !== "void" && (
              <Button variant="outline" onClick={markVoid}><XCircle size={16} /> Void</Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-[var(--danger)]"><Trash2 size={16} /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete invoice {invoice.number}?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} className="bg-[var(--danger)] hover:bg-[var(--danger)]/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div ref={printRef} className="bg-white print-target">
              <InvoicePrintTemplate invoice={invoice} company={company} customer={customer} totals={totals} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-5">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Total</div>
                <div className="text-2xl font-semibold">{formatMoney(totals.total, curr)}</div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium text-[var(--success)]">{formatMoney(totals.paid, curr)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Balance Due</span>
                <span className="font-semibold text-[var(--danger)]">{formatMoney(totals.balance, curr)}</span>
              </div>
              <div className="border-t pt-3 text-xs text-muted-foreground">
                Due {formatDate(invoice.dueDate)}
              </div>
            </CardContent>
          </Card>

          {upiLink && (
            <Card>
              <CardContent className="p-5 text-center">
                <div className="text-xs font-medium uppercase text-muted-foreground">Pay via UPI</div>
                <div className="my-3 flex items-center justify-center">
                  <QRCodeSVG value={upiLink} size={160} fgColor="#0F7B6C" />
                </div>
                <div className="text-xs text-muted-foreground">{company.upiId}</div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-5">
              <div className="mb-2 text-sm font-semibold">Payment History</div>
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {invoice.payments.map((p) => (
                    <li key={p.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                      <div>
                        <div className="font-medium">{formatMoney(p.amount, curr)}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(p.date)} · {p.mode.replace("_", " ")}{p.reference ? ` · ${p.reference}` : ""}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        max={totals.balance}
        onRecord={(p) => {
          const updated = { ...invoice, payments: [...invoice.payments, p] };
          const newStatus = deriveStatus(updated, company, customer);
          store.upsertInvoice({ ...updated, status: newStatus });
          toast.success("Payment recorded");
          setPayOpen(false);
        }}
      />
      {createPortal(
        <div className="print-portal">
          <div className="print-target">
            <InvoicePrintTemplate invoice={invoice} company={company} customer={customer} totals={totals} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function PaymentDialog({
  open, onOpenChange, max, onRecord,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  max: number;
  onRecord: (p: Payment) => void;
}) {
  const [amount, setAmount] = useState(max);
  const [mode, setMode] = useState<PaymentMode>("bank_transfer");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { if (open) { setAmount(max); setReference(""); setDate(new Date().toISOString().slice(0, 10)); } }, [open, max]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pay-amount">Amount</Label>
              <Input id="pay-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label htmlFor="pay-date">Date</Label>
              <Input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Payment Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as PaymentMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="pay-ref">Reference</Label>
            <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn ID, cheque #, etc." />
          </div>
          <Textarea placeholder="Notes (optional)" rows={2} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"
            onClick={() => onRecord({
              id: uid("pay"),
              amount,
              mode,
              reference,
              date: new Date(date).toISOString(),
            })}
            disabled={amount <= 0}
          >
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PRINT_TIP_KEY = "unio_print_tip_dismissed";
function PrintTipWrapper({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(PRINT_TIP_KEY)) setShow(true);
  }, []);
  const dismiss = () => {
    localStorage.setItem(PRINT_TIP_KEY, "1");
    setShow(false);
  };
  return (
    <div className="relative" onClickCapture={() => { if (show) dismiss(); }}>
      {children}
      {show && (
        <div className="absolute top-full left-1/2 z-50 mt-2 w-64 -translate-x-1/2 rounded-md bg-slate-900 p-3 text-xs text-white shadow-lg">
          <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900" />
          Tip: Uncheck "Headers and footers" in the print dialog to remove the URL from your PDF.
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            className="mt-2 block text-[11px] font-medium text-emerald-300 hover:underline"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}

