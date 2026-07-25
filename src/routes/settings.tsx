import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, ChevronsUpDown, Download, Trash2, Upload, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { store } from "@/lib/storage";
import { initials } from "@/lib/format";
import { COUNTRIES, STATES_BY_COUNTRY, computeTaxSystemKey, getTaxSystem } from "@/lib/taxSystem";
import type { Company, Currency } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Unio Invoice" }] }),
  component: Settings,
});

const GST_RX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const URL_RX = /^https?:\/\/.+\..+/;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EIN_RX = /^[0-9]{2}-[0-9]{7}$/;
const UK_VAT_RX = /^GB[0-9]{9}([0-9]{3})?$/;
const BN_RX = /^[0-9]{9}$/;
const ABN_RX = /^[0-9]{11}$/;

const LS_KEYS = ["unio_company","unio_customers","unio_invoices","unio_quotes","unio_expenses","unio_items","unio_projects","unio_settings","unio_seeded_v1"];

const LOCALE_BY_COUNTRY: Record<string, string> = {
  India: "en-IN", "United States": "en-US", "United Kingdom": "en-GB",
  Canada: "en-CA", Australia: "en-AU", Germany: "de-DE", France: "fr-FR",
};

function Settings() {
  const [c, setC] = useState<Company>(() => store.getCompany());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingCountry, setPendingCountry] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { setC(store.getCompany()); }, []);

  const taxSystem = useMemo(() => getTaxSystem(c.country), [c.country]);
  const states = STATES_BY_COUNTRY[c.country] || [];

  const set = <K extends keyof Company>(k: K, v: Company[K]) => setC((p) => ({ ...p, [k]: v }));

  const changeCountry = (next: string) => {
    if (next === c.country) return;
    const invoices = store.getInvoices();
    if (invoices.length > 0) { setPendingCountry(next); return; }
    applyCountry(next);
  };

  const applyCountry = (next: string) => {
    const sysKey = computeTaxSystemKey(next);
    setC((p) => ({ ...p, country: next, state: "", taxSystem: sysKey }));
    setPendingCountry(null);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!c.name.trim()) e.name = "Company name is required";
    if (c.tagline && c.tagline.length > 60) e.tagline = "Max 60 characters";
    if (c.email && !EMAIL_RX.test(c.email)) e.email = "Enter a valid email address";
    if (c.phone && !/^\d{10}$/.test(c.phone.replace(/\D/g, ""))) e.phone = "Enter a valid 10-digit phone";
    if (c.website && !URL_RX.test(c.website)) e.website = "Enter a valid URL (e.g. https://example.com)";
    if (c.pin && !/^\d{6}$/.test(c.pin)) e.pin = "Enter a valid 6-digit PIN";

    // Tax-system-specific validation
    if (taxSystem.key === "india") {
      if (c.gst && !GST_RX.test(c.gst)) e.gst = "Invalid GST number format";
      if (c.pan && !PAN_RX.test(c.pan)) e.pan = "Invalid PAN format";
    }
    if (taxSystem.key === "us" && c.ein && !EIN_RX.test(c.ein)) e.ein = "Invalid EIN format (e.g. 12-3456789)";
    if (taxSystem.key === "uk" && c.vatNumber && !UK_VAT_RX.test(c.vatNumber)) e.vatNumber = "Invalid UK VAT number (e.g. GB123456789)";
    if (taxSystem.key === "canada" && c.bn && !BN_RX.test(c.bn)) e.bn = "Invalid BN (must be 9 digits)";
    if (taxSystem.key === "australia" && c.abn && !ABN_RX.test(c.abn)) e.abn = "Invalid ABN (must be 11 digits)";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) { toast.error("Please fix the errors before saving"); return; }
    const next: Company = { ...c, taxSystem: computeTaxSystemKey(c.country) };
    store.setCompany(next);
    // Save locale
    const settings = store.getSettings();
    store.setSettings({ ...settings, locale: LOCALE_BY_COUNTRY[c.country] || "en-US" });
    toast.success("Organization profile updated successfully");
  };

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|svg\+xml)$/.test(f.type)) {
      setErrors((p) => ({ ...p, logo: "Only PNG, JPG, or SVG files are allowed." })); return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setErrors((p) => ({ ...p, logo: "File too large. Maximum size is 2MB." })); return;
    }
    const reader = new FileReader();
    reader.onload = () => { set("logo", String(reader.result || "")); setErrors((p) => { const n = { ...p }; delete n.logo; return n; }); };
    reader.onerror = () => toast.error("Upload failed. Please try again.");
    reader.readAsDataURL(f);
  };

  const exportAll = () => {
    const dump: Record<string, unknown> = {};
    for (const k of LS_KEYS) {
      const v = localStorage.getItem(k);
      if (v !== null) { try { dump[k] = JSON.parse(v); } catch { dump[k] = v; } }
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unio_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { setImportData(JSON.parse(String(r.result))); }
      catch { toast.error("Invalid JSON file"); }
    };
    r.readAsText(f);
  };
  const applyImport = (mode: "replace" | "merge") => {
    if (!importData) return;
    if (mode === "replace") {
      LS_KEYS.forEach((k) => localStorage.removeItem(k));
      Object.entries(importData).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
    } else {
      Object.entries(importData).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          const existing = JSON.parse(localStorage.getItem(k) || "[]");
          const ids = new Set(existing.map((x: { id?: string }) => x?.id).filter(Boolean));
          const merged = [...existing, ...(v as { id?: string }[]).filter((x) => !x.id || !ids.has(x.id))];
          localStorage.setItem(k, JSON.stringify(merged));
        } else {
          localStorage.setItem(k, JSON.stringify(v));
        }
      });
    }
    setImportData(null);
    toast.success(`Data ${mode === "replace" ? "replaced" : "merged"} — reloading`);
    setTimeout(() => window.location.reload(), 600);
  };

  const clearAll = () => {
    LS_KEYS.forEach((k) => localStorage.removeItem(k));
    toast.success("All data cleared — reloading");
    setTimeout(() => window.location.reload(), 600);
  };

  const fieldErr = (k: string) => errors[k] ? "border-red-500" : "";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" subtitle="Configure your organization, taxes, and preferences." />
      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org">Organization</TabsTrigger>
          <TabsTrigger value="tax">Tax &amp; Compliance</TabsTrigger>
          <TabsTrigger value="payment">Payments</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="org" className="mt-4">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              {/* Logo */}
              <div className="md:col-span-2">
                <Label className="mb-1.5 block">Company Logo</Label>
                <div className="flex items-start gap-4">
                  <div className="group relative">
                    {c.logo ? (
                      <>
                        <img src={c.logo} alt="logo" className="h-20 w-20 rounded-lg border object-contain bg-white" />
                        <button onClick={() => set("logo", "")} className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white group-hover:flex" aria-label="Remove logo">
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--brand)] text-lg font-bold text-white">
                        {initials(c.name)}
                      </div>
                    )}
                  </div>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-[var(--brand)]"
                  >
                    <Upload size={20} className="text-muted-foreground" />
                    <div className="mt-2 text-sm">Click to upload or drag &amp; drop</div>
                    <div className="text-xs text-muted-foreground">PNG, JPG, SVG up to 2MB</div>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={onLogo} />
                  </div>
                </div>
                {errors.logo && <p className="mt-1 text-xs text-red-500">{errors.logo}</p>}
              </div>

              <Field label="Company Name *" error={errors.name}>
                <Input value={c.name} onChange={(e) => set("name", e.target.value)} className={fieldErr("name")} />
              </Field>
              <Field label={`Tagline (${(c.tagline || "").length}/60)`} error={errors.tagline}>
                <Input value={c.tagline} maxLength={60} onChange={(e) => set("tagline", e.target.value)} className={fieldErr("tagline")} />
              </Field>
              <Field label="Email" error={errors.email}>
                <Input type="email" value={c.email} onChange={(e) => set("email", e.target.value)} className={fieldErr("email")} />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <Input value={c.phone} onChange={(e) => set("phone", e.target.value)} className={fieldErr("phone")} />
              </Field>
              <Field label="Website" error={errors.website}>
                <Input value={c.website || ""} onChange={(e) => set("website", e.target.value)} className={fieldErr("website")} placeholder="https://example.com" />
              </Field>

              {/* Country combobox */}
              <Field label="Country">
                <CountryCombobox value={c.country} onChange={changeCountry} />
              </Field>

              <div className="md:col-span-2">
                <Label className="mb-1.5 block">Address</Label>
                <Textarea value={c.street} onChange={(e) => set("street", e.target.value)} rows={2} />
              </div>
              <Field label="City"><Input value={c.city} onChange={(e) => set("city", e.target.value)} /></Field>
              <Field label={taxSystem.key === "canada" ? "Province" : "State"}>
                {states.length > 0 ? (
                  <Select value={c.state} onValueChange={(v) => set("state", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={c.state} onChange={(e) => set("state", e.target.value)} />
                )}
              </Field>
              <Field label={c.country === "India" ? "PIN Code" : "Postal Code"} error={errors.pin}>
                <Input value={c.pin} onChange={(e) => set("pin", c.country === "India" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value)} className={fieldErr("pin")} />
              </Field>
              <Field label="Currency">
                <Select value={c.currency} onValueChange={(v) => set("currency", v as Currency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR ₹</SelectItem>
                    <SelectItem value="USD">USD $</SelectItem>
                    <SelectItem value="EUR">EUR €</SelectItem>
                    <SelectItem value="GBP">GBP £</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fiscal Year Start">
                <Select value={c.fiscalYearStart} onValueChange={(v) => set("fiscalYearStart", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="04-01">April</SelectItem>
                    <SelectItem value="01-01">January</SelectItem>
                    <SelectItem value="07-01">July</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Time Zone">
                <Select value={c.timezone} onValueChange={(v) => set("timezone", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-2 flex justify-end border-t pt-4">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={save}>Save Changes</Button>
              </div>

              <div className="md:col-span-2 flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                <span className="mt-0.5 shrink-0 text-base leading-none">✓</span>
                <span>Your data is securely stored in Lovable Cloud and syncs to your account.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="mt-4">
          <Card><CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2 text-sm text-muted-foreground">
              Tax system: <span className="font-medium text-foreground">{taxSystem.label}</span> ({c.country})
            </div>

            {taxSystem.key === "india" && (
              <>
                <Field label="GST Number" error={errors.gst}>
                  <Input value={c.gst} onChange={(e) => set("gst", e.target.value.toUpperCase())} className={fieldErr("gst")} placeholder="29ABCDE1234F1Z5" />
                </Field>
                <Field label="PAN Number" error={errors.pan}>
                  <Input value={c.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} className={fieldErr("pan")} placeholder="ABCDE1234F" />
                </Field>
              </>
            )}
            {taxSystem.key === "us" && (
              <Field label="EIN (optional)" error={errors.ein}>
                <Input value={c.ein || ""} onChange={(e) => set("ein", e.target.value)} className={fieldErr("ein")} placeholder="12-3456789" />
              </Field>
            )}
            {taxSystem.key === "uk" && (
              <Field label="VAT Registration Number" error={errors.vatNumber}>
                <Input value={c.vatNumber || ""} onChange={(e) => set("vatNumber", e.target.value.toUpperCase())} className={fieldErr("vatNumber")} placeholder="GB123456789" />
              </Field>
            )}
            {taxSystem.key === "eu" && (
              <Field label="VAT Number">
                <Input value={c.vatNumber || ""} onChange={(e) => set("vatNumber", e.target.value)} placeholder="e.g. DE123456789" />
              </Field>
            )}
            {taxSystem.key === "canada" && (
              <Field label="Business Number (BN)" error={errors.bn}>
                <Input value={c.bn || ""} onChange={(e) => set("bn", e.target.value)} className={fieldErr("bn")} placeholder="123456789" />
              </Field>
            )}
            {taxSystem.key === "australia" && (
              <Field label="ABN" error={errors.abn}>
                <Input value={c.abn || ""} onChange={(e) => set("abn", e.target.value)} className={fieldErr("abn")} placeholder="11 digits" />
              </Field>
            )}
            {taxSystem.key === "other" && (
              <Field label="Tax Registration Number (optional)">
                <Input value={c.taxRegNumber || ""} onChange={(e) => set("taxRegNumber", e.target.value)} />
              </Field>
            )}

            <div className="md:col-span-2 flex justify-end border-t pt-4">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={save}>Save Changes</Button>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-4">
          <Card><CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold">Bank / Payment Details</h3>
              <p className="text-xs text-muted-foreground">
                Shown in the "Payment Options" section of the invoice. Leave all fields blank to hide the section.
              </p>
            </div>
            <Field label="Bank Name">
              <Input value={c.bankName || ""} onChange={(e) => set("bankName", e.target.value)} placeholder="e.g. HDFC Bank" />
            </Field>
            <Field label="Account Holder Name">
              <Input value={c.accountHolder || ""} onChange={(e) => set("accountHolder", e.target.value)} placeholder="Name on account" />
            </Field>
            <Field label="Account Number">
              <Input value={c.accountNumber || ""} onChange={(e) => set("accountNumber", e.target.value)} placeholder="Bank account number" />
            </Field>
            <Field label="IFSC Code">
              <Input value={c.ifsc || ""} onChange={(e) => set("ifsc", e.target.value.toUpperCase())} placeholder="e.g. HDFC0001234" />
            </Field>
            <Field label="UPI ID">
              <Input value={c.upiId} onChange={(e) => set("upiId", e.target.value)} placeholder="yourname@upi" />
            </Field>
            <div className="md:col-span-2 flex justify-end border-t pt-4">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={save}>Save Changes</Button>
            </div>
          </CardContent></Card>
        </TabsContent>


        <TabsContent value="data" className="mt-4">
          <Card><CardContent className="space-y-4 p-5">
            <div>
              <h3 className="text-sm font-semibold">Export / Import Data</h3>
              <p className="text-xs text-muted-foreground">Backup all your data or restore from a previous export.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportAll}><Download size={16} /> Export All Data</Button>
              <Button variant="outline" onClick={() => importRef.current?.click()}><Upload size={16} /> Import Data</Button>
              <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={onImportFile} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-red-500 text-red-600 hover:bg-red-50"><Trash2 size={16} /> Clear All Data</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete all your data. This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAll} className="bg-red-600 hover:bg-red-700">Clear Everything</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Country change confirmation */}
      <AlertDialog open={!!pendingCountry} onOpenChange={(o) => !o && setPendingCountry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change country?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update tax labels and rates for new invoices. Existing invoices will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingCountry && applyCountry(pendingCountry)} className="bg-teal-600 hover:bg-teal-700">Change Country</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!importData} onOpenChange={(o) => !o && setImportData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import data</AlertDialogTitle>
            <AlertDialogDescription>Replace all data or merge with existing?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => applyImport("merge")}>Merge</Button>
            <AlertDialogAction onClick={() => applyImport("replace")} className="bg-red-600 hover:bg-red-700">Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CountryCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {value || "Select country"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((country) => (
                <CommandItem key={country} value={country} onSelect={() => { onChange(country); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === country ? "opacity-100" : "opacity-0")} />
                  {country}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
