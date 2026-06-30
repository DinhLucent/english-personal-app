import { Suspense } from "react";
import { StatusClient } from "@/components/status-client";
import { getServiceStatuses } from "@/lib/status";

export default function StatusPage() {
  const statuses = getServiceStatuses();

  return (
    <Suspense fallback={<div>Loading Status...</div>}>
      <StatusClient statuses={statuses} />
    </Suspense>
  );
}
