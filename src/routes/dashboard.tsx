import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  IndianRupee, AlertTriangle, Receipt, ArrowUpRight, Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { computeInvoiceTotals, deriveStatus } from "@/lib/calc";
import { formatMoney, formatMoneyShort, formatDate } from "@/lib/format";

const FALLBACK_RATES: Record<string, number> = { INR: 1, USD: 84, EUR: 90, GBP: 107 };
function toINR(amount: number, currency: string | undefined, rate?: number): number {
  const c = currency || "INR";
  if (c === "INR") return amount;
  if (rate && rate > 0) return amount * rate;
  return amount * (FALLBACK_RATES[c] ?? 1);
}


export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Unio Invoice" }] }),
  component: Dashboard,
});

function Dashboard() {
  const invoices = useStore(() => store.getInvoices());
  const customers = useStore(() => store.getCustomers());
  const expenses = useStore(() => store.getExpenses());
  const company = useStore(() => store.getCompany());

  const data = useMemo(() => {
    let outstandingINR = 0, overdueINR = 0, paidThisMonthINR = 0, totalExpensesINR = 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const statusCounts: Record<string, number> = {};
    const customerRevenue: Record<string, { totalINR: number; latest: number }> = {};

    invoices.forEach((inv) => {
      const cust = customers.find((c) => c.id === inv.customerId);
      const t = computeInvoiceTotals(inv, company, cust);
      const status = deriveStatus(inv, company, cust);
      const invCurrency = inv.currency || company.currency;
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Determine an invoice-level rate from any payment recorded
      const anyPayRate = inv.payments.find((p) => p.exchangeRate)?.exchangeRate;

      if (status !== "void" && status !== "draft") {
        const balanceINR = toINR(t.balance, invCurrency, anyPayRate);
        outstandingINR += balanceINR;
        if (status === "overdue") overdueINR += balanceINR;
      }
      inv.payments.forEach((p) => {
        const pd = new Date(p.date);
        if (pd >= monthStart) {
          const pCurr = p.currency || invCurrency;
          const inrValue = p.inrEquivalent ?? toINR(p.amount, pCurr, p.exchangeRate);
          paidThisMonthINR += inrValue;
        }
      });
      if (status === "paid") {
        const invTime = +new Date(inv.date);
        const totalINR = toINR(t.total, invCurrency, anyPayRate);
        const existing = customerRevenue[inv.customerId];
        if (!existing) customerRevenue[inv.customerId] = { totalINR, latest: invTime };
        else {
          existing.totalINR += totalINR;
          if (invTime > existing.latest) existing.latest = invTime;
        }
      }
    });

    expenses.forEach((e) => { totalExpensesINR += e.amount; });

    // 6 month revenue series (in INR)
    const months: { name: string; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const name = d.toLocaleString("en-IN", { month: "short" });
      let revenue = 0;
      invoices.forEach((inv) => {
        const invCurrency = inv.currency || company.currency;
        inv.payments.forEach((p) => {
          const pd = new Date(p.date);
          if (pd >= d && pd < next) {
            const pCurr = p.currency || invCurrency;
            revenue += p.inrEquivalent ?? toINR(p.amount, pCurr, p.exchangeRate);
          }
        });
      });
      const exp = expenses
        .filter((e) => { const ed = new Date(e.date); return ed >= d && ed < next; })
        .reduce((s, e) => s + e.amount, 0);
      months.push({ name, revenue, expenses: exp });
    }

    const topCustomers = Object.entries(customerRevenue)
      .map(([id, v]) => ({ customer: customers.find((c) => c.id === id), totalINR: v.totalINR }))
      .filter((x) => x.customer)
      .sort((a, b) => b.totalINR - a.totalINR)
      .slice(0, 5);

    const recent = [...invoices]
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 5);

    return {
      outstandingINR, overdueINR, paidThisMonthINR, totalExpensesINR,
      statusCounts, months, topCustomers, recent,
    };
  }, [invoices, customers, expenses, company]);

  const statusData = Object.entries(data.statusCounts).map(([name, value]) => ({ name, value }));
  const COLORS: Record<string, string> = {
    draft: "#94A3B8", sent: "#2563EB", paid: "#16A34A",
    overdue: "#DC2626", partial: "#EA580C", void: "#CBD5E1",
  };


  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Dashboard"
        subtitle="Snapshot of receivables, revenue, and recent activity."
        actions={
          <Button asChild className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">
            <Link to="/invoices/new">New Invoice</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Outstanding"
          value={formatMoneyShort(data.outstandingINR, "INR")}
          fullValue={formatMoney(data.outstandingINR, "INR")}
          hint="Converted to INR"
          icon={<IndianRupee size={18} />}
          tone="brand"
          to="/invoices"
          search={{ status: "unpaid" }}
        />
        <KpiCard
          label="Overdue"
          value={formatMoneyShort(data.overdueINR, "INR")}
          fullValue={formatMoney(data.overdueINR, "INR")}
          hint="Converted to INR"
          icon={<AlertTriangle size={18} />}
          tone="danger"
          to="/invoices"
          search={{ status: "overdue" }}
        />
        <KpiCard
          label="Paid this Month"
          value={formatMoneyShort(data.paidThisMonthINR, "INR")}
          fullValue={formatMoney(data.paidThisMonthINR, "INR")}
          hint="Converted to INR"
          icon={<Wallet size={18} />}
          tone="success"
          to="/invoices"
          search={{ status: "paid", period: "this_month" }}
        />
        <KpiCard
          label="Total Expenses"
          value={formatMoneyShort(data.totalExpensesINR, "INR")}
          fullValue={formatMoney(data.totalExpensesINR, "INR")}
          hint="All time"
          icon={<Wallet size={18} />}
          tone="info"
          to="/expenses"
        />
      </div>




      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Revenue vs Expenses (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.months}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#94A3B8"
                    tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                  />
                  <Tooltip
                    formatter={(v) => formatMoney(Number(v))}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#0F7B6C" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#EA580C" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {statusData.map((s) => (
                      <Cell key={s.name} fill={COLORS[s.name] || "#94A3B8"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/invoices" className="text-[var(--brand)]">
                View all <ArrowUpRight size={14} className="ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Invoice</th>
                  <th className="px-4 py-2 text-left font-medium">Customer</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((inv) => {
                  const cust = customers.find((c) => c.id === inv.customerId);
                  const t = computeInvoiceTotals(inv, company, cust);
                  const status = deriveStatus(inv, company, cust);
                  return (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link to="/invoices/$id" params={{ id: inv.id }} className="font-medium text-[var(--brand)] hover:underline">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-foreground">{cust?.displayName || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.date)}</td>
                      <td className="px-4 py-3"><StatusBadge status={status} /></td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(t.total, inv.currency)}</td>
                    </tr>
                  );
                })}
                {data.recent.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No invoices yet.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Customers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topCustomers.length === 0 && (
              <p className="text-sm text-muted-foreground">No paid invoices yet.</p>
            )}
            {data.topCustomers.map(({ customer, totalINR }) => (
              <Link
                key={customer!.id}
                to="/customers/$id"
                params={{ id: customer!.id }}
                className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-light)] text-xs font-semibold text-[var(--brand)]">
                    {customer!.displayName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{customer!.displayName}</div>
                    <div className="truncate text-xs text-muted-foreground">{customer!.companyName || customer!.email}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-foreground">{formatMoney(totalINR, "INR")}</div>
              </Link>
            ))}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, fullValue, icon, tone, hint, to, search,
}: {
  label: string; value: string;
  fullValue?: string;
  icon: React.ReactNode;
  tone: "brand" | "danger" | "success" | "info";
  hint?: string;
  to?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  search?: any;
}) {
  const tones: Record<string, string> = {
    brand: "bg-[var(--brand-light)] text-[var(--brand)]",
    danger: "bg-red-50 text-red-600",
    success: "bg-emerald-50 text-emerald-600",
    info: "bg-blue-50 text-blue-600",
  };
  const content = (
    <CardContent className="relative flex items-center gap-4 p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-0.5 truncate text-lg font-semibold text-foreground" title={fullValue || value}>{value}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
      {to && <ArrowUpRight size={14} className="absolute bottom-2 right-2 text-slate-400" />}
    </CardContent>
  );
  if (to) {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Link to={to as any} search={search} className="block">
        <Card className="cursor-pointer transition-all duration-150 hover:shadow-md hover:scale-[1.02]">
          {content}
        </Card>
      </Link>
    );
  }
  return <Card>{content}</Card>;
}



// Receipt import used elsewhere
void Receipt;
