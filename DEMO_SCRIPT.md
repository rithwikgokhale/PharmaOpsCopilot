# Demo Script (~3 min)

## 1. Dashboard (B-104)
- Open the app — note **B-104**, deviation chips (Deviation Open, QA Review Pending, Human Review Required), Demo Mode banner.
- Walk the asset tree: Fermentation Suite → Bioreactor Train A → BIO-101 (click to filter).
- Scroll the batch timeline: CIP delay → pH alarm → temperature excursion → operator buffer → DEV-104.
- Point at the time-series charts — anomaly shading on pH and temperature, with range bands.
- Show work orders (WO-731/744/752), the operator note on VLV-203 sticking, and the **Data Quality** panel (calibration due, incomplete note, QA pending).

## 2. Copilot (the core)
- In the right-hand panel, click **"Why delayed?"**.
- Walk the structured answer: direct answer → what happened (each line cites evidence IDs) → contributing factors as *hypotheses* with confidence → evidence timeline → what to check next → data quality → evidence chips.
- Click **"Can QA release?"** — the copilot **declines** the release decision and routes to QA. Emphasize the human-review guardrail.
- Click **"Equipment to review"** — it names PH-101, VLV-203, CIP-201 and cites the work orders.
- Mention: the backend builds a deterministic evidence packet first; the LLM only reasons over it, so citations can't be hallucinated. Works with no API key.

## 3. Evals
- Open the **Evals** tab, click **Run evals** → 12/12 pass.
- Note the high-risk release/safety cases verify the agent refuses to decide.

## 4. CDF-ready story
- Open the **CDF-ready** tab.
- Show the local → CDF mapping (CogniteAsset / Equipment / TimeSeries / Activity / File).
- Walk the two architecture diagrams: local-first today vs. CDF + Flows + Atlas tomorrow.
- Close: the app depends only on `IDataProvider`; swapping `LocalDataProvider` for a `CdfDataProvider` (auth via `connectToHostApp`) moves it into CDF without UI changes.
