import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/customers/")({
  head: () => ({ meta: [{ title: "Customers — Unio Invoice" }] }),
  component: CustomersList,
});

function CustomersList() {
  const customers = useStore(() => store.getCustomers());
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() =>
    customers.filter((c) => {
      const n = q.toLowerCase();
      return !n || c.displayName.toLowerCase().includes(n) || c.companyName.toLowerCase().includes(n) || c.email.toLowerCase().includes(n);
    }),
  [customers, q]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customer${customers.length === 1 ? "" : "s"}`}
        actions={<Button asChild className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"><Link to="/customers/new"><Plus size={16} /> New Customer</Link></Button>}
      />
      <Card className="p-4">
        <div className="relative mb-4 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search customers..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<Users size={20} />} title="No customers" description="Add your first customer to start invoicing." action={<Button onClick={() => navigate({ to: "/customers/new" })} className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"><Plus size={16} /> New Customer</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Company</th>
                  <th className="px-3 py-2 text-left font-medium">GST</th>
                  <th className="px-3 py-2 text-left font-medium">Contact</th>
                  <th className="px-3 py-2 text-right font-medium">Outstanding</th>
                  <th className="px-3 py-2 text-right font-medium">Total Invoiced</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/30" onClick={() => navigate({ to: "/customers/$id", params: { id: c.id } })}>
                    <td className="px-3 py-3 font-medium text-[var(--brand)]">{c.displayName}</td>
                    <td className="px-3 py-3">{c.companyName || "—"}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{c.gstin || c.gstTreatment}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{c.email}<div>{c.phone}</div></td>
                    <td className="px-3 py-3 text-right">{c.outstandingBalance > 0 ? <span className="font-medium text-[var(--danger)]">{formatMoney(c.outstandingBalance)}</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-3 text-right font-medium">{formatMoney(c.totalInvoiced)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
