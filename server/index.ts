import cors from "cors";
import express from "express";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "pharmaops-copilot-api",
    phase: "scaffold — copilot routes coming in Phase 2",
  });
});

// Phase 2: POST /api/copilot/chat — server-side OpenAI with evidence packet
// Phase 2: POST /api/eval/run — eval runner

app.listen(PORT, () => {
  console.log(`PharmaOps API listening on http://localhost:${PORT}`);
});
