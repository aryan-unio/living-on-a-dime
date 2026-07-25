import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/hooks/use-store";
import { store, uid } from "@/lib/storage";
import { computeInvoiceTotals } from "@/lib/calc";
import { formatMoney } from "@/lib/format";
import { getTaxSystem } from "@/lib/taxSystem";
import type { Invoice, LineItem, Currency } from "@/lib/types";

const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: "INR", label: "INR ₹" },
  { value: "USD", label: "USD $" },
  { value: "EUR", label: "EUR €" },
  { value: "GBP", label: "GBP £" },
];

export type SaveMode = "draft" | "send";

export function InvoiceEditor({
  invoice: initial,
  onSave,
}: {
  invoice: Invoice;
  onSave: (inv: Invoice, mode: SaveMode) => void;
}) {
  const navigate = useNavigate();
  const customers = useStore(() => store.getCustomers());
  const company = useStore(() => store.getCompany());
  const items = useStore(() => store.getItems());
  const [inv, setInv] = useState<Invoice>({
    ...initial,
    currency: initial.currency || company.currency || "INR",
  });

  const customer = customers.find((c) => c.id === inv.customerId);
  const curr: Currency = inv.currency || company.currency || "INR";
  const isINR = curr === "INR";
  const baseTaxSystem = useMemo(() => getTaxSystem(company.country), [company.country]);
  // When currency is non-INR, force a simple single-tax model regardless of company country.
  const taxSystem = isINR
    ? baseTaxSystem
    : { ...baseTaxSystem, key: "other", label: "Tax", rates: [], freeEntry: true, showHSN: false, splitLogic: "none" as const, tooltip: undefined };
  const totals = useMemo(
    () => computeInvoiceTotals(
      { ...inv, taxSnapshot: { system: taxSystem.key, companyState: company.state || "", customerState: customer?.state || "", splitLogic: taxSystem.splitLogic } },
      company,
      customer,
    ),
    [inv, company, customer, taxSystem.key, taxSystem.splitLogic],
  );
  const withSnapshot = (i: Invoice): Invoice => ({
    ...i,
    currency: curr,
    taxSnapshot: {
      system: taxSystem.key,
      companyState: company.state || "",
      customerState: customer?.state || "",
      splitLogic: taxSystem.splitLogic,
    },
  });

  const updateLine = (id: string, patch: Partial<LineItem>) => {
    setInv((p) => ({
      ...p,
      lineItems: p.lineItems.map((li) => (li.id === id ? { ...li, ...patch } : li)),
    }));
  };

  const addLine = () => {
    const defaultRate = taxSystem.rates[0] ?? 0;
    setInv((p) => ({
      ...p,
      lineItems: [
        ...p.lineItems,
        { id: uid("li"), description: "", qty: 1, rate: 0, taxRate: defaultRate, hsnCode: "" },
      ],
    }));
  };

  const removeLine = (id: string) => {
    setInv((p) => ({ ...p, lineItems: p.lineItems.filter((li) => li.id !== id) }));
  };

  const pickItem = (lineId: string, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    updateLine(lineId, {
      itemId,
      description: item.name,
      rate: item.rate,
      taxRate: item.taxRate,
      hsnCode: item.hsnCode || item.sacCode || "",
    });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Button variant="ghost" className="-ml-2 mb-2" onClick={() => navigate({ to: "/invoices" })}>
        <ArrowLeft size={16} /> Back
      </Button>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{inv.number}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onSave(withSnapshot(inv), "draft")}>Save Draft</Button>
          <Button
            className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"
            onClick={() => onSave(withSnapshot(inv), "send")}
            disabled={!inv.customerId || inv.lineItems.length === 0}
          >
            Save &amp; Send
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <div>
                <Label>Customer</Label>
                <Select value={inv.customerId} onValueChange={(v) => setInv({ ...inv, customerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.displayName}{c.companyName && ` · ${c.companyName}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {customers.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <Link to="/customers/new" className="text-[var(--brand)] underline">Add a customer first</Link>
                  </p>
                )}
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={curr} onValueChange={(v) => setInv({ ...inv, currency: v as Currency })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Invoice Date</Label>
                <Input
                  type="date"
                  value={inv.date.slice(0, 10)}
                  onChange={(e) => setInv({ ...inv, date: new Date(e.target.value).toISOString() })}
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={inv.dueDate.slice(0, 10)}
                  onChange={(e) => setInv({ ...inv, dueDate: new Date(e.target.value).toISOString() })}
                />
              </div>
            </CardContent>
          </Card>

          {customer && (
            <Card>
              <CardContent className="p-5 text-xs text-muted-foreground">
                {taxSystem.key === "india" && (
                  <>
                    <div>Place of Supply: <span className="font-medium text-foreground">{customer.state || "—"}</span></div>
                    {customer.gstin && <div>Customer GSTIN: <span className="font-medium text-foreground">{customer.gstin}</span></div>}
                    <div className="mt-1">{totals.taxLabel || "—"}</div>
                  </>
                )}
                {taxSystem.key === "uk" && customer.vatNumber && <div>Customer VAT Number: <span className="font-medium text-foreground">{customer.vatNumber}</span></div>}
                {taxSystem.key === "eu" && customer.vatNumber && <div>Customer VAT Number: <span className="font-medium text-foreground">{customer.vatNumber}</span></div>}
                {taxSystem.key === "us" && customer.ein && <div>Customer EIN: <span className="font-medium text-foreground">{customer.ein}</span></div>}
                {taxSystem.key === "australia" && customer.abn && <div>Customer ABN: <span className="font-medium text-foreground">{customer.abn}</span></div>}
                {taxSystem.key === "canada" && (
                  <>
                    {customer.bn && <div>Customer BN: <span className="font-medium text-foreground">{customer.bn}</span></div>}
                    <div>Province: <span className="font-medium text-foreground">{customer.state || "—"}</span></div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Line Items</h3>
                <Button size="sm" variant="outline" onClick={addLine}><Plus size={14} /> Add Row</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">Item / Description</th>
                      <th className="w-20 px-2 py-2 text-right font-medium">Qty</th>
                      <th className="w-28 px-2 py-2 text-right font-medium">Rate</th>
                      <th className="w-24 px-2 py-2 text-right font-medium">
                        <span className="inline-flex items-center gap-1">
                          {taxSystem.label} %
                          {taxSystem.tooltip && <Info size={12} aria-label={taxSystem.tooltip} />}
                        </span>
                      </th>
                      <th className="w-28 px-2 py-2 text-right font-medium">Amount</th>
                      <th className="w-8 px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.lineItems.map((li) => (
                      <tr key={li.id} className="border-b last:border-0">
                        <td className="px-2 py-2">
                          {items.length > 0 && (
                            <Select value={li.itemId || ""} onValueChange={(v) => pickItem(li.id, v)}>
                              <SelectTrigger className="h-8 mb-1 text-xs"><SelectValue placeholder="Pick item…" /></SelectTrigger>
                              <SelectContent>
                                {items.map((it) => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                          <Input value={li.description} onChange={(e) => updateLine(li.id, { description: e.target.value })} placeholder="Description" />
                          {taxSystem.showHSN && (
                            <Input value={li.hsnCode} onChange={(e) => updateLine(li.id, { hsnCode: e.target.value })} placeholder="HSN / SAC Code" className="mt-1 h-7 text-xs" />
                          )}
                        </td>
                        <td className="px-2 py-2"><Input type="number" value={li.qty} onChange={(e) => updateLine(li.id, { qty: parseFloat(e.target.value) || 0 })} className="text-right" /></td>
                        <td className="px-2 py-2"><Input type="number" value={li.rate} onChange={(e) => updateLine(li.id, { rate: parseFloat(e.target.value) || 0 })} className="text-right" /></td>
                        <td className="px-2 py-2">
                          {taxSystem.freeEntry ? (
                            <Input type="number" value={li.taxRate} onChange={(e) => updateLine(li.id, { taxRate: parseFloat(e.target.value) || 0 })} className="text-right" placeholder="e.g. 8.5" />
                          ) : (
                            <Select value={String(li.taxRate)} onValueChange={(v) => updateLine(li.id, { taxRate: parseFloat(v) })}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {taxSystem.rates.map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right font-medium">{formatMoney(li.qty * li.rate, curr)}</td>
                        <td className="px-2 py-2"><Button size="icon" variant="ghost" onClick={() => removeLine(li.id)}><Trash2 size={14} className="text-muted-foreground" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <div>
                <Label>Customer Notes</Label>
                <Textarea rows={3} value={inv.notes || ""} onChange={(e) => setInv({ ...inv, notes: e.target.value })} placeholder="Thanks for your business!" />
              </div>
              <div>
                <Label>Terms &amp; Conditions</Label>
                <Textarea rows={3} value={inv.terms || ""} onChange={(e) => setInv({ ...inv, terms: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-[76px]">
            <CardContent className="space-y-3 p-5">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(totals.subtotal, curr)}</span></div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={inv.discount.type} onValueChange={(v) => setInv({ ...inv, discount: { ...inv.discount, type: v as "percent" | "fixed" } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Discount %</SelectItem>
                    <SelectItem value="fixed">Discount</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" value={inv.discount.value} onChange={(e) => setInv({ ...inv, discount: { ...inv.discount, value: parseFloat(e.target.value) || 0 } })} className="text-right" />
              </div>
              {totals.discountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount</span><span>− {formatMoney(totals.discountAmount, curr)}</span></div>}
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxable Amount</span><span>{formatMoney(totals.taxableAmount, curr)}</span></div>

              <TaxRows totals={totals} curr={curr} treatment={customer?.gstTreatment} />

              <div className="border-t pt-3">
                <Label className="text-xs">Adjustment</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Label" value={inv.adjustment?.label || ""} onChange={(e) => setInv({ ...inv, adjustment: { label: e.target.value, value: inv.adjustment?.value || 0 } })} />
                  <Input type="number" value={inv.adjustment?.value || 0} onChange={(e) => setInv({ ...inv, adjustment: { label: inv.adjustment?.label || "Adjustment", value: parseFloat(e.target.value) || 0 } })} className="text-right" />
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                <span>Total</span><span>{formatMoney(totals.total, curr)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TaxRows({ totals, curr, treatment }: { totals: ReturnType<typeof computeInvoiceTotals>; curr: string; treatment?: string }) {
  const sys = totals.systemKey;
  if (sys === "india") {
    if (treatment === "overseas") return <div className="flex justify-between text-sm"><span className="text-muted-foreground">Export</span><span>{formatMoney(0, curr)}</span></div>;
    if (totals.igst > 0) return <div className="flex justify-between text-sm"><span className="text-muted-foreground">IGST</span><span>{formatMoney(totals.igst, curr)}</span></div>;
    return (
      <>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">CGST</span><span>{formatMoney(totals.cgst, curr)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">SGST</span><span>{formatMoney(totals.sgst, curr)}</span></div>
      </>
    );
  }
  if (sys === "canada") {
    return (
      <>
        {totals.gst > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">GST (5%)</span><span>{formatMoney(totals.gst, curr)}</span></div>}
        {totals.pst > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">PST</span><span>{formatMoney(totals.pst, curr)}</span></div>}
        {totals.hst > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">HST</span><span>{formatMoney(totals.hst, curr)}</span></div>}
      </>
    );
  }
  if (sys === "us") {
    return <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sales Tax</span><span>{formatMoney(totals.salesTax, curr)}</span></div>;
  }
  // uk / eu / australia / other
  const label = sys === "australia" ? "GST" : sys === "other" ? "Tax" : "VAT";
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span>{formatMoney(totals.taxAmount, curr)}</span></div>;
}
