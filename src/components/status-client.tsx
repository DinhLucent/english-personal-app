"use client";

import { Activity, CheckCircle2, CircleAlert } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui";
import { PageTabs, useTabSync } from "@/components/page-tabs";
import type { ServiceStatus } from "@/lib/status";

const checks = [
  "npm run check:env",
  "npm run check:env:network",
  "npm run check:speaking-curriculum",
  "npm run check:supabase:schema",
  "npm run lint",
  "npm run build",
  "npm run smoke:local",
];

interface StatusClientProps {
  statuses: ServiceStatus[];
}

export function StatusClient({ statuses }: StatusClientProps) {
  const tabItems = [
    { id: "services", label: "Services", icon: <CheckCircle2 size={16} /> },
    { id: "checks", label: "Checks", icon: <Activity size={16} /> },
  ];

  const [activeTab, changeTab] = useTabSync("services", ["services", "checks"]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Status"
        title="Connection and release readiness"
        description="Use this page to see whether the app is still waiting on external services or ready for full flow verification."
      />

      <PageTabs tabs={tabItems} activeTab={activeTab} onChange={changeTab} />

      {activeTab === "services" && (
        <div className="grid gap-4 md:grid-cols-2 animate-fadeIn" role="tabpanel" id="tabpanel-services" aria-labelledby="tab-services">
          {statuses.map((status) => (
            <Panel key={status.name}>
              <div className="flex items-start gap-3">
                {status.configured ? (
                  <CheckCircle2 className="mt-1 text-brand" size={20} />
                ) : (
                  <CircleAlert className="mt-1 text-coral" size={20} />
                )}
                <div>
                  <h2 className="text-lg font-semibold">{status.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#66716c]">{status.detail}</p>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {activeTab === "checks" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-checks" aria-labelledby="tab-checks">
          <Panel>
            <div className="mb-4 flex items-center gap-3">
              <Activity size={20} className="text-brand" />
              <h2 className="text-lg font-semibold">Verification commands</h2>
            </div>
            <div className="grid gap-3">
              {checks.map((check) => (
                <code
                  key={check}
                  className="block rounded-[8px] border border-line bg-panel-muted px-4 py-3 text-sm"
                >
                  {check}
                </code>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
