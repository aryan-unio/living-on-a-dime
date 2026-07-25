import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { computeInvoiceTotals, deriveStatus } from "@/lib/calc";
import { formatMoney } from "@/lib/format";
import { ReportShell } from "@/components/report-shell";

export const Route = createFileRoute("/reports/aging")({
  head: () => ({ meta: [{ title: "AR Aging — Reports" }] }),
  component: Aging,
});

function Aging() {
  const invoices = useStore(() => store.getInvoices());
  const customers = useStore(() => store.getCustomers());
  const company = useStore(() => store.getCompany());

  const { byCustomer, rows, totals } = useMemo(() => {
    const map: Record<string, { name: string; b0: number; b30: number; b60: number; b90: number; total: number; id: string }> = {};
    const now = Date.now();
    for (const inv of invoices) {
      const cust = customers.find((c) => c.id === inv.customerId);
      const t = computeInvoiceTotals(inv, company, cust);
      const s = deriveStatus(inv, company, cust);
      if (s === "void" || s === "draft" || s === "paid" || t.balance <= 0) continue;
      const due = new Date(inv.dueDate).getTime();
      const days = Math.max(0, Math.floor((now - due) / 86400000));
      const key = inv.customerId;
      const entry = map[key] || { name: cust?.displayName || "Unknown", b0: 0, b30: 0, b60: 0, b90: 0, total: 0, id: key };
      if (days <= 30) entry.b0 += t.balance;
      else if (days <= 60) entry.b30 += t.balance;
      else if (days <= 90) entry.b60 += t.balance;
      else entry.b90 += t.balance;
      entry.total += t.balance;
      map[key] = entry;
    }
    const arr = Object.values(map).sort((a, b) => b.total - a.total);
    const totals = arr.reduce((acc, r) => ({ b0: acc.b0 + r.b0, b30: acc.b30 + r.b30, b60: acc.b60 + r.b60, b90: acc.b90 + r.b90, total: acc.total + r.total }), { b0: 0, b30: 0, b60: 0, b90: 0, total: 0 });
    const rows = arr.map((r) => ({ Customer: r.name, "0-30": r.b0, "31-60": r.b30, "61-90": r.b60, "90+": r.b90, Total: r.total }));
    return { byCustomer: arr, rows, totals };
  }, [invoices, customers, company]);

  return (
    <ReportShell title="AR Aging" subtitle="Outstanding receivables bucketed by days overdue." rows={rows} filename="ar-aging">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-right font-medium">0–30 days</th>
            <th className="px-4 py-3 text-right font-medium">31–60 days</th>
            <th className="px-4 py-3 text-right font-medium">61–90 days</th>
            <th className="px-4 py-3 text-right font-medium">90+ days</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {byCustomer.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No outstanding invoices.</td></tr>
          )}
          {byCustomer.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-4 py-3"><Link to="/customers/$id" params={{ id: r.id }} className="font-medium text-[var(--brand)] hover:underline">{r.name}</Link></td>
              <td className="px-4 py-3 text-right text-gray-600">{r.b0 ? formatMoney(r.b0) : "—"}</td>
              <td className={`px-4 py-3 text-right ${r.b30 ? "bg-yellow-50 text-yellow-700" : ""}`}>{r.b30 ? formatMoney(r.b30) : "—"}</td>
              <td className={`px-4 py-3 text-right ${r.b60 ? "bg-orange-50 text-orange-700" : ""}`}>{r.b60 ? formatMoney(r.b60) : "—"}</td>
              <td className={`px-4 py-3 text-right ${r.b90 ? "bg-red-50 text-red-700" : ""}`}>{r.b90 ? formatMoney(r.b90) : "—"}</td>
              <td className="px-4 py-3 text-right font-semibold">{formatMoney(r.total)}</td>
            </tr>
          ))}
          {byCustomer.length > 0 && (
            <tr className="border-t-2 bg-muted/40 font-semibold">
              <td className="px-4 py-3">Totals</td>
              <td className="px-4 py-3 text-right">{formatMoney(totals.b0)}</td>
              <td className="px-4 py-3 text-right">{formatMoney(totals.b30)}</td>
              <td className="px-4 py-3 text-right">{formatMoney(totals.b60)}</td>
              <td className="px-4 py-3 text-right">{formatMoney(totals.b90)}</td>
              <td className="px-4 py-3 text-right">{formatMoney(totals.total)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </ReportShell>
  );
}
