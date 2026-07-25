import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { formatMoney } from "@/lib/format";
import { ReportShell } from "@/components/report-shell";

const COLORS: Record<string, string> = {
  Travel: "#0F7B6C", Rent: "#2563EB", Software: "#7C3AED", Meals: "#EA580C", Other: "#6B7280",
};

export const Route = createFileRoute("/reports/expense-by-category")({
  head: () => ({ meta: [{ title: "Expense by Category — Reports" }] }),
  component: ExpenseByCategory,
});

function ExpenseByCategory() {
  const expenses = useStore(() => store.getExpenses());
  const rows = useMemo(() => {
    const map: Record<string, { name: string; count: number; total: number; tax: number }> = {};
    for (const e of expenses) {
      const k = e.category || "Other";
      const m = map[k] || { name: k, count: 0, total: 0, tax: 0 };
      m.count++; m.total += e.amount; m.tax += e.amount * (e.taxRate || 0) / 100;
      map[k] = m;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [expenses]);
  const exportRows = rows.map((r) => ({ Category: r.name, Count: r.count, Total: r.total, Tax: r.tax }));

  return (
    <ReportShell title="Expense by Category" rows={exportRows} filename="expense-by-category">
      <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rows} dataKey="total" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {rows.map((r) => <Cell key={r.name} fill={COLORS[r.name] || "#94A3B8"} />)}
              </Pie>
              <Tooltip formatter={(v) => formatMoney(Number(v))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <table className="w-full text-sm self-center">
          <thead className="border-b text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Category</th>
              <th className="px-3 py-2 text-right font-medium">Count</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b last:border-0">
                <td className="px-3 py-2"><span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: COLORS[r.name] || "#94A3B8" }} />{r.name}</td>
                <td className="px-3 py-2 text-right">{r.count}</td>
                <td className="px-3 py-2 text-right font-medium">{formatMoney(r.total)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">No expenses.</td></tr>}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
}
