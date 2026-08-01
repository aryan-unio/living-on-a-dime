import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { computeInvoiceTotals, deriveStatus } from "@/lib/calc";
import { formatMoney, formatDate } from "@/lib/format";
import { Receipt } from "lucide-react";

const searchSchema = z.object({
  status: fallback(z.string(), "all").default("all"),
  period: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/invoices/")({
  head: () => ({ meta: [{ title: "Invoices — Unio Invoice" }] }),
  validateSearch: zodValidator(searchSchema),
  component: InvoicesList,
});

const UNPAID_STATUSES = new Set(["sent", "overdue", "partial"]);

function InvoicesList() {
  const invoices = useStore(() => store.getInvoices());
  const customers = useStore(() => store.getCustomers());
  const company = useStore(() => store.getCompany());
  const urlSearch = Route.useSearch();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(urlSearch.status || "all");
  const [period, setPeriod] = useState(urlSearch.period || "");
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[]; label: string } | null>(null);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    try {
      pendingDelete.ids.forEach((id) => store.deleteInvoice(id));
      setSelected((prev) => prev.filter((id) => !pendingDelete.ids.includes(id)));
      toast.success(pendingDelete.ids.length > 1 ? `${pendingDelete.ids.length} invoices deleted` : "Invoice deleted");
    } catch {
      toast.error("Failed to delete invoice");
    }
    setPendingDelete(null);
  };

  useEffect(() => {
    setStatus(urlSearch.status || "all");
    setPeriod(urlSearch.period || "");
  }, [urlSearch.status, urlSearch.period]);

  const rows = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return invoices
      .map((inv) => {
        const cust = customers.find((c) => c.id === inv.customerId);
        const totals = computeInvoiceTotals(inv, company, cust);
        const s = deriveStatus(inv, company, cust);
        return { inv, cust, totals, status: s };
      })
      .filter(({ inv, cust, status: s }) => {
        if (status === "unpaid") {
          if (!UNPAID_STATUSES.has(s)) return false;
        } else if (status !== "all" && s !== status) {
          return false;
        }
        if (period === "this_month") {
          const d = new Date(inv.date);
          if (d < monthStart) return false;
        }
        if (!q.trim()) return true;
        const needle = q.toLowerCase();
        return (
          inv.number.toLowerCase().includes(needle) ||
          (cust?.displayName.toLowerCase().includes(needle) ?? false) ||
          (cust?.companyName.toLowerCase().includes(needle) ?? false)
        );
      })
      .sort((a, b) => +new Date(b.inv.date) - +new Date(a.inv.date));
  }, [invoices, customers, company, q, status, period]);


  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Invoices"
        subtitle="Track and manage all your invoices."
        actions={
          <Button asChild className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">
            <Link to="/invoices/new"><Plus size={16} /> New Invoice</Link>
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by number or customer..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); navigate({ to: "/invoices", search: { status: v, period } }); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
          {(status !== "all" || period) && (
            <button
              type="button"
              onClick={() => { setStatus("all"); setPeriod(""); navigate({ to: "/invoices", search: { status: "all", period: "" } }); }}
              className="rounded-full bg-[var(--brand-light)] px-3 py-1 text-xs font-medium text-[var(--brand)] hover:opacity-80"
            >
              {status !== "all" && <span className="capitalize">{status}</span>}
              {status !== "all" && period && " · "}
              {period === "this_month" && "This month"}
              <span className="ml-1">×</span>
            </button>
          )}
        </div>


        {selected.length > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <div className="ml-auto">
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setPendingDelete({ ids: selected, label: `${selected.length} invoices` })}
              >
                <Trash2 size={14} /> Delete Selected
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Receipt size={20} />}
              title="No invoices found"
              description="Try adjusting filters or create your first invoice."
              action={
                <Button onClick={() => navigate({ to: "/invoices/new" })} className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">
                  <Plus size={16} /> New Invoice
                </Button>
              }
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <Checkbox
                      checked={selected.length > 0 && selected.length === rows.length}
                      onCheckedChange={(v) => setSelected(v ? rows.map((r) => r.inv.id) : [])}
                      aria-label="Select all invoices"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Number</th>
                  <th className="px-3 py-2 text-left font-medium">Customer</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Due</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-right font-medium">Balance</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ inv, cust, totals, status: s }) => (
                  <tr key={inv.id} className="group cursor-pointer border-b last:border-0 hover:bg-muted/30" onClick={() => navigate({ to: "/invoices/$id", params: { id: inv.id } })}>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.includes(inv.id)}
                        onCheckedChange={(v) => setSelected((prev) => (v ? [...prev, inv.id] : prev.filter((id) => id !== inv.id)))}
                        aria-label={`Select ${inv.number}`}
                      />
                    </td>
                    <td className="px-3 py-3 font-medium text-[var(--brand)]">{inv.number}</td>
                    <td className="px-3 py-3">{cust?.displayName || "—"}<div className="text-xs text-muted-foreground">{cust?.companyName}</div></td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(inv.date)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                    <td className="px-3 py-3"><StatusBadge status={s} /></td>
                    <td className="px-3 py-3 text-right font-medium">{formatMoney(totals.total, inv.currency)}</td>
                    <td className="px-3 py-3 text-right">{totals.balance > 0 ? <span className="font-medium text-[var(--danger)]">{formatMoney(totals.balance, inv.currency)}</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        aria-label={`Delete ${inv.number}`}
                        className="opacity-0 transition group-hover:opacity-100 focus:opacity-100 text-red-400 hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); setPendingDelete({ ids: [inv.id], label: inv.number }); }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete && pendingDelete.ids.length > 1 ? "Delete invoices?" : "Delete Invoice?"}</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {pendingDelete?.label}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
