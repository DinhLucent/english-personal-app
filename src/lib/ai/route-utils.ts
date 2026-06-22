import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
import { fail, ok } from "@/lib/api";
import { AiConfigurationError, AiOutputError } from "@/lib/ai/gateway";

export async function parseBody<T>(request: Request, schema: z.ZodType<T>) {
  const json = await request.json().catch(() => null);
  return schema.parse(json);
}

export function okJson<T>(data: T) {
  return NextResponse.json(ok(data));
}

export function errorJson(error: unknown) {
  if (error instanceof AiConfigurationError) {
    return NextResponse.json(fail("missing_ai_key", error.message), { status: 503 });
  }

  if (error instanceof AiOutputError) {
    return NextResponse.json(fail("invalid_ai_output", error.message), { status: 502 });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      fail("invalid_request", "The request payload is invalid."),
      { status: 400 },
    );
  }

  return NextResponse.json(
    fail("server_error", "Something went wrong while processing the request."),
    { status: 500 },
  );
}
