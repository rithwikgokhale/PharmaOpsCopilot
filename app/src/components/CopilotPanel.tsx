import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { askCopilot, getHealth } from "../agent/agentClient";
import { useCopilotBus } from "../context/CopilotContext";
import { DEMO_PROMPTS, type CopilotResponse } from "../types/agent";
import { CopilotResponseView } from "./CopilotResponseView";

interface Props {
  batchId: string;
  compact?: boolean;
}

interface Turn {
  id: string;
  question: string;
  response?: CopilotResponse;
  error?: string;
  loading: boolean;
}

const THINKING_STEPS = [
  "Gathering events & anomalies…",
  "Pulling time-series stats & work orders…",
  "Retrieving SOP sections…",
  "Assembling evidence packet…",
  "Reasoning over evidence…",
];

function ThinkingIndicator() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, THINKING_STEPS.length - 1)), 650);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <Loader2 size={14} className="animate-spin" />
      <motion.span key={step} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}>
        {THINKING_STEPS[step]}
      </motion.span>
    </div>
  );
}

export function CopilotPanel({ batchId, compact = false }: Props) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [llmLabel, setLlmLabel] = useState<string>("deterministic mode");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pending } = useCopilotBus();
  const lastNonce = useRef<number>(0);

  useEffect(() => {
    getHealth()
      .then((h) => {
        setLlmEnabled(h.llm.enabled);
        setLlmLabel(h.llm.enabled ? `OpenAI · ${h.llm.model}` : "deterministic mode (no API key)");
      })
      .catch(() => setLlmLabel("deterministic mode"));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  // Listen for questions pushed from charts/timeline via the copilot bus.
  useEffect(() => {
    if (pending && pending.nonce !== lastNonce.current) {
      lastNonce.current = pending.nonce;
      void submit(pending.question);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  async function submit(question: string) {
    const q = question.trim();
    if (!q) return;
    setInput("");
    // Key each turn by a unique id (not array index) so concurrent submits
    // can't mis-associate responses.
    const turnId = crypto.randomUUID();
    setTurns((prev) => [...prev, { id: turnId, question: q, loading: true }]);
    try {
      const response = await askCopilot({ batchId, question: q });
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, response, loading: false } : t)));
    } catch (e) {
      const error = e instanceof Error ? e.message : "Request failed";
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, error, loading: false } : t)));
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-brand-800">
      <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-brand-50 to-transparent px-3 py-2 dark:border-slate-700 dark:from-brand-700/40">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white dark:bg-accent-700">
            <Bot size={15} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">PharmaOps Copilot</h3>
            <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              {llmEnabled && <Sparkles size={10} />}
              Deviation triage · {llmLabel}
            </p>
          </div>
        </div>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={() => setTurns([])}
            className="text-xs text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className={`scroll-thin flex-1 space-y-3 overflow-y-auto p-3 ${compact ? "max-h-[440px]" : ""}`}
      >
        {turns.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500 dark:border-slate-600 dark:bg-brand-900/40 dark:text-slate-400">
            Ask about Batch {batchId}. The copilot answers from a deterministic evidence
            packet (events, anomalies, work orders, notes, SOPs) with human-review
            guardrails — it will not make release or safety decisions.
          </div>
        )}

        {turns.map((turn) => (
          <div key={turn.id} className="space-y-2">
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-1.5 text-sm text-white shadow-sm dark:bg-accent-700"
            >
              {turn.question}
            </motion.div>
            {turn.loading && <ThinkingIndicator />}
            {turn.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                {turn.error}
              </div>
            )}
            {turn.response && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-brand-900/40"
              >
                <CopilotResponseView resp={turn.response} />
              </motion.div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-2 dark:border-slate-700">
        <div className="mb-2 flex flex-wrap gap-1">
          {DEMO_PROMPTS.slice(0, compact ? 4 : DEMO_PROMPTS.length).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => submit(p.question)}
              className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-600 transition-all hover:-translate-y-0.5 hover:border-accent-500 hover:text-accent-700 dark:border-slate-600 dark:bg-brand-700 dark:text-slate-300 dark:hover:border-accent-400 dark:hover:text-accent-300"
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
            aria-label={`Ask the copilot about Batch ${batchId}`}
            placeholder={`Ask about Batch ${batchId}…`}
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-400/40 dark:border-slate-600 dark:bg-brand-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-accent-700 dark:hover:bg-accent-600"
          >
            <Send size={14} />
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
