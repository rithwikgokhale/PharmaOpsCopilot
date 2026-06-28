/**
 * Optional OpenAI integration. The app is designed to run WITHOUT a key — the
 * orchestrator falls back to a deterministic, evidence-grounded response. When
 * OPENAI_API_KEY is present, the model enriches the narrative prose while
 * citations remain deterministic (built from the evidence packet, not the LLM).
 *
 * The key is only ever read here, server-side. It is never sent to the browser.
 */

import OpenAI from "openai";

export function isLlmEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getModelName(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export interface LlmNarrative {
  answer: string;
  whatHappened: string[];
  contributingFactors: { factor: string; confidence: "low" | "medium" | "high"; evidenceIds: string[] }[];
  whatToCheckNext: string[];
}

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
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as Partial<LlmNarrative>;
    return {
      answer: typeof parsed.answer === "string" ? parsed.answer : "",
      whatHappened: Array.isArray(parsed.whatHappened) ? parsed.whatHappened.map(String) : [],
      contributingFactors: Array.isArray(parsed.contributingFactors)
        ? parsed.contributingFactors.map((f) => ({
            factor: String(f.factor ?? ""),
            confidence: (["low", "medium", "high"].includes(String(f.confidence)) ? f.confidence : "low") as "low" | "medium" | "high",
            evidenceIds: Array.isArray(f.evidenceIds) ? f.evidenceIds.map(String) : [],
          }))
        : [],
      whatToCheckNext: Array.isArray(parsed.whatToCheckNext) ? parsed.whatToCheckNext.map(String) : [],
    };
  } catch (err) {
    console.error("[llm] generateNarrative failed, falling back to deterministic:", err);
    return null;
  }
}
