import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { formatMoney } from "@/lib/format";
import { ReportShell } from "@/components/report-shell";

export const Route = createFileRoute("/reports/sales-by-item")({
  head: () => ({ meta: [{ title: "Sales by Item — Reports" }] }),
  component: SalesByItem,
});

function SalesByItem() {
  const invoices = useStore(() => store.getInvoices());

  const rows = useMemo(() => {
    const map: Record<string, { name: string; qty: number; total: number; tax: number }> = {};
    for (const inv of invoices) {
      if (inv.status === "void" || inv.status === "draft") continue;
      for (const li of inv.lineItems) {
        const key = li.description || "—";
        const e = map[key] || { name: key, qty: 0, total: 0, tax: 0 };
        const sub = li.qty * li.rate;
        e.qty += li.qty; e.total += sub; e.tax += sub * (li.taxRate || 0) / 100;
        map[key] = e;
      }
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [invoices]);

  const exportRows = rows.map((r) => ({ Item: r.name, Qty: r.qty, Total: r.total, Tax: r.tax }));
  return (
    <ReportShell title="Sales by Item" rows={exportRows} filename="sales-by-item">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Item</th>
            <th className="px-4 py-3 text-right font-medium">Qty Sold</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 text-right font-medium">Tax Collected</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No item data.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.name} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">{r.name}</td>
              <td className="px-4 py-3 text-right">{r.qty}</td>
              <td className="px-4 py-3 text-right">{formatMoney(r.total)}</td>
              <td className="px-4 py-3 text-right text-muted-foreground">{formatMoney(r.tax)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}
