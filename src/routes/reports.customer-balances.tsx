import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { computeInvoiceTotals } from "@/lib/calc";
import { formatMoney } from "@/lib/format";
import { ReportShell } from "@/components/report-shell";

export const Route = createFileRoute("/reports/customer-balances")({
  head: () => ({ meta: [{ title: "Customer Balances — Reports" }] }),
  component: CustomerBalances,
});

function CustomerBalances() {
  const invoices = useStore(() => store.getInvoices());
  const customers = useStore(() => store.getCustomers());
  const company = useStore(() => store.getCompany());

  const rows = customers.map((c) => {
    let invoiced = 0, paid = 0, balance = 0;
    for (const inv of invoices) {
      if (inv.customerId !== c.id || inv.status === "void" || inv.status === "draft") continue;
      const t = computeInvoiceTotals(inv, company, c);
      invoiced += t.total; paid += t.paid; balance += t.balance;
    }
    return { id: c.id, name: c.displayName, invoiced, paid, balance };
  }).sort((a, b) => b.balance - a.balance);

  const exportRows = rows.map((r) => ({ Customer: r.name, Invoiced: r.invoiced, Paid: r.paid, Balance: r.balance }));

  return (
    <ReportShell title="Customer Balances" rows={exportRows} filename="customer-balances">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-right font-medium">Invoiced</th>
            <th className="px-4 py-3 text-right font-medium">Paid</th>
            <th className="px-4 py-3 text-right font-medium">Balance Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-4 py-3"><Link to="/customers/$id" params={{ id: r.id }} className="text-[var(--brand)] hover:underline">{r.name}</Link></td>
              <td className="px-4 py-3 text-right">{formatMoney(r.invoiced)}</td>
              <td className="px-4 py-3 text-right text-emerald-600">{formatMoney(r.paid)}</td>
              <td className="px-4 py-3 text-right font-semibold text-red-600">{formatMoney(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}
