import { createFileRoute, Link } from "@tanstack/react-router";
import {
  IndianRupee, Users, Package, FileText, Clock, CreditCard, Wallet, PieChart as PieIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/reports/")({
  head: () => ({ meta: [{ title: "Reports — Unio Invoice" }] }),
  component: ReportsIndex,
});

const REPORTS = [
  { to: "/reports/sales-by-customer", icon: Users, title: "Sales by Customer", desc: "Revenue and balance per customer." },
  { to: "/reports/sales-by-item", icon: Package, title: "Sales by Item", desc: "Quantity sold and revenue per item." },
  { to: "/reports/invoice-details", icon: FileText, title: "Invoice Details", desc: "All invoices with status and totals." },
  { to: "/reports/aging", icon: Clock, title: "AR Aging", desc: "Outstanding receivables bucketed by age." },
  { to: "/reports/customer-balances", icon: IndianRupee, title: "Customer Balances", desc: "Total invoiced, paid and balance due." },
  { to: "/reports/payments-received", icon: CreditCard, title: "Payments Received", desc: "All recorded payments and modes." },
  { to: "/reports/expense-details", icon: Wallet, title: "Expense Details", desc: "Itemised expenses, billable status." },
  { to: "/reports/expense-by-category", icon: PieIcon, title: "Expense by Category", desc: "Spend grouped by category." },
] as const;

function ReportsIndex() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Reports" subtitle="Run reports across invoices, customers, and expenses." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.to} to={r.to}>
            <Card className="h-full transition hover:shadow-md hover:border-[var(--brand)]">
              <CardContent className="flex items-start gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)] text-[var(--brand)]">
                  <r.icon size={18} />
                </div>
                <div>
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.desc}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
