import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Paperclip, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { formatDate, formatMoney } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/expenses/")({
  head: () => ({ meta: [{ title: "Expenses — Unio Invoice" }] }),
  component: ExpensesList,
});

async function openReceipt(path: string) {
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl) {
    toast.error("Could not open receipt");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

function ExpensesList() {
  const expenses = useStore(() => store.getExpenses());
  const customers = useStore(() => store.getCustomers());
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Expenses"
        subtitle="Track business spend. Mark expenses billable to invoice them."
        actions={<Button asChild className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"><Link to="/expenses/new"><Plus size={16} /> New Expense</Link></Button>}
      />
      <Card className="p-4">
        {expenses.length === 0 ? (
          <EmptyState icon={<Wallet size={20} />} title="No expenses logged" action={<Button onClick={() => navigate({ to: "/expenses/new" })} className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"><Plus size={16} /> New Expense</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr><th className="px-3 py-2 text-left font-medium">Date</th><th className="px-3 py-2 text-left font-medium">Category</th><th className="px-3 py-2 text-left font-medium">Vendor</th><th className="px-3 py-2 text-left font-medium">Customer</th><th className="px-3 py-2 text-left font-medium">Status</th><th className="px-3 py-2 text-right font-medium">Amount</th><th className="px-3 py-2"></th><th className="px-3 py-2"></th></tr>
              </thead>
              <tbody>
                {expenses.sort((a,b)=>+new Date(b.date)-+new Date(a.date)).map((e) => {
                  const c = customers.find((c) => c.id === e.customerId);
                  return (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(e.date)}</td>
                      <td className="px-3 py-3 font-medium">{e.category}</td>
                      <td className="px-3 py-3">{e.vendor}</td>
                      <td className="px-3 py-3 text-muted-foreground">{c?.displayName || "—"}</td>
                      <td className="px-3 py-3"><StatusBadge status={e.status} /></td>
                      <td className="px-3 py-3 text-right font-medium">{formatMoney(e.amount)}</td>
                      <td className="px-3 py-3 text-center">
                        {e.receiptPath ? (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" title="View receipt" onClick={() => openReceipt(e.receiptPath!)}>
                            <Paperclip size={14} className="text-muted-foreground" />
                            <span className="text-xs">View</span>
                          </Button>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-right"><Button size="icon" variant="ghost" onClick={() => { store.deleteExpense(e.id); toast.success("Expense deleted"); }}><Trash2 size={14} className="text-muted-foreground" /></Button></td>
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
