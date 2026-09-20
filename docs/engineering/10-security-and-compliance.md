# Security and compliance

Who should read this: anyone reviewing keys, prompt injection, or the GxP posture of this prototype.

This is **not** a validated GxP application. Nothing here is an audit-ready control environment.

## Secrets

- API keys are read only in `server/agent/llm.ts` (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`).
- `.env` is gitignored. `.env.example` has placeholders.
- `mcp.json.example` may list empty key env slots for the MCP process; never commit filled values. Cursor/Claude configs live outside git.
- Generated Atlas YAML contains instructions and eval text, **not** keys. Agent `model` is a name (`azure/gpt-4.1`), not a credential.
- The browser never receives keys. `GET /api/health` reports `{ enabled, provider, model }` without the secret.
- GitHub Actions does not set LLM keys; evals are deterministic.

## HTTP surface

`chatRequestSchema` (`server/app.ts`): `batchId` max 32, `[A-Za-z0-9-]+`; `question` max 2000. JSON body limit 64kb. Unknown batch does not leak other batches' packets. CORS is enabled for local Vite — not a production policy.

There is **no authentication** on Express. Anyone who can reach :3001 can chat and run evals. That is acceptable for a laptop demo and unacceptable for a plant network.

## Prompt injection

Mitigations in [03-agent-design.md](./03-agent-design.md):

1. Instruction hierarchy in `buildSystemPrompt`: user question and packet are data.
2. Explicit `user_question` and `evidence_packet` delimiters around untrusted text.
3. `classifyIntent` treats jailbreak/role-play release language as `release_decision` (no LLM).
4. `validIds` filter + `groundToPacket` so the model cannot invent `EVT-…` / `DEV-…`.
5. `sanitizeText` banned phrases regardless of source.
6. Eval cases EVAL-13…17.

These are defenses in depth for a prototype, not a red-team certified boundary. Document excerpts in the packet could still steer *tone*; they must not steer *disposition*.

## GxP posture

Always-on product rules:

- No batch release, QA disposition, safety, or regulatory decision.
- `HUMAN_REVIEW_DISCLAIMER` on every copilot response (and Atlas `ALWAYS END WITH`).
- README, About, site footer, and this folder repeat: synthetic data; not validated.
- Amber warning styling for the disclaimer in the UI (`amber-50` / `amber-900`).

The copilot is an evidence-summary aid for a human reviewer.

## Data provenance

- All plant data is **synthetic**, generated with `random.seed(42)`.
- No real batch records, no real patient or operator PII, no customer tenant exports.
- Source silos are labeled in `contextualization_report.json` (`sourceSystem` on events; Cognite analogue is `CogniteSourceSystem`).
- Unresolved orphans stay unresolved so the graph does not invent equipment.

## What a validated deployment would need (future work, not claims)

A real GxP-adjacent deployment on CDF would still be a **human-reviewed** aid unless separately validated. Typical gaps from this repo:

- Authentication and authorization (CDF groups / capabilities; Flows app inherits user permissions — [Atlas tools note](https://docs.cognite.com/cdf/atlas_ai/guides/atlas_ai_agent_building)).
- Audit trail of questions, tool calls, and answers (Atlas tracing is a starting point, not 21 CFR Part 11).
- Change control on agent YAML, skills, and eval gates as quality records.
- Qualified time sync, unit of measure, and identity management for IT/OT sources.
- Part 11 considerations if records are used as GxP electronic records: unique users, timestamped audit, operational system checks — **not implemented here**.
- Network controls: no open CORS, no unauthenticated MCP on a plant LAN; use Industrial MCP with project auth ([Industrial MCP](https://docs.cognite.com/cdf/build/industrial_mcp)).

Do not describe this prototype as Part 11 compliant, 21 CFR ready, or GxP validated.
