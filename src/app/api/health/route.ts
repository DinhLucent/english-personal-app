import { NextResponse } from "next/server";
import { getServiceStatuses } from "@/lib/status";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

async function checkSupabaseNetwork() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, message: "Supabase admin env vars are missing." };
  }

  const { error } = await supabase.from("profiles").select("id").limit(1);

  return {
    ok: !error,
    message: error ? error.message : "Supabase admin connection succeeded.",
  };
}

async function checkDeepSeekNetwork() {
  if (!process.env.DEEPSEEK_API_KEY) {
    return { ok: false, message: "DEEPSEEK_API_KEY is missing." };
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    cache: "no-store",
  });

  return {
    ok: response.ok,
    message: `DeepSeek models endpoint returned HTTP ${response.status}.`,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeNetwork = url.searchParams.get("network") === "1";
  const services = getServiceStatuses();

  if (!includeNetwork) {
    return NextResponse.json({
      ok: services.every((service) => service.configured),
      services,
    });
  }

  const [supabase, deepSeek] = await Promise.allSettled([
    checkSupabaseNetwork(),
    checkDeepSeekNetwork(),
  ]);
  const network = {
    supabase:
      supabase.status === "fulfilled"
        ? supabase.value
        : { ok: false, message: String(supabase.reason) },
    deepSeek:
      deepSeek.status === "fulfilled"
        ? deepSeek.value
        : { ok: false, message: String(deepSeek.reason) },
  };

  return NextResponse.json({
    ok:
      services.every((service) => service.configured) &&
      network.supabase.ok &&
      network.deepSeek.ok,
    services,
    network,
  });
}
