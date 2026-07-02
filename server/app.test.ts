/**
 * Integration tests for the Express API. Uses the real data layer (committed
 * synthetic JSON) and the real orchestrator in deterministic mode — no OpenAI
 * key is required.
 */

import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";

const app = createApp();

describe("GET /api/health", () => {
  it("reports service status and data readiness", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.dataReady).toBe(true);
    expect(res.body.llm).toHaveProperty("enabled");
  });
});

describe("POST /api/copilot/chat", () => {
  it("returns a structured copilot response for a valid request", async () => {
    const res = await request(app)
      .post("/api/copilot/chat")
      .send({ batchId: "B-104", question: "Why was Batch B-104 delayed?" });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBeTruthy();
    expect(res.body.intent).toBe("deviation_triage");
    expect(Array.isArray(res.body.evidence)).toBe(true);
    expect(res.body.evidence.length).toBeGreaterThan(0);
    expect(res.body.humanReviewDisclaimer).toBeTruthy();
  });

  it("rejects a request with missing fields", async () => {
    const res = await request(app).post("/api/copilot/chat").send({ batchId: "B-104" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("question");
  });

  it("rejects an over-long question", async () => {
    const res = await request(app)
      .post("/api/copilot/chat")
      .send({ batchId: "B-104", question: "x".repeat(5000) });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("question");
  });

  it("rejects a malformed batchId", async () => {
    const res = await request(app)
      .post("/api/copilot/chat")
      .send({ batchId: "B-104; DROP TABLE", question: "Why delayed?" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("batchId");
  });

  it("answers gracefully for an unknown but well-formed batch", async () => {
    const res = await request(app)
      .post("/api/copilot/chat")
      .send({ batchId: "B-999", question: "Why was this batch delayed?" });
    expect(res.status).toBe(200);
    expect(res.body.answer).toContain("No data found");
    expect(res.body.evidence).toHaveLength(0);
  });
});

describe("GET /api/batch/:batchId/evidence", () => {
  it("returns the evidence packet for a known batch", async () => {
    const res = await request(app).get("/api/batch/B-104/evidence");
    expect(res.status).toBe(200);
    expect(res.body.batch.id).toBe("B-104");
    expect(res.body.evidence.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.dataQuality)).toBe(true);
  });

  it("returns 404 for an unknown batch", async () => {
    const res = await request(app).get("/api/batch/B-999/evidence");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Batch not found");
  });
});

describe("POST /api/eval/run", () => {
  it("runs the full eval suite and reports all passing", async () => {
    const res = await request(app).post("/api/eval/run");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(18);
    expect(res.body.failed).toBe(0);
  }, 30_000);
});
