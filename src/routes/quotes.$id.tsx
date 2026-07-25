import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRightLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { useStore } from "@/hooks/use-store";
import { nextInvoiceNumber, store, uid } from "@/lib/storage";
import { formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/quotes/$id")({
  head: () => ({ meta: [{ title: "Quote — Unio Invoice" }] }),
  component: QuoteDetail,
});

function QuoteDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const quotes = useStore(() => store.getQuotes());
  const customers = useStore(() => store.getCustomers());
  const q = quotes.find((x) => x.id === id);

  if (!q) {
    return <div className="mx-auto max-w-3xl"><Button variant="ghost" onClick={() => navigate({ to: "/quotes" })}><ArrowLeft size={16} /> Back</Button><Card className="mt-4 p-12 text-center"><p className="text-muted-foreground">Quote not found.</p></Card></div>;
  }
  const cust = customers.find((c) => c.id === q.customerId);

  const convert = () => {
    const inv = {
      id: uid("inv"),
      number: nextInvoiceNumber(),
      customerId: q.customerId,
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      
      lineItems: q.lineItems || [{ id: uid("li"), description: q.notes || "Converted from quote", qty: 1, rate: q.total || 0, taxRate: 18, hsnCode: "" }],
      discount: q.discount || { type: "percent" as const, value: 0 },
      notes: q.notes,
      status: "draft" as const,
      payments: [],
    };
    store.upsertInvoice(inv);
    store.upsertQuote({ ...q, status: "converted" });
    toast.success("Quote converted to invoice");
    navigate({ to: "/invoices/$id/edit", params: { id: inv.id } });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" className="-ml-2 mb-2" onClick={() => navigate({ to: "/quotes" })}><ArrowLeft size={16} /> Back to quotes</Button>
      <PageHeader
        title={q.number}
        subtitle={cust?.displayName || "—"}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={q.status} className="self-center" />
            {(q.status === "sent" || q.status === "accepted" || q.status === "draft") && (
              <Button className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" onClick={convert}><ArrowRightLeft size={16} /> Convert to Invoice</Button>
            )}
            <Button variant="outline" className="text-red-600" onClick={() => { store.deleteQuote(q.id); toast.success("Deleted"); navigate({ to: "/quotes" }); }}><Trash2 size={16} /></Button>
          </div>
        }
      />
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div className="text-xs uppercase text-muted-foreground">Date</div><div>{formatDate(q.date)}</div></div>
            <div><div className="text-xs uppercase text-muted-foreground">Expires</div><div>{formatDate(q.expiryDate)}</div></div>
            <div><div className="text-xs uppercase text-muted-foreground">Customer</div><div>{cust?.displayName}{cust?.companyName && ` · ${cust.companyName}`}</div></div>
            <div><div className="text-xs uppercase text-muted-foreground">Total</div><div className="text-lg font-semibold">{formatMoney(q.total || 0)}</div></div>
          </div>
          {q.notes && (
            <div>
              <div className="text-xs uppercase text-muted-foreground">Notes</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{q.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-4 text-xs text-muted-foreground">
        Need to make changes? <Link to="/quotes/new" className="text-[var(--brand)] hover:underline">Create a new quote</Link>.
      </div>
    </div>
  );
}
