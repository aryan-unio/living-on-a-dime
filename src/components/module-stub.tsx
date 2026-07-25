import { type ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function ModuleStub({
  title, subtitle, icon, description, ctaLabel,
}: {
  title: string; subtitle: string; icon: ReactNode;
  description: string; ctaLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={title} subtitle={subtitle} />
      <EmptyState
        icon={icon}
        title="Coming soon"
        description={description}
        action={ctaLabel ? <Button disabled className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"><Plus size={16} /> {ctaLabel}</Button> : undefined}
      />
    </div>
  );
}
