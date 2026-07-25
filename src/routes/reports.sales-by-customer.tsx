import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { computeInvoiceTotals } from "@/lib/calc";
import { formatMoney } from "@/lib/format";
import { ReportShell } from "@/components/report-shell";

export const Route = createFileRoute("/reports/sales-by-customer")({
  head: () => ({ meta: [{ title: "Sales by Customer — Reports" }] }),
  component: SalesByCustomer,
});

function SalesByCustomer() {
  const invoices = useStore(() => store.getInvoices());
  const customers = useStore(() => store.getCustomers());
  const company = useStore(() => store.getCompany());

  const rows = useMemo(() => {
    const map: Record<string, { name: string; id: string; count: number; invoiced: number; paid: number; balance: number }> = {};
    for (const inv of invoices) {
      if (inv.status === "void" || inv.status === "draft") continue;
      const cust = customers.find((c) => c.id === inv.customerId);
      const t = computeInvoiceTotals(inv, company, cust);
      const e = map[inv.customerId] || { name: cust?.displayName || "Unknown", id: inv.customerId, count: 0, invoiced: 0, paid: 0, balance: 0 };
      e.count++; e.invoiced += t.total; e.paid += t.paid; e.balance += t.balance;
      map[inv.customerId] = e;
    }
    return Object.values(map).sort((a, b) => b.invoiced - a.invoiced);
  }, [invoices, customers, company]);

  const exportRows = rows.map((r) => ({ Customer: r.name, Invoices: r.count, Invoiced: r.invoiced, Paid: r.paid, Balance: r.balance }));

  return (
    <ReportShell title="Sales by Customer" rows={exportRows} filename="sales-by-customer">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-right font-medium">Invoices</th>
            <th className="px-4 py-3 text-right font-medium">Invoiced</th>
            <th className="px-4 py-3 text-right font-medium">Paid</th>
            <th className="px-4 py-3 text-right font-medium">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No sales data.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-4 py-3"><Link to="/customers/$id" params={{ id: r.id }} className="text-[var(--brand)] hover:underline">{r.name}</Link></td>
              <td className="px-4 py-3 text-right">{r.count}</td>
              <td className="px-4 py-3 text-right">{formatMoney(r.invoiced)}</td>
              <td className="px-4 py-3 text-right text-emerald-600">{formatMoney(r.paid)}</td>
              <td className="px-4 py-3 text-right text-red-600">{formatMoney(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}
