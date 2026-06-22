import OpenAI from "openai";
import type { z } from "zod";

const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";

export class AiConfigurationError extends Error {
  constructor() {
    super("DEEPSEEK_API_KEY is missing. Add it to .env.local or Vercel environment variables.");
    this.name = "AiConfigurationError";
  }
}

export class AiOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiOutputError";
  }
}

let deepSeek: OpenAI | null = null;

function getDeepSeekClient() {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new AiConfigurationError();
  }

  deepSeek ??= new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL,
  });

  return deepSeek;
}

function parseAgentJson<T>(content: string | null | undefined, schema: z.ZodType<T>) {
  if (!content) {
    throw new AiOutputError("AI returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AiOutputError("AI returned invalid JSON.");
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AiOutputError(result.error.message);
  }

  return result.data;
}

export async function callJsonAgent<T>({
  system,
  user,
  schema,
  temperature = 0.4,
}: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  temperature?: number;
}) {
  const client = getDeepSeekClient();
  const startedAt = Date.now();
  const model = process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL;

  let response = await client.chat.completions.create({
    model,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = response.choices[0]?.message?.content;
  try {
    const data = parseAgentJson(content, schema);
    return {
      data,
      meta: {
        model: response.model,
        latencyMs: Date.now() - startedAt,
        tokensInput: response.usage?.prompt_tokens ?? null,
        tokensOutput: response.usage?.completion_tokens ?? null,
      },
    };
  } catch (error) {
    if (!(error instanceof AiOutputError)) {
      throw error;
    }

    response = await client.chat.completions.create({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${system} Return only the corrected JSON object. No markdown, no commentary.` },
        {
          role: "user",
          content: JSON.stringify({
            originalRequest: user,
            validationError: error.message,
            previousJson: content?.slice(0, 6000) ?? null,
            instruction:
              "Fix the JSON so every field and nested item matches the required contract from the system prompt.",
          }),
        },
      ],
    });
  }

  return {
    data: parseAgentJson(response.choices[0]?.message?.content, schema),
    meta: {
      model: response.model,
      latencyMs: Date.now() - startedAt,
      tokensInput: response.usage?.prompt_tokens ?? null,
      tokensOutput: response.usage?.completion_tokens ?? null,
    },
  };
}
