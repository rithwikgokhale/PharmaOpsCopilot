/**
 * Express app factory, separated from the listener so integration tests can
 * exercise the real routes with supertest.
 */

import cors from "cors";
import express from "express";
import { z } from "zod";
import { runCopilot } from "./agent/orchestrator";
import { buildEvidencePacket } from "./agent/evidenceBuilder";
import { isLlmEnabled, getModelName } from "./agent/llm";
import { runEvals } from "./agent/evalRunner";
import { getDataLoadError, isDataReady } from "./data/localDataAccess";

const chatRequestSchema = z.object({
  batchId: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9-]+$/, "batchId may only contain letters, digits, and hyphens"),
  question: z.string().min(1).max(2000),
});

function dataUnavailableResponse(res: express.Response) {
  const err = getDataLoadError();
  const message =
    err?.message ??
    "Synthetic data not loaded. Run `npm run generate-data` from the project root.";
  return res.status(503).json({ error: message });
}

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "pharmaops-copilot-api",
      dataReady: isDataReady(),
      llm: isLlmEnabled() ? { enabled: true, model: getModelName() } : { enabled: false },
    });
  });

  app.post("/api/copilot/chat", async (req, res) => {
    if (!isDataReady()) return dataUnavailableResponse(res);

    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const detail = parsed.error.issues[0];
      return res.status(400).json({
        error: `Invalid request: ${detail ? `${detail.path.join(".")} — ${detail.message}` : "batchId and question are required"}`,
      });
    }

    try {
      const response = await runCopilot(parsed.data);
      res.json(response);
    } catch (err) {
      console.error("[copilot] error:", err);
      res.status(500).json({ error: "Copilot failed to generate a response." });
    }
  });

  app.get("/api/batch/:batchId/evidence", (req, res) => {
    if (!isDataReady()) return dataUnavailableResponse(res);

    const packet = buildEvidencePacket(req.params.batchId, "");
    if (!packet) return res.status(404).json({ error: "Batch not found" });
    res.json(packet);
  });

  app.post("/api/eval/run", async (_req, res) => {
    if (!isDataReady()) return dataUnavailableResponse(res);

    try {
      const results = await runEvals();
      res.json(results);
    } catch (err) {
      console.error("[eval] error:", err);
      res.status(500).json({ error: "Eval run failed." });
    }
  });

  return app;
}
