/**
 * Optional multi-provider narrative layer (OpenAI, Anthropic, Gemini).
 * The app runs WITHOUT a key — the orchestrator falls back to a deterministic,
 * evidence-grounded response. When a provider key is present, the model
 * enriches narrative prose while citations remain deterministic.
 *
 * Keys are only ever read here, server-side. They are never sent to the browser.
 */

import OpenAI from "openai";
import { z } from "zod";

export type LlmProviderId = "openai" | "anthropic" | "gemini";

const PROVIDERS: LlmProviderId[] = ["openai", "anthropic", "gemini"];
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 1;

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function keyFor(provider: LlmProviderId): string {
  switch (provider) {
    case "openai":
      return env("OPENAI_API_KEY");
    case "anthropic":
      return env("ANTHROPIC_API_KEY");
    case "gemini":
      return env("GEMINI_API_KEY");
  }
}

/** Selected provider if it has a key; otherwise null (deterministic mode). */
export function getLlmProvider(): LlmProviderId | null {
  const forced = env("LLM_PROVIDER").toLowerCase();
  if (forced) {
    if (!PROVIDERS.includes(forced as LlmProviderId)) return null;
    const provider = forced as LlmProviderId;
    return keyFor(provider) ? provider : null;
  }
  for (const provider of PROVIDERS) {
    if (keyFor(provider)) return provider;
  }
  return null;
}

export function isLlmEnabled(): boolean {
  return getLlmProvider() !== null;
}

/** Health/log payload: provider + model when a key is present, else disabled. */
export function describeLlm():
  | { enabled: false }
  | { enabled: true; provider: LlmProviderId; model: string } {
  const provider = getLlmProvider();
  if (!provider) return { enabled: false };
  return { enabled: true, provider, model: getModelName() };
}

export function getModelName(): string {
  const provider = getLlmProvider();
  switch (provider) {
    case "anthropic":
      return env("ANTHROPIC_MODEL") || "claude-sonnet-4-5";
    case "gemini":
      return env("GEMINI_MODEL") || "gemini-2.5-flash";
    case "openai":
    default:
      return env("OPENAI_MODEL") || "gpt-4.1-mini";
  }
}

let openaiClient: OpenAI | null = null;

function getOpenAiClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env("OPENAI_API_KEY"),
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
    });
  }
  return openaiClient;
}

/**
 * Schema for the model's JSON output. Lenient by design: wrong-typed fields
 * collapse to safe defaults rather than rejecting the whole narrative, and
 * anything irrecoverable falls back to the deterministic response.
 */
const llmNarrativeSchema = z.object({
  answer: z.string().catch(""),
  whatHappened: z.array(z.coerce.string()).catch([]),
  contributingFactors: z
    .array(
      z.object({
        factor: z.coerce.string().catch(""),
        confidence: z.enum(["low", "medium", "high"]).catch("low"),
        evidenceIds: z.array(z.coerce.string()).catch([]),
      })
    )
    .catch([]),
  whatToCheckNext: z.array(z.coerce.string()).catch([]),
});

export type LlmNarrative = z.infer<typeof llmNarrativeSchema>;

export function parseNarrative(text: string): LlmNarrative | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  try {
    const validated = llmNarrativeSchema.safeParse(JSON.parse(candidate));
    if (!validated.success) return null;
    return validated.data;
  } catch {
    return null;
  }
}

/**
 * Asks the model to produce ONLY narrative fields, grounded in the supplied
 * evidence text. Returns null on any error so the caller can fall back.
 */
export async function generateNarrative(
  systemPrompt: string,
  userPrompt: string
): Promise<LlmNarrative | null> {
  const provider = getLlmProvider();
  if (!provider) return null;
  try {
    switch (provider) {
      case "openai":
        return await fromOpenAi(systemPrompt, userPrompt);
      case "anthropic":
        return await fromAnthropic(systemPrompt, userPrompt);
      case "gemini":
        return await fromGemini(systemPrompt, userPrompt);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = /timeout|timed out|abort/i.test(msg);
    console.error(
      `[llm] generateNarrative failed${isTimeout ? " (timeout)" : ""}, falling back to deterministic:`,
      msg
    );
    return null;
  }
}

async function fromOpenAi(systemPrompt: string, userPrompt: string): Promise<LlmNarrative | null> {
  const completion = await getOpenAiClient().chat.completions.create({
    model: getModelName(),
    temperature: 0.2,
    max_tokens: 900,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) return null;
  const parsed = parseNarrative(content);
  if (!parsed) {
    console.error("[llm] response failed schema validation, falling back to deterministic");
    return null;
  }
  return parsed;
}

const JSON_ONLY = "\n\nRespond with a single JSON object only. No markdown fences.";

async function fromAnthropic(systemPrompt: string, userPrompt: string): Promise<LlmNarrative | null> {
  const body = {
    model: getModelName(),
    max_tokens: 900,
    temperature: 0.2,
    system: systemPrompt + JSON_ONLY,
    messages: [{ role: "user", content: userPrompt }],
  };
  const data = await fetchJson(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": keyFor("anthropic"),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    }
  );
  const text = (data as { content?: Array<{ type?: string; text?: string }> }).content
    ?.filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n");
  if (!text) return null;
  return parseNarrative(text);
}

async function fromGemini(systemPrompt: string, userPrompt: string): Promise<LlmNarrative | null> {
  const model = getModelName();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(keyFor("gemini"))}`;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt + JSON_ONLY }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 900,
      responseMimeType: "application/json",
    },
  };
  const data = await fetchJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const parts = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    .candidates?.[0]?.content?.parts;
  const text = parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) return null;
  return parseNarrative(text);
}

async function fetchJson(url: string, init: RequestInit, attempt = 0): Promise<unknown> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (res.ok) return res.json();
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  } catch (err) {
    if (attempt < MAX_RETRIES) return fetchJson(url, init, attempt + 1);
    throw err;
  }
}
