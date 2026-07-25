import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useStore } from "@/hooks/use-store";
import { store, uid } from "@/lib/storage";
import type { Item } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/items")({
  head: () => ({ meta: [{ title: "Items — Unio Invoice" }] }),
  component: Items,
});

function Items() {
  const items = useStore(() => store.getItems());
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Item>({
    id: "", name: "", type: "service", rate: 0, taxRate: 18, unit: "unit",
  });

  const startNew = () => {
    setDraft({ id: uid("item"), name: "", type: "service", rate: 0, taxRate: 18, unit: "unit" });
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Items"
        subtitle="Products and services you sell."
        actions={<Button onClick={startNew} className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"><Plus size={16} /> New Item</Button>}
      />
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-2 text-left font-medium">Name</th><th className="px-4 py-2 text-left font-medium">Type</th><th className="px-4 py-2 text-left font-medium">HSN/SAC</th><th className="px-4 py-2 text-left font-medium">Unit</th><th className="px-4 py-2 text-right font-medium">Rate</th><th className="px-4 py-2 text-right font-medium">Tax %</th><th></th></tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No items yet.</td></tr>}
              {items.map((i) => (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{i.name}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{i.type}</td>
                  <td className="px-4 py-3 text-xs">{i.hsnCode || i.sacCode || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.unit}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(i.rate)}</td>
                  <td className="px-4 py-3 text-right">{i.taxRate}%</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => { store.deleteItem(i.id); toast.success("Item deleted"); }}>
                      <Trash2 size={14} className="text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><span className="hidden" /></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>New Item</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div><Label>Type</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v as Item["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="service">Service</SelectItem><SelectItem value="goods">Goods</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Unit</Label><Input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></div>
            <div><Label>Rate</Label><Input type="number" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Tax %</Label><Input type="number" value={draft.taxRate} onChange={(e) => setDraft({ ...draft, taxRate: parseFloat(e.target.value) || 0 })} /></div>
            <div className="col-span-2"><Label>HSN / SAC</Label><Input value={draft.type === "goods" ? draft.hsnCode || "" : draft.sacCode || ""} onChange={(e) => setDraft(draft.type === "goods" ? { ...draft, hsnCode: e.target.value } : { ...draft, sacCode: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" onClick={() => { store.upsertItem(draft); toast.success("Item saved"); setOpen(false); }} disabled={!draft.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
