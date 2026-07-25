import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/customer-form";
import { store, uid } from "@/lib/storage";
import type { Customer } from "@/lib/types";

export const Route = createFileRoute("/customers/new")({
  head: () => ({ meta: [{ title: "New Customer — Unio Invoice" }] }),
  component: NewCustomer,
});

function NewCustomer() {
  const navigate = useNavigate();
  const [draft] = useState<Customer>({
    id: uid("cust"),
    displayName: "",
    companyName: "",
    email: "",
    phone: "",
    gstin: "",
    gstTreatment: "registered",
    state: "",
    city: "",
    outstandingBalance: 0,
    totalInvoiced: 0,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" className="-ml-2 mb-2" onClick={() => navigate({ to: "/customers" })}>
        <ArrowLeft size={16} /> Back
      </Button>
      <h1 className="mb-6 text-2xl font-semibold">New Customer</h1>
      <CustomerForm
        initial={draft}
        onSave={(c) => {
          store.upsertCustomer(c);
          toast.success("Customer added");
          navigate({ to: "/customers/$id", params: { id: c.id } });
        }}
      />
    </div>
  );
}
