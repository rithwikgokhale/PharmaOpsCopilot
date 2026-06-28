import { useEffect, useRef, useState } from "react";
import { askCopilot, getHealth } from "../agent/agentClient";
import { DEMO_PROMPTS, type CopilotResponse } from "../types/agent";
import { CopilotResponseView } from "./CopilotResponseView";

interface Props {
  batchId: string;
  compact?: boolean;
}

interface Turn {
  question: string;
  response?: CopilotResponse;
  error?: string;
  loading: boolean;
}

export function CopilotPanel({ batchId, compact = false }: Props) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [llmLabel, setLlmLabel] = useState<string>("deterministic mode");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getHealth()
      .then((h) =>
        setLlmLabel(h.llm.enabled ? `OpenAI · ${h.llm.model}` : "deterministic mode (no API key)")
      )
      .catch(() => setLlmLabel("deterministic mode"));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function submit(question: string) {
    const q = question.trim();
    if (!q) return;
    setInput("");
    const idx = turns.length;
    setTurns((prev) => [...prev, { question: q, loading: true }]);
    try {
      const response = await askCopilot({ batchId, question: q });
      setTurns((prev) => prev.map((t, i) => (i === idx ? { ...t, response, loading: false } : t)));
    } catch (e) {
      const error = e instanceof Error ? e.message : "Request failed";
      setTurns((prev) => prev.map((t, i) => (i === idx ? { ...t, error, loading: false } : t)));
    }
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">PharmaOps Copilot</h3>
          <p className="text-[11px] text-slate-500">Deviation triage · {llmLabel}</p>
        </div>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={() => setTurns([])}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      <div ref={scrollRef} className={`flex-1 space-y-3 overflow-y-auto p-3 ${compact ? "max-h-[420px]" : ""}`}>
        {turns.length === 0 && (
          <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
            Ask about Batch {batchId}. The copilot answers from a deterministic evidence
            packet (events, anomalies, work orders, notes, SOPs) with human-review
            guardrails — it will not make release or safety decisions.
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={i} className="space-y-2">
            <div className="ml-auto w-fit max-w-[90%] rounded-lg bg-brand-500 px-3 py-1.5 text-sm text-white">
              {turn.question}
            </div>
            {turn.loading && (
              <div className="text-sm text-slate-500">Assembling evidence packet…</div>
            )}
            {turn.error && (
              <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {turn.error}
              </div>
            )}
            {turn.response && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <CopilotResponseView resp={turn.response} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-2">
        <div className="mb-2 flex flex-wrap gap-1">
          {DEMO_PROMPTS.slice(0, compact ? 4 : DEMO_PROMPTS.length).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => submit(p.question)}
              className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:border-brand-400 hover:text-brand-600"
            >
              {p.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about Batch ${batchId}…`}
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
