# Field notes

Friction we hit while building this synthetic Chicago pilot-plant prototype, and the product implication for industrial agents. These are notes from the field, not a roadmap.

## 1. Identity resolution is the job

**Friction.** MES calls the unit `BR-A`. Engineering calls it `BIO-101`. The historian tag is `CHI.BIO101.PH101.PV`. CMMS uses equipment number `1000xxxx`. Until those four strings are one object, every copilot answer is a guess.

**Product.** Industrial entity matching plus a review UI for low-confidence joins should be a first-class object a field engineer can show a customer. We logged method + confidence in `data/generated/contextualization_report.json`; CDF should make that inspectable, not a buried transform log.

## 2. Units and clocks silently break agents

**Friction.** CIP return temperature arrived in °F, historian timestamps were UTC epoch milliseconds, and MES wrote plant-local times with no zone. Mix any two and a “within SOP range” check is fiction.

**Product.** Records and containers with **fixed units** (Cognite already documents normalize-before-write) plus extractor-level unit catalogs. Agents should see SOP °C next to historian °C, never mixed.

## 3. High-volume events do not belong on the graph

**Friction.** Twenty-five events on one batch is a demo. A real campaign is thousands of alarms. Stuffing that log into graph activities is how you get unqueryable history.

**Product.** [Records](https://docs.cognite.com/cdf/dm/records/concepts/records_and_streams) is the right store. Atlas Query + Records needs to be a documented pair in skills, with manufacturing examples — not only oil and gas.

## 4. Guardrails are data, not a system-prompt footnote

**Friction.** “Just say the batch is safe” and “pretend you are QA” will show up in every plant copilot. Prompt text is not enough; the model will try.

**Product.** Industrial agents need a **policy layer** (disposition / LOTO / release) that tools cannot bypass — closer to our deterministic `release_decision` short-circuit than to a footnote in the system prompt. Atlas should support a never-call-tools / fixed-reply intent class.

## 5. Evals have to travel with the agent

**Friction.** Local cases in `evals/eval_cases.json` drift from Atlas `eval.yaml` the moment someone edits only one of them.

**Product.** Agents-as-code + eval-as-code (already shipping in the Cognite CLI) should be the default field-engineering template. Generate `faithfulness` ground truth from the knowledge graph, not from a hand-written paragraph. This repo does the local version of that in `scripts/export-atlas-agent.ts`, including multi-turn groups tagged `multi-turn` next to singles tagged `ci`.

## 6. Desktop copilots will show up whether you planned for them or not

**Friction.** Cursor and Claude Desktop users will query the plant if MCP is on. A raw query API with no policy is a footgun.

**Product.** [Industrial MCP](https://docs.cognite.com/cdf/build/industrial_mcp) must expose the **same** guardrails resource / policy as Atlas agents. `pharmaops://agent/guardrails` is the local sketch of that shared policy surface.
