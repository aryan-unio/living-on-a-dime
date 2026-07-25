import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { formatMoney, formatDate } from "@/lib/format";
import { ReportShell } from "@/components/report-shell";

export const Route = createFileRoute("/reports/payments-received")({
  head: () => ({ meta: [{ title: "Payments Received — Reports" }] }),
  component: PaymentsReceived,
});

function PaymentsReceived() {
  const invoices = useStore(() => store.getInvoices());
  const customers = useStore(() => store.getCustomers());

  const rows = invoices.flatMap((inv) =>
    inv.payments.map((p) => ({
      id: p.id, invId: inv.id, number: inv.number,
      customer: customers.find((c) => c.id === inv.customerId)?.displayName || "—",
      date: p.date, amount: p.amount, mode: p.mode, reference: p.reference,
    })),
  ).sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const exportRows = rows.map((r) => ({ Date: formatDate(r.date), Invoice: r.number, Customer: r.customer, Amount: r.amount, Mode: r.mode, Reference: r.reference }));

  return (
    <ReportShell title="Payments Received" rows={exportRows} filename="payments-received">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Invoice</th>
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 text-left font-medium">Mode</th>
            <th className="px-4 py-3 text-left font-medium">Reference</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No payments recorded.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-4 py-3 text-muted-foreground">{formatDate(r.date)}</td>
              <td className="px-4 py-3"><Link to="/invoices/$id" params={{ id: r.invId }} className="text-[var(--brand)] hover:underline">{r.number}</Link></td>
              <td className="px-4 py-3">{r.customer}</td>
              <td className="px-4 py-3 text-right font-medium">{formatMoney(r.amount)}</td>
              <td className="px-4 py-3 capitalize text-muted-foreground">{r.mode.replace("_", " ")}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.reference || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}
