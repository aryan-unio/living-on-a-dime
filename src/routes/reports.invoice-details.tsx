import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { computeInvoiceTotals, deriveStatus } from "@/lib/calc";
import { formatMoney, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ReportShell } from "@/components/report-shell";

export const Route = createFileRoute("/reports/invoice-details")({
  head: () => ({ meta: [{ title: "Invoice Details — Reports" }] }),
  component: InvoiceDetails,
});

function InvoiceDetails() {
  const invoices = useStore(() => store.getInvoices());
  const customers = useStore(() => store.getCustomers());
  const company = useStore(() => store.getCompany());

  const list = [...invoices].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const exportRows = list.map((inv) => {
    const cust = customers.find((c) => c.id === inv.customerId);
    const t = computeInvoiceTotals(inv, company, cust);
    return { Number: inv.number, Customer: cust?.displayName || "", Date: formatDate(inv.date), Due: formatDate(inv.dueDate), Amount: t.total, Tax: t.taxAmount, Status: deriveStatus(inv, company, cust) };
  });

  return (
    <ReportShell title="Invoice Details" rows={exportRows} filename="invoice-details">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Invoice #</th>
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Due</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 text-right font-medium">Tax</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No invoices.</td></tr>
          ) : list.map((inv) => {
            const cust = customers.find((c) => c.id === inv.customerId);
            const t = computeInvoiceTotals(inv, company, cust);
            return (
              <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3"><Link to="/invoices/$id" params={{ id: inv.id }} className="font-medium text-[var(--brand)] hover:underline">{inv.number}</Link></td>
                <td className="px-4 py-3">{cust?.displayName || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.date)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatMoney(t.total)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{formatMoney(t.taxAmount)}</td>
                <td className="px-4 py-3"><StatusBadge status={deriveStatus(inv, company, cust)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ReportShell>
  );
}
