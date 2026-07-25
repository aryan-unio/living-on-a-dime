import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { CustomerForm } from "@/components/customer-form";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { computeInvoiceTotals, deriveStatus } from "@/lib/calc";
import { formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/customers/$id")({
  head: () => ({ meta: [{ title: "Customer — Unio Invoice" }] }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const customers = useStore(() => store.getCustomers());
  const invoices = useStore(() => store.getInvoices());
  const company = useStore(() => store.getCompany());
  const customer = customers.find((c) => c.id === id);
  const [editing, setEditing] = useState(false);

  const stats = useMemo(() => {
    if (!customer) return null;
    const own = invoices.filter((i) => i.customerId === customer.id);
    let outstanding = 0, total = 0, paid = 0;
    own.forEach((inv) => {
      const t = computeInvoiceTotals(inv, company, customer);
      const s = deriveStatus(inv, company, customer);
      if (s !== "void") { total += t.total; paid += t.paid; }
      if (s !== "void" && s !== "draft") outstanding += t.balance;
    });
    return { own, outstanding, total, paid };
  }, [customer, invoices, company]);

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" onClick={() => navigate({ to: "/customers" })}><ArrowLeft size={16} /> Back</Button>
        <Card className="mt-4 p-12 text-center text-muted-foreground">Customer not found.</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Button variant="ghost" className="-ml-2 mb-2" onClick={() => navigate({ to: "/customers" })}><ArrowLeft size={16} /> Back</Button>
      <PageHeader
        title={customer.displayName}
        subtitle={customer.companyName || customer.email}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing((e) => !e)}><Edit size={16} /> {editing ? "Cancel" : "Edit"}</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-[var(--danger)]"><Trash2 size={16} /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {customer.displayName}?</AlertDialogTitle>
                  <AlertDialogDescription>Existing invoices for this customer will remain.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { store.deleteCustomer(customer.id); toast.success("Customer deleted"); navigate({ to: "/customers" }); }} className="bg-[var(--danger)] hover:bg-[var(--danger)]/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      {editing ? (
        <CustomerForm
          initial={customer}
          onSave={(c) => { store.upsertCustomer(c); toast.success("Customer updated"); setEditing(false); }}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardContent className="space-y-2 p-5 text-sm">
              <Row k="Email" v={customer.email || "—"} />
              <Row k="Phone" v={customer.phone || "—"} />
              <Row k="GST Treatment" v={customer.gstTreatment} />
              <Row k="GSTIN" v={customer.gstin || "—"} />
              <Row k="City" v={customer.city || "—"} />
              <Row k="State" v={customer.state || "—"} />
            </CardContent>
          </Card>
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Outstanding</div><div className="mt-1 text-lg font-semibold text-[var(--danger)]">{formatMoney(stats?.outstanding || 0)}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Total Invoiced</div><div className="mt-1 text-lg font-semibold">{formatMoney(stats?.total || 0)}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Paid</div><div className="mt-1 text-lg font-semibold text-[var(--success)]">{formatMoney(stats?.paid || 0)}</div></CardContent></Card>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="border-b p-4 text-sm font-semibold">Invoices</div>
                {(stats?.own.length || 0) === 0 ? (
                  <div className="p-10 text-center text-sm text-muted-foreground">No invoices yet.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                      <tr><th className="px-4 py-2 text-left font-medium">Number</th><th className="px-4 py-2 text-left font-medium">Date</th><th className="px-4 py-2 text-left font-medium">Status</th><th className="px-4 py-2 text-right font-medium">Total</th></tr>
                    </thead>
                    <tbody>
                      {stats?.own.sort((a,b)=>+new Date(b.date)-+new Date(a.date)).map((inv) => {
                        const t = computeInvoiceTotals(inv, company, customer);
                        const s = deriveStatus(inv, company, customer);
                        return (
                          <tr key={inv.id} className="border-b last:border-0">
                            <td className="px-4 py-2"><Link to="/invoices/$id" params={{ id: inv.id }} className="font-medium text-[var(--brand)] hover:underline">{inv.number}</Link></td>
                            <td className="px-4 py-2 text-muted-foreground">{formatDate(inv.date)}</td>
                            <td className="px-4 py-2"><StatusBadge status={s} /></td>
                            <td className="px-4 py-2 text-right font-medium">{formatMoney(t.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-0"><span className="text-xs uppercase text-muted-foreground">{k}</span><span className="text-right font-medium">{v}</span></div>;
}
