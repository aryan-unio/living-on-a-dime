import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InvoiceEditor } from "@/components/invoice-editor";
import { store } from "@/lib/storage";
import type { Invoice } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/invoices/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Invoice — Unio Invoice" }] }),
  component: EditInvoice,
});

function EditInvoice() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tryLoad = () => {
      if (cancelled) return;
      if (!store.isReady()) return; // wait for hydration
      const inv = store.getInvoices().find((i) => i.id === id);
      if (inv) {
        setInvoice(inv);
      } else {
        setNotFound(true);
      }
    };
    tryLoad();
    const onChange = () => tryLoad();
    window.addEventListener("unio:data-changed", onChange);
    return () => { cancelled = true; window.removeEventListener("unio:data-changed", onChange); };
  }, [id]);

  useEffect(() => {
    if (notFound) {
      toast.error("Invoice not found");
      navigate({ to: "/invoices" });
    }
  }, [notFound, navigate]);

  if (!invoice) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <InvoiceEditor
      invoice={invoice}
      onSave={(inv, mode) => {
        const toSave = { ...inv, status: mode === "send" && inv.status === "draft" ? "sent" as const : inv.status };
        store.upsertInvoice(toSave);
        toast.success("Invoice updated successfully");
        navigate({ to: "/invoices/$id", params: { id: toSave.id } });
      }}
    />

  );
}

