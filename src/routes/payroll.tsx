import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, History, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useStore } from "@/hooks/use-store";
import { store, uid } from "@/lib/storage";
import { formatDate, formatMoney } from "@/lib/format";
import type { Employee } from "@/lib/types";
import {
  deleteEmployee, isPaidFor, markSalaryPaid, monthKey, monthLabel, runAutoPay, ymd,
} from "@/lib/payroll";

export const Route = createFileRoute("/payroll")({
  head: () => ({
    meta: [
      { title: "Payroll — Unio Invoice" },
      { name: "description", content: "Manage employee salaries, auto-pay schedules, and payroll history synced with expenses." },
      { property: "og:title", content: "Payroll — Unio Invoice" },
      { property: "og:description", content: "Manage employee salaries, auto-pay schedules, and payroll history synced with expenses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Payroll,
});

const emptyEmployee = (): Employee => ({ id: uid("emp"), name: "", salary: 0, autoPay: false, payDay: 1 });

function Payroll() {
  const employees = useStore(() => store.getEmployees());
  const payments = useStore(() => store.getPayrollPayments());
  const ready = useStore(() => store.isReady());

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Employee>(emptyEmployee);
  const [historyFor, setHistoryFor] = useState<Employee | null>(null);

  const month = monthKey();

  useEffect(() => {
    if (!ready) return;
    const n = runAutoPay();
    if (n > 0) toast.success(`Auto-pay recorded ${n} salary payment${n > 1 ? "s" : ""}`);
  }, [ready]);

  const summary = useMemo(() => ({
    total: employees.length,
    monthly: employees.reduce((s, e) => s + (e.salary || 0), 0),
    auto: employees.filter((e) => e.autoPay).length,
    pending: employees.filter((e) => !isPaidFor(e.id, month)).length,
  }), [employees, payments, month]);

  const startNew = () => { setDraft(emptyEmployee()); setOpen(true); };
  const startEdit = (e: Employee) => { setDraft({ ...e }); setOpen(true); };

  const save = () => {
    if (!draft.name.trim()) { toast.error("Employee name is required"); return; }
    if (!draft.salary || draft.salary <= 0) { toast.error("Monthly salary is required"); return; }
    const list = store.getEmployees();
    const idx = list.findIndex((e) => e.id === draft.id);
    const next = idx >= 0 ? list.map((e) => (e.id === draft.id ? draft : e)) : [...list, draft];
    store.savePayroll(next, store.getPayrollPayments());
    setOpen(false);
    toast.success(idx >= 0 ? "Employee updated" : "Employee added");
  };

  const toggleAutoPay = (emp: Employee, value: boolean) => {
    store.savePayroll(
      store.getEmployees().map((e) => (e.id === emp.id ? { ...e, autoPay: value } : e)),
      store.getPayrollPayments(),
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Payroll"
        subtitle="Employee salaries, auto-pay schedules, and payment history."
        actions={
          <Button onClick={startNew} className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">
            <Plus size={16} /> New Employee
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Employees" value={String(summary.total)} icon={<Users size={18} />} />
        <SummaryCard label="Total Monthly Payroll" value={formatMoney(summary.monthly, "INR")} icon={<Banknote size={18} />} />
        <SummaryCard label="Auto-Pay Enabled" value={String(summary.auto)} icon={<CheckCircle2 size={18} />} />
      </div>

      <Card>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Users size={20} />}
                title="No employees yet"
                action={<Button onClick={startNew} className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"><Plus size={16} /> New Employee</Button>}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Employee Name</th>
                    <th className="px-4 py-2 text-right font-medium">Salary</th>
                    <th className="px-4 py-2 text-left font-medium">Auto-Pay</th>
                    <th className="px-4 py-2 text-left font-medium">Status ({monthLabel(month)})</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const paid = isPaidFor(emp.id, month);
                    return (
                      <tr key={emp.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{emp.name}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(emp.salary, "INR")}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch checked={emp.autoPay} onCheckedChange={(v) => toggleAutoPay(emp, v)} />
                            <span className="text-xs text-muted-foreground">
                              {emp.autoPay ? `On · day ${emp.payDay}` : "Off"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {paid ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Paid</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Pending</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  if (markSalaryPaid(emp, ymd(new Date()), month)) toast.success("Salary paid & added to expenses");
                                  else toast.error("Already paid this month");
                                }}
                              >
                                Mark as Paid
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="icon" variant="ghost" title="View history" onClick={() => setHistoryFor(emp)}>
                            <History size={14} className="text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Edit" onClick={() => startEdit(emp)}>
                            <Pencil size={14} className="text-muted-foreground" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Delete"
                            onClick={() => { deleteEmployee(emp.id); toast.success("Employee removed"); }}
                          >
                            <Trash2 size={14} className="text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{store.getEmployees().some((e) => e.id === draft.id) ? "Edit Employee" : "New Employee"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee Name *</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Riya Sharma" />
            </div>
            <div>
              <Label>Monthly Salary (₹) *</Label>
              <Input
                type="number"
                value={draft.salary || ""}
                onChange={(e) => setDraft({ ...draft, salary: Number(e.target.value) })}
                placeholder="e.g. 15000"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Auto-Pay</div>
                <p className="text-xs text-muted-foreground">Automatically record the salary as an expense each month.</p>
              </div>
              <Switch checked={draft.autoPay} onCheckedChange={(v) => setDraft({ ...draft, autoPay: v })} />
            </div>
            {draft.autoPay && (
              <div>
                <Label>Payment Day of Month</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={draft.payDay}
                  onChange={(e) => setDraft({ ...draft, payDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyFor} onOpenChange={(v) => !v && setHistoryFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payment History — {historyFor?.name}</DialogTitle></DialogHeader>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Month</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium">Date Paid</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments
                .filter((p) => p.employeeId === historyFor?.id)
                .sort((a, b) => b.month.localeCompare(a.month))
                .map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{monthLabel(p.month)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(p.amount, "INR")}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(p.datePaid)}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Paid</span>
                    </td>
                  </tr>
                ))}
              {payments.filter((p) => p.employeeId === historyFor?.id).length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No payments recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-light)] text-[var(--brand)]">{icon}</div>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-0.5 truncate text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
