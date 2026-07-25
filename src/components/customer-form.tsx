import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/hooks/use-store";
import { store } from "@/lib/storage";
import { getTaxSystem, STATES_BY_COUNTRY } from "@/lib/taxSystem";
import type { Customer, GstTreatment } from "@/lib/types";

export function CustomerForm({
  initial, onSave,
}: { initial: Customer; onSave: (c: Customer) => void }) {
  const company = useStore(() => store.getCompany());
  const [c, setC] = useState<Customer>(initial);
  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => setC((p) => ({ ...p, [k]: v }));

  const country = c.country || company.country;
  const taxSystem = getTaxSystem(country);
  const states = STATES_BY_COUNTRY[country] || [];
  const taxField = taxSystem.customerTaxField;
  const showGstinField =
    taxSystem.key !== "india" || c.gstTreatment === "registered";

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        <Field label="Display Name *">
          <Input value={c.displayName} onChange={(e) => set("displayName", e.target.value)} />
        </Field>
        <Field label="Company">
          <Input value={c.companyName} onChange={(e) => set("companyName", e.target.value)} />
        </Field>
        <Field label="Email"><Input type="email" value={c.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Phone"><Input value={c.phone} onChange={(e) => set("phone", e.target.value)} /></Field>

        {taxSystem.key === "india" && (
          <Field label="GST Treatment">
            <Select value={c.gstTreatment} onValueChange={(v) => set("gstTreatment", v as GstTreatment)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="registered">Registered Business</SelectItem>
                <SelectItem value="unregistered">Unregistered</SelectItem>
                <SelectItem value="consumer">Consumer</SelectItem>
                <SelectItem value="overseas">Overseas</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}

        {taxField && showGstinField && (
          <Field label={taxField.label}>
            <Input
              value={(c as unknown as Record<string, string>)[taxField.key] || ""}
              onChange={(e) => setC((p) => ({ ...p, [taxField.key]: e.target.value } as Customer))}
            />
          </Field>
        )}

        <Field label="City"><Input value={c.city} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label={taxSystem.key === "canada" ? "Province" : "State"}>
          {states.length ? (
            <Select value={c.state} onValueChange={(v) => set("state", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <Input value={c.state} onChange={(e) => set("state", e.target.value)} />
          )}
        </Field>

        <div className="md:col-span-2 flex justify-end gap-2 border-t pt-4">
          <Button className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" onClick={() => onSave(c)} disabled={!c.displayName.trim()}>Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1.5 block">{label}</Label>{children}</div>;
}
