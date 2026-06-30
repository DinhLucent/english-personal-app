import type { ApiResponse } from "@/lib/api";

export type PersistenceEnvelope = {
  saved: boolean;
  table?: string;
  id?: string;
  reason?: string;
  missionId?: string;
  missionAttemptId?: string;
  speakingAttemptId?: string;
  retryOf?: string | null;
  status?: string;
  currentStep?: string;
  reviewItemsCreated?: number;
  reviewItemsReason?: string;
};

export type AgentEnvelope<T> = {
  data: T;
  meta: {
    model: string;
    latencyMs: number;
    tokensInput: number | null;
    tokensOutput: number | null;
  };
  persistence?: PersistenceEnvelope;
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

export async function postApiJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await response.json()) as ApiResponse<T>;

  if (!json.ok) {
    throw new Error(json.error.message);
  }

  return json.data;
}
