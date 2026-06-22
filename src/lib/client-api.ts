import type { ApiResponse } from "@/lib/api";

export type AgentEnvelope<T> = {
  data: T;
  meta: {
    model: string;
    latencyMs: number;
    tokensInput: number | null;
    tokensOutput: number | null;
  };
  persistence?: {
    saved: boolean;
    table?: string;
    id?: string;
    reason?: string;
  };
};

export async function postJson<T>(url: string, payload: unknown): Promise<AgentEnvelope<T>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await response.json()) as ApiResponse<AgentEnvelope<T>>;

  if (!json.ok) {
    throw new Error(json.error.message);
  }

  return json.data;
}

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const json = (await response.json()) as ApiResponse<T>;

  if (!json.ok) {
    throw new Error(json.error.message);
  }

  return json.data;
}
