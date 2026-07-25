import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/quotes/")({
  head: () => ({ meta: [{ title: "Quotes — Unio Invoice" }] }),
  component: QuotesList,
});

function QuotesList() {
  const quotes = useStore(() => store.getQuotes());
  const customers = useStore(() => store.getCustomers());
  const navigate = useNavigate();
  const [, force] = useState(0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Quotes"
        subtitle="Send estimates to customers. Convert accepted quotes to invoices."
        actions={<Button asChild className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"><Link to="/quotes/new"><Plus size={16} /> New Quote</Link></Button>}
      />
      <Card className="p-4">
        {quotes.length === 0 ? (
          <EmptyState
            icon={<FileText size={20} />}
            title="No quotes yet"
            description="Create your first quote to send to a customer."
            action={<Button onClick={() => navigate({ to: "/quotes/new" })} className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"><Plus size={16} /> New Quote</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Number</th>
                  <th className="px-3 py-2 text-left font-medium">Customer</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Expires</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {quotes.sort((a,b)=>+new Date(b.date)-+new Date(a.date)).map((q) => {
                  const cust = customers.find((c) => c.id === q.customerId);
                  return (
                    <tr key={q.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-3"><Link to="/quotes/$id" params={{ id: q.id }} className="font-medium text-[var(--brand)] hover:underline">{q.number}</Link></td>
                      <td className="px-3 py-3">{cust?.displayName || "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(q.date)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(q.expiryDate)}</td>
                      <td className="px-3 py-3"><StatusBadge status={q.status} /></td>
                      <td className="px-3 py-3 text-right font-medium">{formatMoney(q.total || 0)}</td>
                      <td className="px-3 py-3 text-right">
                        <Button size="icon" variant="ghost" onClick={() => { store.deleteQuote(q.id); toast.success("Quote deleted"); force((n) => n + 1); }}>
                          <Trash2 size={14} className="text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
