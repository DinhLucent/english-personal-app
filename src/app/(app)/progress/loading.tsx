import { Loader2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui";

export default function ProgressLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Progress"
        title="Loading speaking progress"
        description="Preparing rubric scores, recent trend, and review signals."
      />
      <Panel>
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="animate-spin text-brand" size={28} />
        </div>
      </Panel>
    </div>
  );
}
