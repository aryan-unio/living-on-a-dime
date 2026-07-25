import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InvoiceEditor } from "@/components/invoice-editor";
import { nextInvoiceNumber, store, uid } from "@/lib/storage";
import type { Invoice } from "@/lib/types";
import { toast } from "sonner";
import { useMemo } from "react";

export const Route = createFileRoute("/invoices/new")({
  head: () => ({ meta: [{ title: "New Invoice — Unio Invoice" }] }),
  component: NewInvoice,
});

function NewInvoice() {
  const navigate = useNavigate();
  const draft = useMemo<Invoice>(() => {
    const today = new Date();
    const due = new Date();
    due.setDate(due.getDate() + 30);
    return {
      id: uid("inv"),
      number: nextInvoiceNumber(),
      customerId: "",
      date: today.toISOString(),
      dueDate: due.toISOString(),
      
      lineItems: [
        { id: uid("li"), description: "", qty: 1, rate: 0, taxRate: 18, hsnCode: "" },
      ],
      discount: { type: "percent", value: 0 },
      notes: "",
      terms: "Payment due within 30 days.",
      status: "draft",
      payments: [],
    };
  }, []);

  return (
    <InvoiceEditor
      invoice={draft}
      onSave={(inv, mode) => {
        const toSave = { ...inv, status: mode === "send" ? "sent" as const : "draft" as const };
        store.upsertInvoice(toSave);
        toast.success(mode === "send" ? "Invoice saved & marked as sent" : "Draft saved");
        navigate({ to: "/invoices/$id", params: { id: toSave.id } });
      }}
    />
  );
}
