import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/hooks/use-store";
import { nextQuoteNumber, store, uid } from "@/lib/storage";

export const Route = createFileRoute("/quotes/new")({
  head: () => ({ meta: [{ title: "New Quote — Unio Invoice" }] }),
  component: NewQuote,
});

function NewQuote() {
  const customers = useStore(() => store.getCustomers());
  const navigate = useNavigate();
  const today = new Date();
  const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);

  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(today.toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(expiry.toISOString().slice(0, 10));
  const [total, setTotal] = useState(0);
  const [notes, setNotes] = useState("");

  const save = () => {
    const q = {
      id: uid("qte"),
      number: nextQuoteNumber(),
      customerId,
      date: new Date(date).toISOString(),
      expiryDate: new Date(expiryDate).toISOString(),
      status: "sent" as const,
      total,
      notes,
    };
    store.upsertQuote(q);
    toast.success("Quote created");
    navigate({ to: "/quotes" });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" className="-ml-2 mb-2" onClick={() => navigate({ to: "/quotes" })}><ArrowLeft size={16} /> Back</Button>
      <h1 className="mb-6 text-2xl font-semibold">New Quote</h1>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Expiry</Label><Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></div>
          <div><Label>Total (INR)</Label><Input type="number" value={total} onChange={(e) => setTotal(parseFloat(e.target.value) || 0)} /></div>
          <div className="md:col-span-2"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Scope summary" /></div>
          <div className="md:col-span-2 flex justify-end gap-2 border-t pt-4">
            <Button className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" onClick={save} disabled={!customerId || total <= 0}>Create Quote</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
