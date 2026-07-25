import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { formatDate, formatMoney } from "@/lib/format";

interface Recurring {
  id: string; customerId: string; frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  startDate: string; endDate?: string; nextDate: string; lastSent?: string; status: "active" | "paused";
  amount: number; autoSend: boolean;
}

function loadRec(): Recurring[] {
  try { return JSON.parse(localStorage.getItem("unio_recurring") || "[]"); } catch { return []; }
}
function saveRec(list: Recurring[]) {
  localStorage.setItem("unio_recurring", JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("unio:data-changed", { detail: { key: "unio_recurring" } }));
}

export const Route = createFileRoute("/recurring")({
  head: () => ({ meta: [{ title: "Recurring — Unio Invoice" }] }),
  component: Recurring,
});

function Recurring() {
  const customers = useStore(() => store.getCustomers());
  const list = useStore(() => loadRec());
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Recurring Invoices"
        subtitle="Auto-generate invoices on a schedule for repeat customers."
        actions={<Button onClick={() => setOpen(true)} className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"><RefreshCw size={16} /> New Recurring</Button>}
      />
      {open && <NewForm customers={customers} onClose={() => setOpen(false)} onSaved={() => setOpen(false)} />}
      <Card className="p-4">
        {list.length === 0 && !open ? (
          <EmptyState icon={<RefreshCw size={20} />} title="No recurring invoices yet" description="Set up a schedule to auto-generate invoices."
            action={<Button onClick={() => setOpen(true)} className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white">New Recurring</Button>} />
        ) : list.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-y bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Customer</th>
                <th className="px-3 py-2 text-left font-medium">Frequency</th>
                <th className="px-3 py-2 text-left font-medium">Next Date</th>
                <th className="px-3 py-2 text-left font-medium">Last Sent</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-3">{customers.find((c) => c.id === r.customerId)?.displayName || "—"}</td>
                  <td className="px-3 py-3 capitalize">{r.frequency}</td>
                  <td className="px-3 py-3 text-muted-foreground">{formatDate(r.nextDate)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{r.lastSent ? formatDate(r.lastSent) : "—"}</td>
                  <td className="px-3 py-3 text-right font-medium">{formatMoney(r.amount)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function NewForm({ customers, onClose, onSaved }: { customers: { id: string; displayName: string }[]; onClose: () => void; onSaved: () => void }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [r, setR] = useState<Recurring>({
    id: "rec_" + Math.random().toString(36).slice(2, 9),
    customerId: "", frequency: "monthly", startDate: today, nextDate: today,
    status: "active", amount: 0, autoSend: false,
  });
  const save = () => {
    if (!r.customerId) { toast.error("Select a customer"); return; }
    if (r.amount <= 0) { toast.error("Amount must be greater than zero"); return; }
    saveRec([...loadRec(), r]);
    toast.success("Recurring profile created");
    onSaved();
    void navigate;
  };
  void Link;
  return (
    <Card className="mb-4">
      <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        <Button variant="ghost" className="md:col-span-2 -ml-2 w-fit" onClick={onClose}><ArrowLeft size={14} /> Cancel</Button>
        <div className="md:col-span-2">
          <Label>Customer</Label>
          <Select value={r.customerId} onValueChange={(v) => setR({ ...r, customerId: v })}>
            <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Frequency</Label>
          <Select value={r.frequency} onValueChange={(v) => setR({ ...r, frequency: v as Recurring["frequency"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Amount</Label><Input type="number" value={r.amount} onChange={(e) => setR({ ...r, amount: parseFloat(e.target.value) || 0 })} /></div>
        <div><Label>Start Date</Label><Input type="date" value={r.startDate} onChange={(e) => setR({ ...r, startDate: e.target.value, nextDate: e.target.value })} /></div>
        <div><Label>End Date (optional)</Label><Input type="date" value={r.endDate || ""} onChange={(e) => setR({ ...r, endDate: e.target.value })} /></div>
        <div className="md:col-span-2 flex items-center gap-2">
          <Switch checked={r.autoSend} onCheckedChange={(v) => setR({ ...r, autoSend: v })} />
          <Label>Auto-send when generated</Label>
        </div>
        <div className="md:col-span-2 flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" onClick={save}>Create</Button>
        </div>
      </CardContent>
    </Card>
  );
}
