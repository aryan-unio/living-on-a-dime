import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { formatMoney, formatDate } from "@/lib/format";
import { ReportShell } from "@/components/report-shell";

export const Route = createFileRoute("/reports/expense-details")({
  head: () => ({ meta: [{ title: "Expense Details — Reports" }] }),
  component: ExpenseDetails,
});

function ExpenseDetails() {
  const expenses = useStore(() => store.getExpenses());
  const customers = useStore(() => store.getCustomers());
  const list = [...expenses].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const exportRows = list.map((e) => ({
    Date: formatDate(e.date), Category: e.category, Vendor: e.vendor,
    Customer: customers.find((c) => c.id === e.customerId)?.displayName || "",
    Amount: e.amount, Tax: e.amount * (e.taxRate || 0) / 100, Billable: e.billable ? "Yes" : "No", Status: e.status,
  }));

  return (
    <ReportShell title="Expense Details" rows={exportRows} filename="expense-details">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Category</th>
            <th className="px-4 py-3 text-left font-medium">Vendor</th>
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 text-left font-medium">Billable</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No expenses.</td></tr>
          ) : list.map((e) => (
            <tr key={e.id} className="border-b last:border-0">
              <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
              <td className="px-4 py-3 font-medium">{e.category}</td>
              <td className="px-4 py-3">{e.vendor || "—"}</td>
              <td className="px-4 py-3">{customers.find((c) => c.id === e.customerId)?.displayName || "—"}</td>
              <td className="px-4 py-3 text-right font-medium">{formatMoney(e.amount)}</td>
              <td className="px-4 py-3 text-muted-foreground">{e.billable ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}
