/**
 * PharmaOps MCP server.
 *
 * Exposes the copilot's deterministic evidence tools over the Model Context
 * Protocol so any MCP-capable agent (Claude Desktop, Cursor, Copilot, …) can
 * triage a batch deviation against the same governed tools and guardrails the
 * in-app copilot uses.
 *
 * This deliberately mirrors the shape of Cognite's Industrial MCP (Public
 * Preview, Sept 2026): a small set of query / time-series / document tools that
 * expose contextualized industrial data to external agents. Today the tools read
 * synthetic local JSON; against a real CDF project the natural next step is to
 * point the external agent at Industrial MCP instead and retire this server —
 * the tool vocabulary is kept intentionally close so that swap is a
 * configuration change, not a redesign.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  assessDataQuality,
  detectAnomalies,
  getBatchSummary,
  getDeviation,
  getEvents,
  getOperatorNotes,
  getRelatedEquipment,
  getRelatedWorkOrders,
  getTimeSeriesStats,
} from "../agent/tools";
import { buildEvidencePacket } from "../agent/evidenceBuilder";
import { runCopilot } from "../agent/orchestrator";
import {
  AGENT_IDENTITY,
  HUMAN_REVIEW_DISCLAIMER,
  UNIVERSAL_RULES,
} from "../agent/guardrails";
import { retrieveDocuments } from "../retrieval/simpleRetriever";
import { getData } from "../data/localDataAccess";

export const MCP_SERVER_NAME = "pharmaops-copilot";
export const MCP_SERVER_VERSION = "0.1.0";

const batchIdSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9-]+$/)
  .describe("Batch identifier, e.g. B-104");

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function notFound(batchId: string) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: `No batch found with id ${batchId}. Use list_batches to see available batches.`,
      },
    ],
  };
}

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });

  // ---------------------------------------------------------------------------
  // Resources — static context an agent can read before calling tools.
  // ---------------------------------------------------------------------------

  server.registerResource(
    "agent-guardrails",
    "pharmaops://agent/guardrails",
    {
      title: "PharmaOps agent guardrails",
      description:
        "Identity, universal rules, and the human-review disclaimer that govern every answer. Read this before triaging.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: [
            "# PharmaOps Copilot — guardrails",
            "",
            AGENT_IDENTITY,
            "",
            "## Universal rules",
            ...UNIVERSAL_RULES.map((r) => `- ${r}`),
            "",
            "## Human-review disclaimer",
            HUMAN_REVIEW_DISCLAIMER,
          ].join("\n"),
        },
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // Query tools — mirror Atlas AI / Industrial MCP "query" family.
  // ---------------------------------------------------------------------------

  server.registerTool(
    "list_batches",
    {
      title: "List batches",
      description:
        "List all batches in the plant with status, phase, planned/actual start, and any linked deviation id.",
      inputSchema: {},
    },
    async () => {
      const batches = getData().batches.map((b) => ({
        id: b.id,
        name: b.name,
        status: b.status,
        currentPhase: b.currentPhase,
        plannedStart: b.plannedStart,
        actualStart: b.actualStart ?? null,
        deviationId: b.deviationId ?? null,
      }));
      return json({ batches });
    }
  );

  server.registerTool(
    "get_batch_summary",
    {
      title: "Get batch summary",
      description:
        "Return the batch record plus its deviation (if any) and related equipment for a batch id.",
      inputSchema: { batchId: batchIdSchema },
    },
    async ({ batchId }) => {
      const batch = getBatchSummary(batchId);
      if (!batch) return notFound(batchId);
      return json({
        batch,
        deviation: getDeviation(batchId) ?? null,
        relatedEquipment: getRelatedEquipment(batchId),
      });
    }
  );

  server.registerTool(
    "query_events",
    {
      title: "Query process events",
      description:
        "Time-ordered process events, alarms, operator actions, and quality events for a batch. Optionally restrict to an ISO-8601 time window. Every event has a citable id (EVT-…).",
      inputSchema: {
        batchId: batchIdSchema,
        start: z.string().optional().describe("ISO-8601 lower bound (inclusive)"),
        end: z.string().optional().describe("ISO-8601 upper bound (inclusive)"),
      },
    },
    async ({ batchId, start, end }) => {
      if (!getBatchSummary(batchId)) return notFound(batchId);
      const window = start && end ? { start, end } : undefined;
      return json({ events: getEvents(batchId, window) });
    }
  );

  server.registerTool(
    "get_anomaly_windows",
    {
      title: "Get anomaly windows",
      description:
        "Detected anomaly windows (signal id, start, end, label, severity) for a batch. Ids are citable (ANOM-…).",
      inputSchema: { batchId: batchIdSchema },
    },
    async ({ batchId }) => {
      if (!getBatchSummary(batchId)) return notFound(batchId);
      return json({ anomalies: detectAnomalies(batchId) });
    }
  );

  server.registerTool(
    "get_work_orders",
    {
      title: "Get related work orders",
      description:
        "Maintenance work orders on equipment related to the batch (primary equipment, deviation equipment, and CIP support equipment). Ids are citable (WO-…).",
      inputSchema: { batchId: batchIdSchema },
    },
    async ({ batchId }) => {
      if (!getBatchSummary(batchId)) return notFound(batchId);
      return json({ workOrders: getRelatedWorkOrders(batchId) });
    }
  );

  server.registerTool(
    "get_operator_notes",
    {
      title: "Get operator notes",
      description:
        "Operator shift notes for a batch with a completeness flag (complete/partial). Ids are citable (NOTE-…).",
      inputSchema: { batchId: batchIdSchema },
    },
    async ({ batchId }) => {
      if (!getBatchSummary(batchId)) return notFound(batchId);
      return json({ operatorNotes: getOperatorNotes(batchId) });
    }
  );

  // ---------------------------------------------------------------------------
  // Time-series tools — mirror queryTimeSeriesDatapoints / analyzeTimeSeries.
  // ---------------------------------------------------------------------------

  server.registerTool(
    "query_time_series_stats",
    {
      title: "Query time-series statistics",
      description:
        "Per-signal statistics for a batch: min, max, mean, target, acceptable range, and count of out-of-spec points. Cite by signal id (SIG-…).",
      inputSchema: {
        batchId: batchIdSchema,
        signalIds: z.array(z.string()).optional().describe("Restrict to these signal ids"),
      },
    },
    async ({ batchId, signalIds }) => {
      if (!getBatchSummary(batchId)) return notFound(batchId);
      return json({ stats: getTimeSeriesStats(batchId, signalIds) });
    }
  );

  server.registerTool(
    "query_time_series_datapoints",
    {
      title: "Query time-series datapoints",
      description:
        "Raw datapoints for one signal during a batch, downsampled to at most maxPoints (default 120). Use query_time_series_stats first to find signal ids.",
      inputSchema: {
        batchId: batchIdSchema,
        signalId: z.string().describe("Signal id, e.g. SIG-PH-101"),
        maxPoints: z.number().int().min(10).max(2000).optional(),
      },
    },
    async ({ batchId, signalId, maxPoints = 120 }) => {
      if (!getBatchSummary(batchId)) return notFound(batchId);
      const series = getData().timeSeries.find(
        (ts) => ts.batchId === batchId && ts.signalId === signalId
      );
      if (!series) {
        return {
          isError: true,
          content: [
            { type: "text" as const, text: `No datapoints for ${signalId} on ${batchId}.` },
          ],
        };
      }
      const step = Math.max(1, Math.ceil(series.points.length / maxPoints));
      const points = series.points.filter((_, i) => i % step === 0);
      return json({ signalId, batchId, totalPoints: series.points.length, step, points });
    }
  );

  // ---------------------------------------------------------------------------
  // Document tool — mirrors askDocument.
  // ---------------------------------------------------------------------------

  server.registerTool(
    "ask_documents",
    {
      title: "Search SOPs and batch documents",
      description:
        "Keyword retrieval over SOP sections, batch record excerpts, and shift notes. Returns the top matching sections with citable section ids (SOP-…, BMR-…). Optionally scope to a batch.",
      inputSchema: {
        query: z.string().min(1).max(500),
        batchId: batchIdSchema.optional(),
        topK: z.number().int().min(1).max(20).optional(),
      },
    },
    async ({ query, batchId, topK = 5 }) => {
      const equipmentIds = batchId ? getRelatedEquipment(batchId).map((e) => e.id) : [];
      const hits = retrieveDocuments(query, { batchId, equipmentIds, topK }).map((h) => ({
        sectionId: h.section.sectionId,
        documentTitle: h.section.documentTitle,
        title: h.section.title,
        score: h.score,
        content: h.section.content,
      }));
      return json({ query, hits });
    }
  );

  // ---------------------------------------------------------------------------
  // Composite tools — the evidence-first pattern, exposed directly.
  // ---------------------------------------------------------------------------

  server.registerTool(
    "assess_data_quality",
    {
      title: "Assess data quality",
      description:
        "Data-quality flags a reviewer should resolve before trusting the evidence: calibration due, sensor reliability, incomplete notes, QA disposition pending.",
      inputSchema: { batchId: batchIdSchema },
    },
    async ({ batchId }) => {
      if (!getBatchSummary(batchId)) return notFound(batchId);
      return json({ flags: assessDataQuality(batchId) });
    }
  );

  server.registerTool(
    "build_evidence_packet",
    {
      title: "Build evidence packet",
      description:
        "Assemble the full deterministic evidence packet (events, anomalies, stats, work orders, notes, equipment, retrieved documents, data-quality flags, and the list of every citable evidence id) for a batch and question. Reason only over this packet; never invent ids.",
      inputSchema: {
        batchId: batchIdSchema,
        question: z.string().min(1).max(2000),
      },
    },
    async ({ batchId, question }) => {
      const packet = buildEvidencePacket(batchId, question);
      if (!packet) return notFound(batchId);
      return json(packet);
    }
  );

  server.registerTool(
    "triage_batch",
    {
      title: "Triage a batch deviation",
      description:
        "Run the guardrailed PharmaOps copilot end-to-end. Returns a structured triage response (answer, what happened, contributing-factor hypotheses, next checks, evidence timeline, data quality, citations). Release / disposition / safety questions are declined and routed to QA by design.",
      inputSchema: {
        batchId: batchIdSchema,
        question: z.string().min(1).max(2000),
      },
    },
    async ({ batchId, question }) => {
      const response = await runCopilot({ batchId, question });
      return json(response);
    }
  );

  return server;
}
