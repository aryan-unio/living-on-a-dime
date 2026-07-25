import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { ModuleStub } from "@/components/module-stub";

export const Route = createFileRoute("/timesheet")({
  head: () => ({ meta: [{ title: "Timesheet — Unio Invoice" }] }),
  component: () => (
    <ModuleStub
      title="Timesheet"
      subtitle="Log billable hours and add them to invoices."
      icon={<Clock size={20} />}
      description="Track project time with a built-in timer and bill it later. Coming soon."
      ctaLabel="Log Time"
    />
  ),
});
