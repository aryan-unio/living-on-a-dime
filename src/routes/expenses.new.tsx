import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Upload, X, FileText, Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/hooks/use-store";
import { store, uid } from "@/lib/storage";
import type { PaymentMode } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/expenses/new")({
  head: () => ({ meta: [{ title: "New Expense — Unio Invoice" }] }),
  component: NewExpense,
});

const ACCEPTED = ["image/png", "image/jpeg", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;

function NewExpense() {
  const navigate = useNavigate();
  const customers = useStore(() => store.getCustomers());
  const [date, setDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; });
  const [category, setCategory] = useState("Travel");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [paidThrough, setPaidThrough] = useState<PaymentMode>("card");
  const [customerId, setCustomerId] = useState<string>("");
  const [billable, setBillable] = useState(false);
  const [notes, setNotes] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [fileError, setFileError] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const handleFile = (f: File | null) => {
    setFileError("");
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setFileError("Only PNG, JPG, or PDF files are allowed.");
      return;
    }
    if (f.size > MAX_SIZE) {
      setFileError("File too large. Maximum size is 5MB.");
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl("");
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl("");
    setFileError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    let receiptPath: string | undefined;
    let receiptName: string | undefined;
    let receiptType: string | undefined;

    if (file) {
      setUploading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        toast.error("You must be signed in");
        setUploading(false);
        return;
      }
      const ext = file.name.split(".").pop() || "";
      const key = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("receipts").upload(key, file, {
        contentType: file.type,
        upsert: false,
      });
      setUploading(false);
      if (error) {
        toast.error("Upload failed: " + error.message);
        return;
      }
      receiptPath = key;
      receiptName = file.name;
      receiptType = file.type;
    }

    store.upsertExpense({
      id: uid("exp"),
      date: date,
      category, vendor, amount, taxRate, paidThrough,
      customerId: customerId || undefined,
      billable,
      status: billable ? "unbilled" : "non-billable",
      notes,
      receiptPath,
      receiptName,
      receiptType,
      billNumber: billNumber || undefined,
      billDate: billDate || undefined,
    });
    toast.success("Expense added");
    navigate({ to: "/expenses" });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" className="-ml-2 mb-2" onClick={() => navigate({ to: "/expenses" })}><ArrowLeft size={16} /> Back</Button>
      <h1 className="mb-6 text-2xl font-semibold">New Expense</h1>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Travel","Software","Rent","Meals","Utilities","Office","Marketing","Other"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Vendor</Label><Input value={vendor} onChange={(e) => setVendor(e.target.value)} /></div>
          <div><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>Tax %</Label><Input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>Paid Through</Label>
            <Select value={paidThrough} onValueChange={(v) => setPaidThrough(v as PaymentMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="payoneer">Payoneer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Customer (optional)</Label>
            <Select value={customerId || "_none"} onValueChange={(v) => setCustomerId(v === "_none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Billable to Customer</Label>
              <p className="text-xs text-muted-foreground">Mark as unbilled so you can add to a future invoice.</p>
            </div>
            <Switch checked={billable} onCheckedChange={setBillable} />
          </div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

          {/* Vendor bill info */}
          <div className="md:col-span-2 border-t pt-4">
            <h3 className="mb-1 text-sm font-semibold">Vendor Invoice / Bill Number</h3>
            <p className="mb-3 text-xs text-muted-foreground">Record the vendor's invoice number alongside your expense for accounting purposes.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Bill Number</Label>
                <Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} placeholder="e.g. BILL-2024-001" />
              </div>
              <div>
                <Label>Bill Date</Label>
                <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Receipt upload */}
          <div className="md:col-span-2 border-t pt-4">
            <h3 className="mb-1 text-sm font-semibold">Attach Bill / Receipt</h3>
            <p className="mb-3 text-xs text-muted-foreground">Upload the bill or invoice you received from the vendor.</p>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />

            {!file ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null); }}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-8 text-center transition hover:border-muted-foreground/50 hover:bg-muted/40"
              >
                <Paperclip size={22} className="text-muted-foreground" />
                <div className="text-sm font-medium">Click to upload or drag &amp; drop</div>
                <div className="text-xs text-muted-foreground">PNG, JPG, PDF up to 5MB</div>
              </button>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border p-3">
                {previewUrl ? (
                  <img src={previewUrl} alt={file.name} className="h-[120px] w-[120px] rounded object-cover" />
                ) : (
                  <div className="flex h-[120px] w-[120px] items-center justify-center rounded bg-muted">
                    <FileText size={40} className="text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <Button size="icon" variant="ghost" onClick={removeFile}><X size={16} /></Button>
              </div>
            )}

            {fileError && <p className="mt-2 text-sm text-destructive">{fileError}</p>}
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 border-t pt-4">
            <Button className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" onClick={save} disabled={!vendor || amount <= 0 || uploading}>
              {uploading ? (<><Loader2 size={16} className="animate-spin" /> Uploading…</>) : "Save Expense"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
