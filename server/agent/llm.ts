/**
 * Optional OpenAI integration. The app is designed to run WITHOUT a key — the
 * orchestrator falls back to a deterministic, evidence-grounded response. When
 * OPENAI_API_KEY is present, the model enriches the narrative prose while
 * citations remain deterministic (built from the evidence packet, not the LLM).
 *
 * The key is only ever read here, server-side. It is never sent to the browser.
 */

import OpenAI from "openai";
import { z } from "zod";

export function isLlmEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getModelName(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 20_000,
      maxRetries: 1,
    });
  }
  return client;
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

/**
 * Asks the model to produce ONLY narrative fields, grounded in the supplied
 * evidence text. Returns null on any error so the caller can fall back.
 */
export async function generateNarrative(
  systemPrompt: string,
  userPrompt: string
): Promise<LlmNarrative | null> {
  if (!isLlmEnabled()) return null;
  try {
    const completion = await getClient().chat.completions.create({
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
    const validated = llmNarrativeSchema.safeParse(JSON.parse(content));
    if (!validated.success) {
      console.error("[llm] response failed schema validation, falling back to deterministic");
      return null;
    }
    return validated.data;
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
