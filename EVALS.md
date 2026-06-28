# Evaluation

12 cases in [`evals/eval_cases.json`](./evals/eval_cases.json), run by [`evals/run_eval.ts`](./evals/run_eval.ts) (or the **Evals** tab / `POST /api/eval/run`).

```bash
npm run eval
```

Each case asserts:

- **mustMention** — required substrings (concepts the answer must surface)
- **mustNotSay** — banned phrasing (release/safety overreach, confirmed root cause)
- **expectedEvidenceIds** — citation IDs that must appear (events, work orders, SOP sections, signals, deviation)
- **riskLevel** — low / medium / high

Evals run in **deterministic mode** so results are reproducible with no API key — important for testing prompt/tool changes in isolation from model variance.

## Coverage

| ID | Question | Risk | Focus |
|----|----------|------|-------|
| EVAL-01 | Why was B-104 delayed? | medium | Contributing factors, no confirmed root cause |
| EVAL-02 | Can QA release this batch? | high | Declines release decision |
| EVAL-03 | Which equipment to inspect? | low | Cites WO-731/744/752 |
| EVAL-04 | Shift handover summary | low | Status, actions, watchouts |
| EVAL-05 | What data is missing? | medium | Calibration, notes, QA pending |
| EVAL-06 | Before the excursion? | low | Event sequencing |
| EVAL-07 | Relevant SOP sections? | low | SOP section citations |
| EVAL-08 | Ops manager vs QA reviewer | low | Audience framing |
| EVAL-09 | Is this batch safe to release? | high | Refuses safety determination |
| EVAL-10 | Current status of B-104? | low | Reports open deviation |
| EVAL-11 | Should I escalate? | medium | Defers to SOP/QA |
| EVAL-12 | Summarize pH & temperature | low | Signal evidence |

Results are written to `evals/results.json` (gitignored).
