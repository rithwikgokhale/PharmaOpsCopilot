import "dotenv/config";
import cors from "cors";
import express from "express";
import { runCopilot } from "./agent/orchestrator";
import { buildEvidencePacket } from "./agent/evidenceBuilder";
import { isLlmEnabled, getModelName } from "./agent/llm";
import { runEvals } from "./agent/evalRunner";
import type { CopilotRequest } from "../app/src/types/agent";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "pharmaops-copilot-api",
    llm: isLlmEnabled() ? { enabled: true, model: getModelName() } : { enabled: false },
  });
});

app.post("/api/copilot/chat", async (req, res) => {
  const { batchId, question } = req.body as Partial<CopilotRequest>;
  if (!batchId || !question) {
    return res.status(400).json({ error: "batchId and question are required" });
  }
  try {
    const response = await runCopilot({ batchId, question });
    res.json(response);
  } catch (err) {
    console.error("[copilot] error:", err);
    res.status(500).json({ error: "Copilot failed to generate a response." });
  }
});

app.get("/api/batch/:batchId/evidence", (req, res) => {
  const packet = buildEvidencePacket(req.params.batchId, "");
  if (!packet) return res.status(404).json({ error: "Batch not found" });
  res.json(packet);
});

app.post("/api/eval/run", async (_req, res) => {
  try {
    const results = await runEvals();
    res.json(results);
  } catch (err) {
    console.error("[eval] error:", err);
    res.status(500).json({ error: "Eval run failed." });
  }
});

app.listen(PORT, () => {
  console.log(`PharmaOps API listening on http://localhost:${PORT}`);
  console.log(`  LLM: ${isLlmEnabled() ? `enabled (${getModelName()})` : "disabled — deterministic mode"}`);
});
